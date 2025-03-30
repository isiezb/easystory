import { configPromise } from './config.js';

let supabaseClient = null;

const initSupabase = async () => {
    if (supabaseClient) return supabaseClient;
    
    const config = await configPromise;
    const { supabaseUrl, supabaseKey } = config;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase configuration:', { supabaseUrl, supabaseKey });
        throw new Error('Missing Supabase configuration');
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