require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const logger = require('./utils/logger');
const { AppError, handleError } = require('./utils/errorHandler');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "*.supabase.co"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "*.supabase.co"],
            connectSrc: ["'self'", "*.supabase.co", "openrouter.ai"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// API rate limiting
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10 // limit each IP to 10 requests per windowMs
});

// Detailed environment variable logging
logger.info('Environment variables check:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKeyLength: process.env.SUPABASE_KEY?.length,
    nodeEnv: process.env.NODE_ENV,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY
});

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
    logger.error('SUPABASE_URL is not set');
    process.exit(1);
}

if (!process.env.SUPABASE_KEY) {
    logger.error('SUPABASE_KEY is not set');
    process.exit(1);
}

if (!process.env.OPENROUTER_API_KEY) {
    logger.error('OPENROUTER_API_KEY is not set');
    process.exit(1);
}

// Validate Supabase URL format
try {
    new URL(process.env.SUPABASE_URL);
} catch (error) {
    logger.error('Invalid SUPABASE_URL format');
    process.exit(1);
}

// Initialize Supabase client
let supabase;
try {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );
    logger.info('Supabase client initialized successfully');
} catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
    process.exit(1);
}

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: '*'
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    logger.info({
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent')
    }, 'Incoming request');
    next();
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Serve environment variables
app.get('/env-config.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    
    // Ensure URLs are properly formatted
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
    const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
    const supabaseKey = process.env.SUPABASE_KEY?.trim() || '';
    
    // Log environment variables (without sensitive data)
    logger.info('Serving environment variables:', {
        hasServerUrl: !!serverUrl,
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey
    });
    
    res.send(`
        window._env_ = {
            SERVER_URL: '${serverUrl}',
            SUPABASE_URL: '${supabaseUrl}',
            SUPABASE_KEY: '${supabaseKey}'
        };
    `);
});

// Authentication middleware
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        logger.error('Auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// Input sanitization function
const sanitizeInput = (str) => str.replace(/[<>]/g, '').trim();

// Input validation function
const validateInputs = (inputs) => {
    const requiredFields = [
        'academic_grade',
        'subject',
        'subject_specification',
        'setting',
        'main_character',
        'word_count',
        'language'
    ];
    
    // Check if all required fields are present
    for (const field of requiredFields) {
        if (!inputs[field]) {
            return false;
        }
    }
    
    // Validate word_count is a number and within reasonable range
    if (typeof inputs.word_count !== 'number' || inputs.word_count < 100 || inputs.word_count > 5000) {
        return false;
    }
    
    // Validate academic_grade is a valid grade level
    const validGrades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    if (!validGrades.includes(inputs.academic_grade)) {
        return false;
    }
    
    // Validate language is supported
    const supportedLanguages = ['English', 'Spanish', 'French', 'German', 'Italian'];
    if (!supportedLanguages.includes(inputs.language)) {
        return false;
    }
    
    return true;
};

// Validate quiz structure
const validateQuizStructure = (quiz) => {
    if (!quiz || !Array.isArray(quiz.questions)) {
        return false;
    }
    
    return quiz.questions.every(q => {
        return q.question && 
               Array.isArray(q.options) && 
               q.options.length === 4 && 
               typeof q.correctAnswer === 'number' &&
               q.correctAnswer >= 0 && 
               q.correctAnswer < 4;
    });
};

// Generate story endpoint
app.post('/generate-story', apiLimiter, async (req, res) => {
    try {
        const inputs = req.body;
        logger.info('Received story generation request:', {
            subject: inputs.subject,
            academic_grade: inputs.academic_grade,
            word_count: inputs.word_count,
            language: inputs.language
        });

        // Validate inputs
        if (!validateInputs(inputs)) {
            throw new AppError('Invalid input data', 400);
        }

        // Generate story using OpenRouter
        const response = await generateStoryWithOpenRouter(inputs);
        
        // If user is logged in, save to Supabase
        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const { data: { user }, error: authError } = await supabase.auth.getUser(token);
                
                if (user && !authError) {
                    const { data, error: saveError } = await supabase
                        .from('stories')
                        .insert({
                            user_id: user.id,
                            academic_grade: inputs.academic_grade,
                            subject: inputs.subject,
                            subject_specification: inputs.subject_specification,
                            setting: inputs.setting,
                            main_character: inputs.main_character,
                            word_count: parseInt(inputs.word_count),
                            language: inputs.language,
                            story_text: response.content,
                            story_title: inputs.subject_specification || 'Untitled Story',
                            learning_objectives: response.learning_objectives || [],
                            quiz_questions: response.quiz || [],
                            vocabulary_list: response.vocabulary || [],
                            story_summary: response.summary || '',
                            is_continuation: false
                        })
                        .select()
                        .single();

                    if (saveError) {
                        logger.error('Error saving story to Supabase:', saveError);
                        // Don't throw error, just log it since story generation was successful
                    } else {
                        logger.info('Story saved to Supabase:', { storyId: data.id });
                    }
                }
            } catch (error) {
                logger.error('Error handling Supabase save:', error);
                // Don't throw error, just log it since story generation was successful
            }
        }

        res.json(response);
    } catch (error) {
        handleError(error, res);
    }
});

// Get user's stories endpoint
app.get('/user-stories', apiLimiter, authenticateUser, async (req, res) => {
    try {
        const { data: stories, error } = await supabase
            .from('stories')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Supabase query error:', error);
            throw new AppError('Failed to fetch stories', 500, error.message);
        }

        res.json(stories);
    } catch (error) {
        logger.error('Error fetching user stories:', error);
        handleError(error, req, res);
    }
});

// Error handling middleware
app.use(handleError);

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
}); 