import { config } from './config.js';

// Validate Supabase URL
const supabaseUrl = config.supabaseUrl?.trim();
const supabaseKey = config.supabaseKey?.trim();

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration is missing');
    throw new Error('Supabase configuration is missing');
}

// Initialize Supabase client
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

export { supabase }; 