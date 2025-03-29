require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const logger = require('./utils/logger');
const { AppError, handleError } = require('./utils/errorHandler');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Debug logging for environment variables
logger.info('Environment check:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV
});

// Initialize Supabase client
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
app.post('/generate-story', async (req, res) => {
    try {
        const { subject, grade, topic, learning_objectives } = req.body;
        
        // Validate required fields
        if (!subject || !grade || !topic || !learning_objectives) {
            throw new AppError('Missing required fields', 400);
        }

        // Log request details
        logger.info('Generating story', {
            subject,
            grade,
            topic,
            learning_objectives
        });

        // Construct the prompt
        const prompt = `Create an educational story for ${grade} grade students about ${topic} in ${subject}. 
        The story should be engaging and help students understand the following learning objectives:
        ${learning_objectives.map(obj => `- ${obj}`).join('\n')}
        
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

        // Generate story and quiz using OpenRouter
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "google/gemini-pro",
            messages: [
                { role: "system", content: "You are an expert educational storyteller and quiz creator." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        let storyData;
        try {
            storyData = response.data.choices[0].message.content;
        } catch (error) {
            logger.error('Failed to parse OpenRouter response', { error: error.message });
            throw new AppError('Invalid response format from AI', 500);
        }

        // Save to database
        try {
            const { data: story, error: dbError } = await supabase
                .from('stories')
                .insert([{
                    user_id: req.user.id,
                    story_title: storyData.story.title,
                    story_text: storyData.story.content,
                    subject: subject,
                    grade: grade,
                    topic: topic,
                    learning_objectives: storyData.story.learning_objectives,
                    image_prompt: storyData.story.imagePrompt,
                    audio_url: storyData.story.audioUrl,
                    image_url: storyData.story.imageUrl,
                    quiz_questions: storyData.quiz.questions
                }])
                .select()
                .single();

            if (dbError) throw dbError;
            logger.info('Story saved to database', { storyId: story.id });
        } catch (error) {
            logger.error('Failed to save story to database', { error: error.message });
            // Don't throw here, just log the error
        }

        // Send response
        res.json({
            success: true,
            data: {
                story: {
                    ...storyData.story,
                    id: story?.id // Include the database ID if available
                },
                quiz: storyData.quiz
            }
        });

    } catch (error) {
        handleError(error, req, res);
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