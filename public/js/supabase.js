import { config } from './config.js';

// Initialize Supabase client
const supabase = window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseKey
);

export { supabase }; 