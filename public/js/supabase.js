import { config } from './config.js';

if (!window.supabase) {
    throw new Error('Supabase client library not loaded');
}

export const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey); 