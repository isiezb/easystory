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

// Fix for 'trust proxy' error with express-rate-limit
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.supabase.co", "cdn.jsdelivr.net", "https://unpkg.com"],
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
app.use(express.urlencoded({ extended: true }));

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

// Validate and sanitize input data
function validateInputs(inputs) {
    try {
        // Log the validation process
        logger.info('Validating input data:', JSON.stringify(inputs));
        
        // Check for required fields with detailed logging
        const requiredFields = ['subject', 'academic_grade', 'word_count', 'language'];
        
        // Check each required field individually for better debugging
        const missingFields = [];
    for (const field of requiredFields) {
        if (!inputs[field]) {
                missingFields.push(field);
                logger.error(`Missing required field: ${field}`);
            }
        }
        
        if (missingFields.length > 0) {
            logger.error(`Validation failed: Missing required fields: ${missingFields.join(', ')}`);
            return false;
        }
        
        // Set default values for optional fields if they are empty
        if (!inputs.subject_specification) {
            inputs.subject_specification = "Basic concepts";
            logger.info("Using default value for subject_specification: 'Basic concepts'");
        }
        
        if (!inputs.setting) {
            inputs.setting = "a classroom";
            logger.info("Using default value for setting: 'a classroom'");
        }
        
        if (!inputs.main_character) {
            inputs.main_character = "a student";
            logger.info("Using default value for main_character: 'a student'");
        }
        
        // Validate word_count is a number within range
        const wordCount = parseInt(inputs.word_count);
        if (isNaN(wordCount) || wordCount < 100 || wordCount > 5000) {
            logger.error(`Validation failed: word_count must be a number between 100 and 5000, got: ${inputs.word_count}`);
            return false;
        }
        
        // Validate academic_grade is one of the supported values
        const validGrades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'University'];
        if (!validGrades.includes(inputs.academic_grade)) {
            logger.error(`Validation failed: academic_grade must be one of ${validGrades.join(', ')}, got: ${inputs.academic_grade}`);
            return false;
        }
        
        // Validate language is one of the supported languages (case sensitive)
        const supportedLanguages = ['English', 'Spanish', 'French', 'German', 'Italian'];
        if (!supportedLanguages.includes(inputs.language)) {
            logger.error(`Validation failed: language must be one of ${supportedLanguages.join(', ')}, got: ${inputs.language}`);
            return false;
        }
        
        // All validations passed
        logger.info('Input data validation successful');
        return true;
    } catch (error) {
        logger.error('Error during input validation:', error);
        return false;
    }
}

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

