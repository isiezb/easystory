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
    
    // Development mode settings
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    useMockData: false
};

// Enable mock data in development mode
if (config.isDevelopment) {
    config.useMockData = true;
    console.log('Development mode enabled, using mock data');
}

// Log config without sensitive data
console.log('Config initialized:', {
    serverUrl: config.serverUrl,
    isDevelopment: config.isDevelopment,
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