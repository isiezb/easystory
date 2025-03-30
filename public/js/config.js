import { env } from './env.js';

const config = {
    serverUrl: env.SERVER_URL,
    supabaseUrl: env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_KEY,
    maxRetries: 3,
    retryDelay: 1000,
    defaultWordCount: 500,
    maxWordCount: 2000
};

// Log config without sensitive data
console.log('Config initialized:', {
    serverUrl: config.serverUrl,
    maxRetries: config.maxRetries,
    retryDelay: config.retryDelay,
    defaultWordCount: config.defaultWordCount,
    maxWordCount: config.maxWordCount
});

// Validate required environment variables
if (!config.serverUrl) {
    throw new Error('SERVER_URL is not configured');
}

// Make config globally available
window._config = config;

export { config }; 