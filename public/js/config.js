export const config = {
    serverUrl: window._env_?.SERVER_URL || window.location.origin,
    supabaseUrl: window._env_?.SUPABASE_URL,
    supabaseKey: window._env_?.SUPABASE_KEY
}; 