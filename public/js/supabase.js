// Initialize Supabase client
(function() {
    try {
        if (typeof window.supabase === 'undefined') {
            // Supabase is not available in window, check if the createClient function is available
            if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
                // Create a mock client for development
                console.log('Creating Supabase client from global supabase object');
                window.supabase = supabase.createClient(
                    window._env_?.SUPABASE_URL || '',
                    window._env_?.SUPABASE_KEY || '',
                    {
                        auth: {
                            autoRefreshToken: true,
                            persistSession: true,
                            detectSessionInUrl: true
                        }
                    }
                );
                console.log('Supabase client initialized successfully from global object');
            } else {
                // Create a mock client
                console.warn('Supabase not loaded. Creating mock client.');
                
                window.supabase = {
                    _isMockClient: true,
                    auth: {
                        // Session access - both direct and via method
                        session: null,
                        getSession: async () => ({
                            data: { session: null },
                            error: null
                        }),
                        // Auth state changes
                        onAuthStateChange: (callback) => {
                            console.log('Auth state change listener registered, but supabase not loaded');
                            return { data: { subscription: { unsubscribe: () => {} } } };
                        },
                        // Auth actions
                        signOut: async () => ({ error: null }),
                        signInWithPassword: async () => ({ 
                            error: { message: 'Supabase not initialized' } 
                        }),
                        // For compatibility with both API versions
                        getUser: async () => ({
                            data: { user: null },
                            error: null
                        }),
                        // For older versions
                        user: () => null
                    },
                    from: () => ({
                        insert: () => ({
                            select: () => ({
                                single: () => Promise.resolve({ data: null, error: { message: 'Supabase not initialized' } })
                            })
                        }),
                        select: () => Promise.resolve({ data: [], error: null })
                    })
                };
                console.log('Mock Supabase client created');
            }
        } else {
            console.log('Supabase client already available in window');
        }
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        // Create a mock client for error case
        window.supabase = {
            _isMockClient: true,
            auth: {
                // Session access - both direct and via method
                session: null,
                getSession: async () => ({
                    data: { session: null },
                    error: null
                }),
                // Auth state changes
                onAuthStateChange: () => ({
                    data: { subscription: { unsubscribe: () => {} } }
                }),
                // For compatibility with both API versions
                getUser: async () => ({
                    data: { user: null },
                    error: null
                }),
                // For older versions
                user: () => null
            }
        };
        console.log('Mock Supabase client created after error');
    }
})(); 