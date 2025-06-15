/*
  Supabase Client Module
  Adapted to use the consolidated Supabase authentication utility module
  
  This module centralizes the Supabase client so that all services share a single
  instance provided by our consolidated authentication utility.

  Usage:
    import supabase from './supabaseClient.js';
    const { data, error } = await supabase.from('profiles').select('*');
*/

// Use dynamic import for the consolidated auth module
const moduleUrl = new URL('/js/auth/utils/supabase-auth-unified.js', window.location.origin);

// Client promise to allow async initialization but synchronous module export
let clientPromise = null;

/**
 * Initialize the client asynchronously
 * This will happen automatically when the module is imported
 */
async function initializeClient() {
  try {
    console.log('[supabaseClient] Loading consolidated auth module from:', moduleUrl.href);
    const { SupabaseAuthManager } = await import(moduleUrl.href);
    
    // Get the singleton instance
    const authManager = SupabaseAuthManager.getInstance();
    await authManager.initialize();
    
    // Get the client from our utility
    return authManager.getClient();
  } catch (error) {
    console.error('[supabaseClient] Error initializing client:', error);
    throw error;
  }
}

// Start initialization immediately
clientPromise = initializeClient();

// This is a proxy that will wait for the client to be ready before operations
const supabaseProxy = new Proxy({}, {
  get(target, prop) {
    // Handle special cases
    if (prop === 'then' || prop === 'catch' || prop === 'finally') {
      // If someone tries to await or Promise.resolve(supabase), return the promise
      return clientPromise[prop].bind(clientPromise);
    }
    
    // For everything else, return a function that gets the client first
    return async (...args) => {
      try {
        const client = await clientPromise;
        if (!client) throw new Error('Supabase client initialization failed');
        
        // If this prop is a method on the client
        if (typeof client[prop] === 'function') {
          return client[prop](...args);
        }
        
        // If this prop is a property or object on the client (like .auth or .from)
        return client[prop];
      } catch (error) {
        console.error(`[supabaseClient] Error in operation ${prop}:`, error);
        throw error;
      }
    };
  }
});

// Export the proxy as the default export
export default supabaseProxy;
