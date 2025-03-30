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

// API Routes
app.post('/generate-story', apiLimiter, authenticateUser, async (req, res) => {
    try {
        const {
            academic_grade,
            subject,
            subject_specification,
            setting,
            main_character,
            word_count,
            language,
            generate_vocabulary,
            generate_summary
        } = req.body;
        
        // Validate inputs
        if (!validateInputs(req.body)) {
            throw new AppError('Invalid input data. Please check your inputs and try again.', 400);
        }

        // Sanitize inputs
        const sanitizedInputs = {
            academic_grade: sanitizeInput(academic_grade),
            subject: sanitizeInput(subject),
            subject_specification: sanitizeInput(subject_specification),
            setting: sanitizeInput(setting),
            main_character: sanitizeInput(main_character),
            word_count: parseInt(word_count),
            language: sanitizeInput(language)
        };

        // Log request details
        logger.info('Generating story', {
            ...sanitizedInputs,
            generate_vocabulary,
            generate_summary,
            userId: req.user.id
        });

        // Construct the prompt
        const prompt = `Create an educational story for ${sanitizedInputs.academic_grade} grade students about ${sanitizedInputs.subject_specification} in ${sanitizedInputs.subject}.
        The story should be set in ${sanitizedInputs.setting} and feature ${sanitizedInputs.main_character} as the main character.
        The story should be approximately ${sanitizedInputs.word_count} words long and written in ${sanitizedInputs.language}.
        ${generate_vocabulary ? 'Include a vocabulary list at the end.' : ''}
        ${generate_summary ? 'Include a summary at the beginning.' : ''}
        
        Please provide the response in the following JSON format:
        {
            "story": {
                "title": "Story title",
                "summary": "Brief summary of the story",
                "content": "The full story text with paragraphs separated by newlines",
                "learning_objectives": ["List of learning objectives"],
                "imagePrompt": "A detailed prompt for generating an illustration for this story",
                "audioUrl": null,
                "imageUrl": null
            },
            "quiz": {
                "questions": [
                    {
                        "question": "Question text",
                        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                        "correctAnswer": 0
                    }
                ]
            }
        }`;

        // Generate story and quiz using OpenRouter with timeout
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "google/gemini-pro",
            messages: [
                { role: "system", content: "You are an expert educational storyteller and quiz creator. Always respond with valid JSON." },
                { role: "user", content: prompt }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.SERVER_URL || 'http://localhost:3000',
                'X-Title': 'Quiz Story Generator'
            },
            timeout: 30000 // 30 second timeout
        });

        let storyData;
        try {
            if (!response.data?.choices?.[0]?.message?.content) {
                logger.error('Empty response from OpenRouter:', response.data);
                throw new Error('Empty response from OpenRouter');
            }

            const content = response.data.choices[0].message.content;
            storyData = typeof content === 'string' ? JSON.parse(content) : content;
            
            // Validate story data structure
            if (!storyData.story || !storyData.quiz) {
                throw new Error('Invalid story data structure');
            }

            // Validate quiz structure
            if (!validateQuizStructure(storyData.quiz)) {
                throw new Error('Invalid quiz structure');
            }

            // Validate story structure
            if (!storyData.story.title || 
                !storyData.story.content || 
                !Array.isArray(storyData.story.learning_objectives)) {
                throw new Error('Invalid story structure');
            }
        } catch (error) {
            logger.error('Failed to parse OpenRouter response', { 
                error: error.message,
                response: response.data 
            });
            
            if (error.response?.data?.error) {
                const apiError = error.response.data.error;
                if (apiError.includes('rate limit')) {
                    throw new AppError('Rate limit exceeded. Please try again later.', 429);
                } else if (apiError.includes('invalid api key')) {
                    throw new AppError('Invalid API key. Please check your OpenRouter API key.', 500);
                } else if (apiError.includes('permission')) {
                    throw new AppError('Access denied. Please check your OpenRouter API key permissions.', 500);
                }
                throw new AppError(apiError, error.response.status);
            }
            
            throw new AppError('Invalid response format from AI', 500);
        }

        // Save to database
        let savedStory;
        try {
            const { data: story, error: dbError } = await supabase
                .from('stories')
                .insert([{
                    user_id: req.user.id,
                    story_title: storyData.story.title,
                    story_text: storyData.story.content,
                    subject: subject,
                    academic_grade: academic_grade,
                    subject_specification: subject_specification,
                    setting: setting,
                    main_character: main_character,
                    word_count: word_count,
                    language: language,
                    learning_objectives: storyData.story.learning_objectives,
                    image_prompt: storyData.story.imagePrompt,
                    audio_url: storyData.story.audioUrl,
                    image_url: storyData.story.imageUrl,
                    quiz_questions: storyData.quiz.questions,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (dbError) {
                logger.error('Database error:', dbError);
                throw dbError;
            }
            savedStory = story;
            logger.info('Story saved to database', { storyId: story.id });
        } catch (error) {
            logger.error('Failed to save story to database', { error: error.message });
            throw new AppError('Failed to save story to database', 500);
        }

        // Send response
        res.json({
            success: true,
            data: {
                story: {
                    ...storyData.story,
                    id: savedStory.id
                },
                quiz: storyData.quiz
            }
        });

    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            handleError(new AppError('Request timeout', 504), req, res);
        } else {
            handleError(error, req, res);
        }
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