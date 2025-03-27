require('dotenv').config();

module.exports = {
    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1'
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