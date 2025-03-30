import { config } from './config.js';

// Validate Supabase URL
const supabaseUrl = config.supabaseUrl?.trim();
const supabaseKey = config.supabaseKey?.trim();

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration is missing');
    throw new Error('Supabase configuration is missing');
}

// Validate URL format
try {
    new URL(supabaseUrl);
} catch (error) {
    console.error('Invalid Supabase URL:', supabaseUrl);
    throw new Error('Invalid Supabase URL format');
}

// Validate key format (should be a JWT)
if (!/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(supabaseKey)) {
    console.error('Invalid Supabase key format');
    throw new Error('Invalid Supabase key format');
}

// Initialize Supabase client with error handling
let supabase;
try {
    if (!window.supabase) {
        throw new Error('Supabase client library not loaded');
    }
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
} catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw new Error('Failed to initialize Supabase client');
}

export { supabase }; 