import { config } from './config.js';

// Get environment variables
const supabaseUrl = window._env_?.SUPABASE_URL;
const supabaseKey = window._env_?.SUPABASE_KEY;

// Validate environment variables
if (!supabaseUrl) {
    console.error('Missing SUPABASE_URL environment variable');
    throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseKey) {
    console.error('Missing SUPABASE_KEY environment variable');
    throw new Error('Missing SUPABASE_KEY environment variable');
}

// Initialize Supabase client
export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
}); 