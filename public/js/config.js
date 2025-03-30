// Get environment variables from window._env_
const env = window._env_ || {};

// Validate and format URLs
const serverUrl = env.SERVER_URL?.trim() || window.location.origin;
const supabaseUrl = env.SUPABASE_URL?.trim() || '';
const supabaseKey = env.SUPABASE_KEY?.trim() || '';

// Log configuration (without sensitive data)
console.log('Configuration:', {
    hasServerUrl: !!serverUrl,
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseKey
});

export const config = {
    serverUrl: window._env_?.SERVER_URL || window.location.origin,
    supabaseUrl: window._env_?.SUPABASE_URL,
    supabaseKey: window._env_?.SUPABASE_KEY,
    openRouterKey: window._env_?.OPENROUTER_KEY,
    openRouterModel: 'openai/gpt-4-turbo-preview',
    maxRetries: 3,
    retryDelay: 1000,
    storyTimeout: 60000, // 60 seconds
    maxWordCount: 5000,
    minWordCount: 100
};

// Validate required environment variables
if (!config.serverUrl) {
    console.error('SERVER_URL is not configured');
}
if (!config.supabaseUrl) {
    console.error('SUPABASE_URL is not configured');
}
if (!config.supabaseKey) {
    console.error('SUPABASE_KEY is not configured');
} 