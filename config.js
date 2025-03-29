require('dotenv').config();

module.exports = {
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        apiUrl: 'https://generativelanguage.googleapis.com/v1'
    },
    supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY
    },
    server: {
        port: process.env.PORT || 3000,
        frontendUrl: process.env.FRONTEND_URL || 'https://test-dict.onrender.com'
    }
}; 