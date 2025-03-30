export const config = {
    serverUrl: window._env_?.SERVER_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin),
    supabaseUrl: window._env_?.SUPABASE_URL,
    supabaseKey: window._env_?.SUPABASE_KEY
}; 