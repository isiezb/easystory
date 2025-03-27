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
        port: 3000,
        frontendUrl: 'http://localhost:8000'
    }
}; 