// Generate story using OpenRouter
async function generateStoryWithOpenRouter(inputs) {
    try {
        const prompt = `Write a story about ${inputs.subject} for ${inputs.academic_grade} level students.
Setting: ${inputs.setting}
Main Character: ${inputs.main_character}
Subject details: ${inputs.subject_specification}
Language: ${inputs.language}
Word count: ${inputs.word_count}

The story should:
1. Be engaging and age-appropriate
2. Include clear learning objectives
3. Use appropriate vocabulary
4. Have a clear structure
5. Include a quiz at the end
6. Include a vocabulary list
7. Include a summary

IMPORTANT: Your response must be a valid JSON object with exactly this structure:
{
    "content": "the story text",
    "learning_objectives": ["objective 1", "objective 2", "objective 3"],
    "vocabulary": [
        {
            "word": "word1",
            "definition": "definition1",
            "example": "example1",
            "part_of_speech": "noun"
        }
    ],
    "quiz": [
        {
            "question": "question1",
            "options": ["option1", "option2", "option3", "option4"],
            "correctAnswer": 0
        }
    ],
    "summary": "brief summary"
}

Do not include any text before or after the JSON object.`;

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'openai/gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional educational storyteller. You must ALWAYS respond with a valid JSON object containing the story and its components. Never include any text before or after the JSON object.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 4000
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.data?.choices?.[0]?.message?.content) {
            logger.error('OpenRouter response missing content:', response.data);
            throw new AppError('Invalid response from OpenRouter', 500);
        }

        const content = response.data.choices[0].message.content;
        logger.info('Raw OpenRouter response:', content);

        let parsedContent;
        try {
            // Try to find JSON content between curly braces
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedContent = JSON.parse(jsonMatch[0]);
            } else {
                parsedContent = JSON.parse(content);
            }
        } catch (error) {
            logger.error('Failed to parse OpenRouter response:', error);
            logger.error('Raw content:', content);
            throw new AppError('Invalid response format from OpenRouter', 500);
        }

        // Validate the response structure
        const requiredFields = ['content', 'learning_objectives', 'vocabulary', 'quiz', 'summary'];
        const missingFields = requiredFields.filter(field => !parsedContent[field]);
        
        if (missingFields.length > 0) {
            logger.error('Missing required fields:', missingFields);
            logger.error('Parsed content:', parsedContent);
            throw new AppError(`Invalid response structure: missing ${missingFields.join(', ')}`, 500);
        }

        // Validate arrays
        if (!Array.isArray(parsedContent.learning_objectives)) {
            throw new AppError('learning_objectives must be an array', 500);
        }
        if (!Array.isArray(parsedContent.vocabulary)) {
            throw new AppError('vocabulary must be an array', 500);
        }
        if (!Array.isArray(parsedContent.quiz)) {
            throw new AppError('quiz must be an array', 500);
        }

        // Validate quiz structure
        parsedContent.quiz.forEach((q, index) => {
            if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctAnswer !== 'number') {
                throw new AppError(`Invalid quiz question at index ${index}`, 500);
            }
        });

        // Validate vocabulary structure
        parsedContent.vocabulary.forEach((v, index) => {
            if (!v.word || !v.definition || !v.example || !v.part_of_speech) {
                throw new AppError(`Invalid vocabulary item at index ${index}`, 500);
            }
        });

        return parsedContent;
    } catch (error) {
        logger.error('Error generating story:', error);
        if (error.response?.data?.error?.message) {
            throw new AppError(error.response.data.error.message, 500);
        }
        throw new AppError('Failed to generate story', 500);
    }
}

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
            logger.error('Invalid input data:', inputs);
            throw new AppError('Invalid input data', 400);
        }

        // Generate story using OpenRouter
        const response = await generateStoryWithOpenRouter(inputs);
        logger.info('Story generated successfully');
        
        // Check for authenticated user first
        const authHeader = req.headers.authorization;
        let userId = null;
        let isAnonymous = true;
        
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                logger.info('Auth token received, attempting to identify user');
                
                const { data: { user }, error: userError } = await supabase.auth.getUser(token);
                
                if (userError) {
                    logger.error('Error identifying user:', userError);
                } else if (user) {
                    userId = user.id;
                    isAnonymous = false;
                    logger.info(`Authenticated user identified: ${userId}`);
                } else {
                    logger.warn('No user found with provided token');
                }
            } catch (error) {
                logger.error('Error handling user authentication:', error);
            }
        }
        
        // Check for anonymous user ID in headers or body if no authenticated user
        if (!userId) {
            userId = req.headers['x-anonymous-id'] || inputs.anonymous_id;
            
            if (userId) {
                logger.info(`Anonymous user ID provided: ${userId}`);
                isAnonymous = true;
            } else {
                // Generate a random anonymous ID if none was provided
                userId = 'anon-' + Math.random().toString(36).substring(2, 15);
                isAnonymous = true;
                logger.info(`Generated anonymous user ID: ${userId}`);
            }
        }
        
        // Save the story if we have a user ID (authenticated or anonymous)
        if (userId) {
            logger.info(`Saving story for ${isAnonymous ? 'anonymous' : 'authenticated'} user: ${userId}`);
            
            try {
                const story = {
                    user_id: userId,
                    is_anonymous: isAnonymous,
                    academic_grade: inputs.academic_grade,
                    subject: inputs.subject,
                    subject_specification: inputs.subject_specification || '',
                    setting: inputs.setting || '',
                    main_character: inputs.main_character || '',
                    word_count: inputs.word_count,
                    language: inputs.language,
                    story_text: response.content,
                    story_title: inputs.subject_specification || 'Untitled Story',
                    learning_objectives: response.learning_objectives || [],
                    quiz_questions: response.quiz || [],
                    vocabulary_list: response.vocabulary || [],
                    story_summary: response.summary || '',
                    is_continuation: false
                };
                
                logger.info('Saving story with data:', { 
                    user_id: userId, 
                    is_anonymous: isAnonymous,
                    subject: inputs.subject
                });

                const { data, error } = await supabase
                    .from('stories')
                    .insert(story)
                    .select()
                    .single();

                if (error) {
                    logger.error('Error saving story to Supabase:', error);
                    logger.error('Error details:', JSON.stringify(error));
                    
                    // Add error info to the response
                    response.saved = false;
                    response.save_error = 'Database error: ' + error.message;
                } else {
                    logger.info('Story saved to Supabase successfully:', { storyId: data.id });
                    // Add saved flag to response
                    response.saved = true;
                    response.story_id = data.id;
                }
            } catch (error) {
                logger.error('Error handling Supabase save:', error);
                logger.error('Error stack:', error.stack);
                response.saved = false;
                response.save_error = 'Exception during save: ' + error.message;
            }
        } else {
            logger.info('No user identification, skipping database save');
            response.saved = false;
            response.save_error = 'No user identification available';
        }

        res.json(response);
    } catch (error) {
        logger.error('Error in generate-story endpoint:', error);
        if (error.response?.data?.error?.message) {
            res.status(error.response.status || 500).json({
                error: error.response.data.error.message
            });
        } else {
            res.status(500).json({
                error: error.message || 'Failed to generate story'
            });
        }
    }
});

