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
app.use(cors());
app.use(express.json());

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
    res.send(`
        window._env_ = {
            SERVER_URL: '${process.env.SERVER_URL || ''}',
            SUPABASE_URL: '${process.env.SUPABASE_URL || ''}',
            SUPABASE_KEY: '${process.env.SUPABASE_KEY || ''}'
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
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// Input validation function
const validateInputs = (inputs) => {
    const requiredFields = ['subject', 'grade', 'topic', 'learning_objectives'];
    
    // Check if all required fields are present
    for (const field of requiredFields) {
        if (!inputs[field]) {
            return false;
        }
    }
    
    // Validate learning_objectives is an array
    if (!Array.isArray(inputs.learning_objectives)) {
        return false;
    }
    
    return true;
};

// API Routes
app.post('/generate-story', authenticateUser, async (req, res) => {
    try {
        const { subject, grade, topic, learning_objectives } = req.body;
        
        // Validate inputs
        if (!validateInputs(req.body)) {
            throw new AppError('Invalid input data', 400);
        }

        // Log request details
        logger.info('Generating story', {
            subject,
            grade,
            topic,
            learning_objectives,
            userId: req.user.id
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

        // Generate story and quiz using OpenRouter with timeout
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
            },
            timeout: 30000 // 30 second timeout
        });

        let storyData;
        try {
            const content = response.data.choices[0].message.content;
            storyData = typeof content === 'string' ? JSON.parse(content) : content;
            
            // Validate story data structure
            if (!storyData.story || !storyData.quiz) {
                throw new Error('Invalid story data structure');
            }
        } catch (error) {
            logger.error('Failed to parse OpenRouter response', { error: error.message });
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

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
}); 