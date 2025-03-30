// Environment variables
const env = {
    // Try to use values from window._env_ first, then use fallbacks
    SERVER_URL: window._env_?.SERVER_URL || window.location.origin,
    
    // Sample values for development - replace with your actual values in production
    SUPABASE_URL: window._env_?.SUPABASE_URL || '',
    SUPABASE_KEY: window._env_?.SUPABASE_KEY || ''
};

// Make it available globally
window._env_ = env;

// Log environment variables (without sensitive data)
console.log('Environment variables loaded:', {
    hasServerUrl: !!env.SERVER_URL,
    serverUrl: env.SERVER_URL,
    hasSupabaseUrl: !!env.SUPABASE_URL,
    hasSupabaseKey: !!env.SUPABASE_KEY
}); 