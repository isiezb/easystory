export const config = {
    serverUrl: window._env_?.SERVER_URL || '',
    supabaseUrl: window._env_?.SUPABASE_URL || '',
    supabaseKey: window._env_?.SUPABASE_KEY || ''
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