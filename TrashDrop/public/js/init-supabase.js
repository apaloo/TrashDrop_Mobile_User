/**
 * Supabase Initialization Script (Adapter)
 * Uses the consolidated Supabase authentication module
 * Maintained for backward compatibility
 * @version 2.0.0
 */

console.log('[SUPABASE] Initializing Supabase using consolidated auth module...');

// Load the consolidated auth module
function loadAuthModule() {
    // Check if authLoader is already loaded
    if (window.SupabaseAuthLoader) {
        console.log('[SUPABASE] Auth module loader already present');
        return Promise.resolve(window.SupabaseAuthLoader);
    }
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/auth/supabase-auth-loader.js';
        script.async = true;
        
        script.onload = () => {
            if (window.SupabaseAuthLoader) {
                console.log('[SUPABASE] Auth module loader loaded successfully');
                resolve(window.SupabaseAuthLoader);
            } else {
                const err = new Error('Auth loader script loaded but SupabaseAuthLoader not defined');
                console.error('[SUPABASE]', err);
                reject(err);
            }
        };
        
        script.onerror = (err) => {
            console.error('[SUPABASE] Failed to load auth module loader:', err);
            reject(new Error('Failed to load auth module loader'));
        };
        
        document.head.appendChild(script);
    });
}

// Main initialization function - adapter for the new consolidated auth module
async function initSupabase() {
    try {
        // Check if already initialized
        if (window.supabase) {
            console.log('[SUPABASE] Already initialized');
            return window.supabase;
        }
        
        console.log('[SUPABASE] Starting initialization with consolidated auth module...');
        
        // Load the consolidated auth module
        const authLoader = await loadAuthModule();
        
        // Initialize using the consolidated auth module
        const client = await authLoader.getClient();
        
        // Store reference to maintain backward compatibility
        window.supabase = client;
        
        // Set a flag to indicate Supabase is ready
        window.supabaseReady = true;
        
        // Dispatch ready event for compatibility
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
        console.error('❌ [SUPABASE] Initialization failed:', error);
        
        // Try to get a mock client from the auth module
        try {
            const authLoader = await loadAuthModule();
            await authLoader.initialize({ mockMode: true, fallbackToMock: true });
            const mockClient = await authLoader.getClient();
            window.supabase = mockClient;
            
            // Dispatch ready event with mock client
            document.dispatchEvent(new CustomEvent('supabase:ready', {
                detail: { 
                    client: mockClient,
                    isMock: true,
                    error: error.message
                }
            }));
            
            // Mark as ready
            window.supabaseReady = true;
            
            return mockClient;
        } catch (mockError) {
            console.error('[SUPABASE] Failed to create mock client:', mockError);
            throw error; // Re-throw the original error
        }
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

// Also export for ESM modules
if (typeof window !== 'undefined') {
    window.initSupabase = initSupabase;
}
