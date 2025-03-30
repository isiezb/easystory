// Initialize Supabase client
let supabaseClient = null;

function initSupabase() {
    try {
        if (window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(
                window._config.supabaseUrl,
                window._config.supabaseKey,
                {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                }
            );
            console.log('Supabase client initialized successfully');
        } else {
            console.warn('Supabase not loaded. Please check if the script is properly loaded.');
        }
    } catch (error) {
        console.error('Error initializing Supabase:', error);
    }
}

// Initialize when the script loads
initSupabase();

// Make supabase client globally available
window.supabase = supabaseClient; 