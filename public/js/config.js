import { env } from './env.js';

// Wait for window._env_ to be initialized
const waitForEnv = () => {
    return new Promise((resolve) => {
        if (window._env_) {
            resolve(window._env_);
        } else {
            const checkEnv = () => {
                if (window._env_) {
                    resolve(window._env_);
                } else {
                    setTimeout(checkEnv, 100);
                }
            };
            checkEnv();
        }
    });
};

// Initialize configuration
const initConfig = async () => {
    const env = await waitForEnv();
    
    // Validate and format URLs
    const serverUrl = env.SERVER_URL?.trim() || window.location.origin;
    const supabaseUrl = env.SUPABASE_URL?.trim() || '';
    const supabaseKey = env.SUPABASE_KEY?.trim() || '';

    // Log configuration (without sensitive data)
    console.log('Configuration:', {
        hasServerUrl: !!serverUrl,
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey
    });

    const config = {
        serverUrl,
        supabaseUrl,
        supabaseKey,
        openRouterKey: env.OPENROUTER_KEY,
        openRouterModel: 'openai/gpt-4-turbo-preview',
        maxRetries: 3,
        retryDelay: 1000,
        storyTimeout: 60000, // 60 seconds
        maxWordCount: 5000,
        minWordCount: 100
    };

    // Validate required environment variables
    if (!config.serverUrl) {
        console.error('SERVER_URL is not configured');
        throw new Error('SERVER_URL is not configured');
    }

    return config;
};

// Export a promise that resolves to the config
export const configPromise = initConfig();

// Export a default config object for synchronous access
export const config = {
    serverUrl: env.SERVER_URL,
    supabaseUrl: env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_KEY
};

// Make config globally available
window._config = config; 