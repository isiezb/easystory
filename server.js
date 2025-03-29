const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = config.server.port;

// Middleware
app.use(express.json());
app.use(cors());

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

// Supabase client initialization
let supabase;
try {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    console.log('Supabase client initialized successfully');
} catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    process.exit(1);
}

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
const OPENROUTER_API_KEY = config.openrouter.apiKey;
const OPENROUTER_BASE_URL = config.openrouter.baseUrl;

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

// Story generation endpoint
app.post('/generate-story', authenticateUser, async (req, res) => {
    try {
        const {
            academic_grade,
            subject,
            subject_specification,
            setting,
            main_character,
            word_count,
            language,
            generate_summary,
            previous_story,
            difficulty,
            quiz_score
        } = req.body;

        // Construct the prompt based on parameters
        let prompt = `Create an educational story with the following specifications:
- Academic Grade: ${academic_grade}
- Subject: ${subject}
${subject_specification ? `- Specific Topic: ${subject_specification}` : ''}
${setting ? `- Setting: ${setting}` : ''}
${main_character ? `- Main Character: ${main_character}` : ''}
- Word Count: ${word_count}
- Language: ${language}
${generate_summary ? '- Include a brief 1-2 sentence summary of the story' : ''}
${previous_story ? `- This is a continuation of the previous story: ${previous_story}` : ''}
${difficulty ? `- Difficulty Level: ${difficulty}` : ''}
${quiz_score ? `- Previous Quiz Score: ${quiz_score}` : ''}

Please provide the story in the following JSON format:
{
    "story_title": "Title of the story",
    "story_text": "The complete story text",
    "learning_objectives": ["List of learning objectives"],
    "quiz_questions": [
        {
            "question": "Question text",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correct_answer": "Correct option"
        }
    ],
    "vocabulary_list": [
        {
            "word": "Word",
            "definition": "Definition"
        }
    ]
    ${generate_summary ? ',\n    "story_summary": "Brief summary of the story"' : ''}
}`;

        // Call OpenRouter API
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'anthropic/claude-3-opus-20240229',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 4000
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://github.com/isiezb/quiz-story',
                'X-Title': 'Quiz Story Generator'
            }
        });

        // Parse and clean the response
        const storyData = JSON.parse(response.data.choices[0].message.content);

        // Store the story in Supabase
        const { data: story, error: insertError } = await supabase
            .from('stories')
            .insert({
                user_id: req.user.id,
                academic_grade,
                subject,
                subject_specification,
                setting,
                main_character,
                word_count,
                language,
                story_text: storyData.story_text,
                story_title: storyData.story_title,
                learning_objectives: storyData.learning_objectives,
                quiz_questions: storyData.quiz_questions,
                vocabulary_list: storyData.vocabulary_list,
                story_summary: storyData.story_summary,
                is_continuation: !!previous_story
            })
            .select()
            .single();

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            return res.status(500).json({ error: 'Failed to save story to database' });
        }

        res.json(story);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to generate story' });
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

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 