const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const path = require('path');

const app = express();
const port = config.server.port;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Supabase client initialization
let supabase;
try {
    supabase = createClient(config.supabase.url, config.supabase.key);
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
app.post('/generate-story', async (req, res) => {
    try {
        // Validate inputs
        if (!validateInputs(req.body)) {
            return res.status(400).json({ error: 'Invalid or missing required inputs' });
        }

        const { 
            academic_grade, 
            subject, 
            subject_specification, 
            setting, 
            main_character, 
            word_count, 
            language 
        } = req.body;

        // Construct the prompt with optional fields
        let prompt = `Create a didactic story for ${academic_grade} students about ${subject}`;
        
        if (subject_specification) {
            prompt += `, specifically focusing on ${subject_specification}`;
        }
        
        if (setting) {
            prompt += `, set in ${setting}`;
        } else {
            prompt += `, set in an appropriate environment`;
        }
        
        if (main_character) {
            prompt += `, featuring ${main_character}`;
        } else {
            prompt += `, featuring a relatable protagonist`;
        }
        
        prompt += `, approximately ${word_count} words, in ${language}. The story should be educational and engaging, with clear learning objectives appropriate for ${academic_grade} level.`;

        // Add continuation context if previous story exists
        if (req.body.previous_story) {
            prompt = `Continue the following story, maintaining the same characters, setting, and educational focus but adjusting the complexity for ${academic_grade} level students. The continuation should be approximately ${word_count} words and in ${language}. Make sure to maintain the same style and tone while advancing the plot naturally. Include new learning objectives appropriate for the ${academic_grade} level. Previous story:\n\n${req.body.previous_story}\n\nContinue the story while maintaining educational value and engagement.`;
        }

        // Make request to OpenRouter API
        try {
            const response = await axios.post(
                `${OPENROUTER_BASE_URL}/chat/completions`,
                {
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: word_count * 2,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': config.server.frontendUrl,
                        'X-Title': 'Didactic Story Generator',
                        'OpenAI-Organization': 'org-123',
                        'HTTP-Origin': config.server.frontendUrl
                    }
                }
            );

            console.log('OpenRouter API Response:', JSON.stringify(response.data, null, 2));

            if (response.data.error) {
                console.error('OpenRouter API Error:', response.data.error);
                throw new Error(response.data.error.message || 'API Error');
            }

            if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
                console.error('Invalid API response format:', response.data);
                throw new Error('Invalid API response format');
            }

            const generatedStory = response.data.choices[0].message.content;

            // Store in Supabase
            try {
                const { data, error: dbError } = await supabase
                    .from('stories')
                    .insert([
                        {
                            academic_grade,
                            subject,
                            subject_specification,
                            setting,
                            main_character,
                            word_count,
                            language,
                            story_text: generatedStory,
                            is_continuation: !!req.body.previous_story
                        }
                    ]);

                if (dbError) {
                    console.error('Supabase error details:', {
                        message: dbError.message,
                        details: dbError.details,
                        hint: dbError.hint,
                        code: dbError.code
                    });
                    // Continue execution even if database insertion fails
                } else {
                    console.log('Successfully stored story in Supabase:', data);
                }
            } catch (dbError) {
                console.error('Supabase connection error:', dbError);
            }

            // Return success response
            return res.status(200).json({ story: generatedStory });
        } catch (error) {
            console.error('OpenRouter API Error:', error.response ? error.response.data : error.message);
            return res.status(500).json({ 
                error: error.response?.data?.error?.message || 'Failed to generate story'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Failed to generate story' });
    }
});

// Root path handler
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 