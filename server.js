const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const path = require('path');

const app = express();
const port = config.server.port;

// Middleware
app.use(express.json());

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
        let prompt = `Create an educational story and quiz based on the following parameters:

STORY PARAMETERS:
- Grade Level: ${academic_grade}
- Subject: ${subject}
${subject_specification ? `- Subject Specification: ${subject_specification}` : ''}
${setting ? `- Setting: ${setting}` : '- Setting: Appropriate environment'}
${main_character ? `- Main Character: ${main_character}` : '- Main Character: Relatable protagonist'}
- Word Count: ${word_count}
- Language: ${language}

OUTPUT FORMAT:
You must respond with a JSON object in the following exact format:
{
    "story": {
        "title": "Story title here",
        "content": "The story content here...",
        "learning_objectives": ["objective 1", "objective 2", "objective 3"]
    },
    "quiz": [
        {
            "question": "Question about specific story content?",
            "options": ["First option", "Second option", "Third option", "Fourth option"],
            "correct_answer": "A",
            "explanation": "Explanation of why this is correct"
        }
    ]
}

REQUIREMENTS:
1. Story must be educational and engaging
2. Story must be appropriate for ${academic_grade} level
3. Quiz must have exactly 3 questions
4. Each question must have exactly 4 options
5. Correct answers must be A, B, C, or D (matching option position)
6. Questions must test comprehension of key story elements
7. All output must be in ${language}
8. Story must be approximately ${word_count} words
9. Learning objectives must be clear and measurable

${req.body.previous_story ? `PREVIOUS STORY TO CONTINUE:
${req.body.previous_story}

Note: Continue the story while maintaining the same characters, setting, and educational focus but adjusting complexity for ${academic_grade} level.` : ''}`;

        try {
            // Make request to OpenRouter API with Google's Gemini model
            const response = await axios.post(
                `${OPENROUTER_BASE_URL}/chat/completions`,
                {
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{ 
                        role: 'user', 
                        content: prompt 
                    }],
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': config.server.frontendUrl,
                    }
                }
            );

            // Parse and validate the response
            let result;
            try {
                const content = response.data.choices[0].message.content;
                // Clean the response to ensure valid JSON
                const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
                result = JSON.parse(cleanContent);
                
                // Validate the structure
                if (!result.story || !result.quiz) {
                    throw new Error('Invalid response structure');
                }
                
                // Validate quiz format
                result.quiz = result.quiz.map(q => {
                    // Ensure correct_answer is A, B, C, or D
                    if (!['A', 'B', 'C', 'D'].includes(q.correct_answer)) {
                        console.error('Invalid correct_answer:', q.correct_answer);
                        q.correct_answer = 'A';
                    }
                    // Ensure exactly 4 options
                    if (!q.options || q.options.length !== 4) {
                        console.error('Invalid options:', q.options);
                        q.options = ['Option A', 'Option B', 'Option C', 'Option D'];
                    }
                    return q;
                });
                
                // Ensure exactly 3 questions
                if (result.quiz.length !== 3) {
                    result.quiz = result.quiz.slice(0, 3);
                }
                
                // Log the generated content for debugging
                console.log('Generated content:', JSON.stringify(result, null, 2));
                
            } catch (parseError) {
                console.error('Failed to parse response:', parseError);
                throw new Error('Failed to generate valid content');
            }

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
                            story_text: result.story.content,
                            story_title: result.story.title,
                            learning_objectives: result.story.learning_objectives,
                            quiz_questions: result.quiz,
                            is_continuation: !!req.body.previous_story
                        }
                    ]);

                if (dbError) throw dbError;
            } catch (dbError) {
                console.error('Supabase error:', dbError);
            }

            // Return the complete result
            return res.status(200).json(result);
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

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 