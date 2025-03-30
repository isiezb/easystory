import { configPromise } from './config.js';

let supabaseClient = null;

const initSupabase = async () => {
    if (supabaseClient) return supabaseClient;
    
    const config = await configPromise;
    const { supabaseUrl, supabaseKey } = config;
    
    if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase configuration missing, some features may be limited');
        // Return a mock client that doesn't do anything
        return {
            auth: {
                getSession: async () => ({ data: { session: null } }),
                signUp: async () => ({ data: null, error: new Error('Supabase not configured') }),
                signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
                signInWithOAuth: async () => ({ data: null, error: new Error('Supabase not configured') }),
                signOut: async () => ({ error: new Error('Supabase not configured') })
            }
        };
    }

    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
};

export const supabasePromise = initSupabase();

export const supabase = {
    auth: {
        getSession: async () => {
            const client = await supabasePromise;
            return client.auth.getSession();
        }
    }
}; 