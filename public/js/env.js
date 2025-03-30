// Environment variables
export const env = {
    SERVER_URL: window._env_?.SERVER_URL || window.location.origin,
    SUPABASE_URL: window._env_?.SUPABASE_URL || '',
    SUPABASE_KEY: window._env_?.SUPABASE_KEY || ''
};

// Make it available globally
window._env_ = env;

// Log environment variables (without sensitive data)
console.log('Environment variables loaded:', {
    hasServerUrl: !!env.SERVER_URL,
    hasSupabaseUrl: !!env.SUPABASE_URL,
    hasSupabaseKey: !!env.SUPABASE_KEY
}); 