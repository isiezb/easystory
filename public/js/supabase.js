import { config } from './config.js';

// Initialize Supabase client
const supabase = window.supabase.createClient(
    window._env_?.SUPABASE_URL || '',
    window._env_?.SUPABASE_KEY || ''
);

export { supabase }; 