// Get user's stories endpoint - modified to support anonymous users
app.get('/user-stories/:userId', apiLimiter, async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        // Check if this is an anonymous user ID
        const isAnonymous = userId.startsWith('anon-');
        
        // If it's an authenticated user ID, verify token unless in development
        if (!isAnonymous && process.env.NODE_ENV !== 'development') {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ error: 'Authentication required for user stories' });
            }
            
            const token = authHeader.split(' ')[1];
            const { data: { user }, error } = await supabase.auth.getUser(token);
            
            if (error || !user) {
                return res.status(401).json({ error: 'Invalid authentication' });
            }
            
            // Verify the user is requesting their own stories
            if (user.id !== userId) {
                return res.status(403).json({ error: 'Unauthorized access to other user stories' });
            }
        }
        
        logger.info(`Fetching stories for ${isAnonymous ? 'anonymous' : 'authenticated'} user: ${userId}`);
        
        // Query stories based on user_id
        let query = supabase
            .from('stories')
            .select('*')
            .eq('user_id', userId);
            
        // If anonymous, add additional filter
        if (isAnonymous) {
            query = query.eq('is_anonymous', true);
        }
        
        const { data: stories, error } = await query.order('created_at', { ascending: false });

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

// Story continuation endpoint
app.post('/continue-story', apiLimiter, async (req, res) => {
    try {
        const inputs = req.body;
        logger.info('Received story continuation request:', {
            word_count: inputs.word_count,
            language: inputs.language,
            is_continuation: inputs.is_continuation
        });

        // Validate inputs
        if (!inputs.original_story) {
            logger.error('Missing original_story in continuation request');
            throw new AppError('Original story content is required', 400);
        }

        // Continue story using OpenRouter
        const prompt = `
        Continue the following story. Make it engaging and educational.
        Original story: ${inputs.original_story}
        
        Continuation prompt: ${inputs.continuation_prompt || 'Continue the story'}
        
        Word count: approximately ${inputs.word_count || 300} words.
        `;

        // Similar structure to generateStoryWithOpenRouter but simplified for continuation
        try {
            logger.info('Sending continuation request to OpenRouter');
            
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    { role: "system", content: "You are a creative educational story generator." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1500,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            logger.info('OpenRouter continuation response received');
            const continuationContent = response.data.choices[0].message.content;

            // If user is logged in, save continuation to Supabase
            const authHeader = req.headers.authorization;
            if (authHeader) {
                try {
                    const token = authHeader.split(' ')[1];
                    logger.info('Auth token received, attempting to identify user for continuation save');
                    
                    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
                    
                    if (userError) {
                        logger.error('Error identifying user for continuation:', userError);
                    } else if (user) {
                        logger.info(`User identified: ${user.id}, saving continuation to database`);
                        
                        const { data, error } = await supabase
                            .from('story_continuations')
                            .insert({
                                user_id: user.id,
                                original_story: inputs.original_story,
                                continuation_text: continuationContent,
                                word_count: inputs.word_count || 300,
                                language: inputs.language || 'English',
                                created_at: new Date().toISOString()
                            })
                            .select()
                            .single();

                        if (error) {
                            logger.error('Error saving continuation to Supabase:', error);
                        } else {
                            logger.info('Continuation saved to Supabase successfully:', { continuationId: data.id });
                        }
                    } else {
                        logger.warn('No user found with provided token for continuation');
                    }
                } catch (error) {
                    logger.error('Error handling continuation Supabase save:', error);
                }
            }

            const responseObj = {
                success: true,
                data: {
                    continuation: {
                        content: continuationContent,
                        original_story: inputs.original_story,
                        word_count: continuationContent.split(/\s+/).length,
                        timestamp: new Date().toISOString()
                    }
                },
                meta: {
                    processing_time: `${((Date.now() - new Date(response.data.created * 1000).getTime()) / 1000).toFixed(2)}s`,
                    model: response.data.model
                }
            };

            res.json(responseObj);
        } catch (error) {
            logger.error('Error in OpenRouter continuation request:', error);
            throw new AppError('Failed to generate story continuation', 500);
        }
    } catch (error) {
        logger.error('Error in continue-story endpoint:', error);
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