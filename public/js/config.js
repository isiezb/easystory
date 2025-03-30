// Configuration
const config = {
    // Use values from window._env_ or fallback to defaults
    serverUrl: window._env_?.SERVER_URL || window.location.origin,
    supabaseUrl: window._env_?.SUPABASE_URL || '',
    supabaseKey: window._env_?.SUPABASE_KEY || '',
    
    // Other configuration
    maxRetries: 3,
    retryDelay: 1000,
    defaultWordCount: 500,
    maxWordCount: 2000,
    
    // Always use real data in production
    useMockData: false
};

// Log config without sensitive data
console.log('Config initialized:', {
    serverUrl: config.serverUrl,
    useMockData: config.useMockData,
    maxRetries: config.maxRetries,
    retryDelay: config.retryDelay,
    defaultWordCount: config.defaultWordCount,
    maxWordCount: config.maxWordCount
});

// Validate required environment variables
if (!config.serverUrl) {
    console.error('SERVER_URL is not configured');
}

// Make config globally available
window._config = config; 