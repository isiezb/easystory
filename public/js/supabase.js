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

// Validate URL format
try {
    new URL(supabaseUrl);
} catch (error) {
    console.error('Invalid SUPABASE_URL format:', supabaseUrl);
    throw new Error('Invalid SUPABASE_URL format');
}

// Initialize Supabase client
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

export { supabase }; 