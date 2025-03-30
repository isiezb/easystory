// Environment variables
export const env = {
    SERVER_URL: window.location.origin,
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_KEY: 'your-anon-key'
};

// Make it available globally
window._env_ = env; 