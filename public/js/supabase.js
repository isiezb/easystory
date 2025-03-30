import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

if (!config.supabaseUrl || !config.supabaseKey) {
    console.warn('Missing Supabase configuration. Some features may not work.');
}

export const supabase = createClient(
    config.supabaseUrl || '',
    config.supabaseKey || '',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);

// Make supabase globally available
window.supabase = supabase; 