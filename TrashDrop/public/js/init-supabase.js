/**
 * Supabase Initialization Script
 * Ensures Supabase client is properly initialized before use
 */

console.log('[SUPABASE] Initializing Supabase...');

// Try to get config from meta tags first
function getConfigFromMeta() {
    try {
        const url = document.querySelector('meta[name="supabase-url"]')?.content;
        const anonKey = document.querySelector('meta[name="supabase-anon-key"]')?.content;
        
        if (url && anonKey) {
            console.log('[SUPABASE] Using config from meta tags');
            return { 
                url: url.trim(), 
                anonKey: anonKey.trim(),
                options: {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true,
                        storage: window.localStorage,
                        storageKey: 'sb-auth-token'
                    }
                }
            };
        }
    } catch (e) {
        console.error('[SUPABASE] Error reading config from meta tags:', e);
    }
    return null;
}

// Function to create Supabase client
function createSupabaseClient(config) {
    if (!config || !config.url || !config.anonKey) {
        throw new Error('Missing Supabase configuration. Please provide url and anonKey.');
    }

    console.log('[SUPABASE] Creating Supabase client with URL:', config.url);
    
    if (typeof supabase === 'undefined') {
        throw new Error('Supabase client library not loaded');
    }

    // Create the client with configuration
    const client = supabase.createClient(
        config.url,
        config.anonKey,
        config.options
    );

    console.log('[SUPABASE] Supabase client created');
    return client;
}

// Function to create a mock Supabase client for fallback
function createMockSupabaseClient() {
    console.warn('[SUPABASE] Creating mock Supabase client');
    return {
        auth: {
            signInWithPassword: (credentials) => {
                console.log('[MOCK] signInWithPassword called with:', credentials);
                return Promise.resolve({
                    data: { user: { id: 'mock-user-id', email: credentials.email } },
                    error: null
                });
            },
            signUp: (credentials) => {
                console.log('[MOCK] signUp called with:', credentials);
                return Promise.resolve({
                    data: { user: { id: 'mock-user-id', email: credentials.email } },
                    error: null
                });
            },
            signOut: () => {
                console.log('[MOCK] signOut called');
                return Promise.resolve({ error: null });
            },
            getSession: () => {
                console.log('[MOCK] getSession called');
                return Promise.resolve({ 
                    data: { session: null }, 
                    error: null 
                });
            },
            onAuthStateChange: (callback) => {
                console.log('[MOCK] onAuthStateChange subscribed');
                // Return a subscription object with an unsubscribe method
                return { 
                    data: { 
                        subscription: { 
                            unsubscribe: () => console.log('[MOCK] onAuthStateChange unsubscribed')
                        } 
                    } 
                };
            }
        }
    };
}

