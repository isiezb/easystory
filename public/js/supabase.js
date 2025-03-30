import { config } from './config.js';

let supabaseClient = null;

try {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    } else {
        console.warn('Supabase not loaded. Please check if the script is properly loaded.');
    }
} catch (error) {
    console.error('Error initializing Supabase:', error);
}

export const supabase = supabaseClient; 