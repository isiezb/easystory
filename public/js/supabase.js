import { configPromise } from './config.js';

let supabaseClient = null;

// Initialize Supabase client
const initSupabase = async () => {
    if (!supabaseClient) {
        const config = await configPromise;
        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    }
    return supabaseClient;
};

export const supabase = {
    async getClient() {
        return await initSupabase();
    }
}; 