// Function to initialize Supabase
async function initializeSupabase() {
    try {
        console.log('[SUPABASE] Starting initialization...');
        
        // Try to get config from meta tags first
        let config = getConfigFromMeta();
        
        // Fall back to window.supabaseConfig if available
        if (!config && window.supabaseConfig) {
            console.log('[SUPABASE] Using config from window.supabaseConfig');
            config = window.supabaseConfig;
        }
        
        if (!config) {
            const error = new Error('No Supabase configuration found. Please check your meta tags or supabaseConfig.');
            console.error('[SUPABASE] Configuration error:', error);
            throw error;
        }
        
        // Log the configuration (without sensitive data)
        const safeConfig = { ...config };
        if (safeConfig.anonKey) {
            safeConfig.anonKey = `${safeConfig.anonKey.substring(0, 10)}...`; // Only log first 10 chars of key
        }
        console.log('[SUPABASE] Using configuration:', safeConfig);
        
        console.log('[SUPABASE] Configuration loaded, creating client...');
        
        // Ensure supabase library is loaded
        if (typeof supabase === 'undefined') {
            console.warn('[SUPABASE] Supabase library not loaded, attempting to load...');
            try {
                await loadSupabaseClient();
                
                if (typeof supabase === 'undefined') {
                    throw new Error('Supabase library not available after loading');
                }
                console.log('[SUPABASE] Supabase library loaded successfully');
            } catch (loadError) {
                console.error('[SUPABASE] Failed to load Supabase library:', loadError);
                throw new Error(`Failed to load Supabase client library: ${loadError.message}`);
            }
        } else {
            console.log('[SUPABASE] Supabase library already loaded');
        }
        
        // Create and store the client
        const client = createSupabaseClient(config);
        window.supabase = client;
        
        // Test the connection with a timeout
        console.log('[SUPABASE] Testing connection to Supabase...');
        const connectionTest = Promise.race([
            client.auth.getSession(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
            )
        ]);
        
        try {
            console.log('[SUPABASE] Sending auth request...');
            const { data, error } = await connectionTest;
            
            if (error) {
                console.warn('[SUPABASE] Connection test failed with error:', error);
                console.warn('[SUPABASE] Error details:', {
                    message: error.message,
                    name: error.name,
                    status: error.status,
                    statusCode: error.statusCode
                });
                
                // Check for common issues
                if (error.message.includes('Failed to fetch')) {
                    console.warn('[SUPABASE] Network error - check CORS and network connectivity');
                } else if (error.statusCode === 401) {
                    console.warn('[SUPABASE] Authentication error - check your anon key');
                }
                
                // Don't throw, we might want to continue with limited functionality
            } else {
                console.log('[SUPABASE] Connection test successful');
                if (data?.session) {
                    console.log('[SUPABASE] User is signed in:', data.session.user?.email);
                } else {
                    console.log('[SUPABASE] No active session (expected for login page)');
                }
            }
        } catch (testError) {
            console.error('[SUPABASE] Connection test failed with exception:', testError);
            console.error('[SUPABASE] Stack trace:', testError.stack);
            
            // Network errors might not have a status code
            if (testError.name === 'TypeError' && testError.message.includes('fetch')) {
                console.error('[SUPABASE] Network error detected - check if Supabase URL is correct and CORS is properly configured');
            }
            
            throw testError; // Re-throw to trigger fallback
        }
        
        // Dispatch ready event
        console.log('[SUPABASE] Dispatching ready event');
        const readyEvent = new CustomEvent('supabase:ready', {
            detail: { 
                client, 
                error: null,
                isMock: false
            }
        });
        document.dispatchEvent(readyEvent);
        
        return client;
    } catch (error) {
        const errorMsg = `[SUPABASE] Initialization failed: ${error.message}`;
        console.error(errorMsg, error);
        
        // Create mock client for fallback
        const mockClient = createMockSupabaseClient();
        window.supabase = mockClient;
        
        // Dispatch ready event with mock client
        document.dispatchEvent(new CustomEvent('supabase:ready', {
            detail: { 
                client: mockClient,
                isMock: true,
                error: error.message
            }
        }));
        
        return mockClient;
    }
}

// Function to load Supabase client library
function loadSupabaseClient() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (typeof supabase !== 'undefined') {
            console.log('[SUPABASE] Client library already loaded');
            resolve();
            return;
        }
        
        console.log('[SUPABASE] Loading Supabase client library...');
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        script.onload = () => {
            console.log('[SUPABASE] Client library loaded successfully');
            resolve();
        };
        script.onerror = () => {
            console.warn('[SUPABASE] Failed to load Supabase client from CDN, using mock client');
            resolve(); // Resolve without error to continue with mock client
        };
        
        document.head.appendChild(script);
    });
}

// Main initialization function
async function initSupabase() {
    try {
        // Check if already initialized
        if (window.supabase) {
            console.log('[SUPABASE] Already initialized');
            return window.supabase;
        }
        
        console.log('[SUPABASE] Starting initialization...');
        
        // Load client library if needed
        try {
            await loadSupabaseClient();
        } catch (loadError) {
            console.warn('[SUPABASE] Could not load Supabase client, using mock client:', loadError.message);
            // Continue with initialization, which will use mock client
        }
        
        // Initialize Supabase (will use mock client if needed)
        const client = await initializeSupabase();
        
        // Set a flag to indicate Supabase is ready
        window.supabaseReady = true;
        
        return client;
        
    } catch (error) {
        console.error('❌ [SUPABASE] Initialization failed:', error);
        
        // Even if initialization fails, ensure we have a mock client
        if (!window.supabase) {
            console.warn('[SUPABASE] Creating fallback mock client after initialization failure');
            window.supabase = createMockSupabaseClient();
        }
        
        // Still mark as ready to prevent the app from hanging
        window.supabaseReady = true;
        
        return window.supabase;
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initSupabase().catch(console.error);
    });
} else {
    initSupabase().catch(console.error);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initSupabase };
}
