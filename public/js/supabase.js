// Initialize Supabase client
const supabaseUrl = window._env_?.SUPABASE_URL;
const supabaseKey = window._env_?.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
}

export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey); 