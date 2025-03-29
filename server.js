require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const logger = require('./utils/logger');
const { AppError, handleError } = require('./utils/errorHandler');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
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
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Test database connection
const testConnection = async () => {
    try {
        const { data, error } = await supabase.from('stories').select('count').limit(1);
        if (error) throw error;
        console.log('Database connection successful');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};

// Run connection test on startup
testConnection();

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL;

// Input validation function
const validateInputs = (inputs) => {
    const requiredFields = ['academic_grade', 'subject', 'word_count', 'language'];
    
    // Check if all required fields are present
    for (const field of requiredFields) {
        if (!inputs[field]) {
            return false;
        }
    }
    
    // Validate word_count is a number
    if (typeof inputs.word_count !== 'number') {
        return false;
    }
    
    return true;
};

// Routes
app.post('/generate-story', async (req, res, next) => {
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

        // Validate required fields
        if (!academic_grade || !subject || !subject_specification) {
            throw new AppError('Missing required fields', 400, {
                required: ['academic_grade', 'subject', 'subject_specification']
            });
        }

        logger.info({
            academic_grade,
            subject,
            subject_specification,
            setting,
            main_character,
            word_count,
            language,
            generate_vocabulary,
            generate_summary
        }, 'Generating story with parameters');

        // Construct the prompt
        const prompt = `Create an educational story for ${academic_grade} level about ${subject}, specifically focusing on ${subject_specification}. 
        ${setting ? `Set in ${setting}.` : ''} 
        ${main_character ? `Main character: ${main_character}.` : ''} 
        The story should be approximately ${word_count} words long and written in ${language}.
        ${generate_vocabulary ? 'Include a vocabulary list at the end.' : ''}
        ${generate_summary ? 'Include a brief summary at the beginning.' : ''}
        Make it engaging and educational, suitable for the specified academic level.`;

        // Generate story using OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are an expert educational storyteller. Create engaging, age-appropriate stories that teach important concepts."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        const storyContent = completion.choices[0].message.content;

        // Generate quiz questions
        const quizPrompt = `Based on the following story, generate 5 multiple-choice questions to test understanding. 
        Format the response as a JSON array with objects containing: question, options (array of 4), correct_answer (A, B, C, or D), and explanation.
        Story: ${storyContent}`;

        const quizCompletion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are an expert at creating educational quiz questions."
                },
                {
                    role: "user",
                    content: quizPrompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        let quiz;
        try {
            quiz = JSON.parse(quizCompletion.choices[0].message.content);
        } catch (error) {
            logger.error({ error: error.message }, 'Failed to parse quiz JSON');
            throw new AppError('Failed to generate quiz questions', 500);
        }

        // Save to database if user is authenticated
        if (req.user) {
            try {
                const { data, error } = await supabase
                    .from('stories')
                    .insert([
                        {
                            user_id: req.user.id,
                            story_title: subject_specification,
                            story_text: storyContent,
                            subject: subject,
                            academic_level: academic_grade,
                            created_at: new Date().toISOString()
                        }
                    ])
                    .select();

                if (error) throw error;

                logger.info({
                    story_id: data[0].id,
                    user_id: req.user.id
                }, 'Story saved to database');
            } catch (error) {
                logger.error({ error: error.message }, 'Failed to save story to database');
                // Don't throw error here, just log it
            }
        }

        // Send response
        res.json({
            story: {
                title: subject_specification,
                content: storyContent,
                learning_objectives: [
                    'Understanding the main concepts',
                    'Analyzing key events',
                    'Applying knowledge'
                ]
            },
            quiz
        });

    } catch (error) {
        logger.error({
            error: error.message,
            stack: error.stack
        }, 'Error generating story');
        next(error);
    }
});

// Get user's stories endpoint
app.get('/user-stories', authenticateUser, async (req, res) => {
    try {
        const { data: stories, error } = await supabase
            .from('stories')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase query error:', error);
            return res.status(500).json({ error: 'Failed to fetch stories' });
        }

        res.json(stories);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch stories' });
    }
});

// Error handling middleware
app.use(handleError);

// Start server
app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
}); 