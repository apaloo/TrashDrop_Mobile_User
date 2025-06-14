/**
 * Supabase Configuration
 * This file contains the Supabase client configuration
 */

// Default configuration (will be overridden by server config)
const defaultConfig = {
  url: '',
  anonKey: '',
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }
};

// Configuration object (will be populated by fetchConfig)
let config = { ...defaultConfig };

// Fetch configuration from the server
async function fetchConfig() {
  try {
    const response = await fetch('/api/config/supabase');
    if (!response.ok) {
      throw new Error('Failed to fetch Supabase config');
    }
    const serverConfig = await response.json();
    
    // Merge server config with defaults
    config = {
      ...defaultConfig,
      url: serverConfig.url || defaultConfig.url,
      anonKey: serverConfig.anonKey || defaultConfig.anonKey,
      options: {
        ...defaultConfig.options,
        ...(serverConfig.options || {})
      }
    };
    
    return config;
  } catch (error) {
    console.error('Error loading Supabase config:', error);
    // Fall back to default config if server fetch fails
    return defaultConfig;
  }
}

// Create a mock Supabase client for fallback
function createMockSupabaseClient() {
  console.warn('⚠️ Using mock Supabase client - authentication will not work');
  return {
    auth: {
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: 'Mock client - authentication disabled' } }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Mock client - registration disabled' } }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: (callback) => {
        // Simulate auth state change
        setTimeout(() => callback('SIGNED_OUT', null), 100);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null })
    }
  };
}

// Initialize Supabase client
async function initializeSupabase() {
  try {
    // First try to fetch the config from our server
    await fetchConfig();
    
    // Then validate the config we received
    if (validateConfig()) {
      const { createClient } = window.supabase || {};
      if (createClient) {
        window.supabase = createClient(config.url, config.anonKey, config.options);
        console.log('✅ Supabase client initialized successfully');
        return window.supabase;
      }
    }
    
    // Fall back to mock client if anything fails
    console.warn('⚠️ Falling back to mock Supabase client');
    window.supabase = createMockSupabaseClient();
    return window.supabase;
  } catch (error) {
    console.error('❌ Error initializing Supabase client:', error);
    window.supabase = createMockSupabaseClient();
    return window.supabase;
  }
}

// Validate configuration
function validateConfig() {
  if (!config.url || !config.anonKey) {
    console.error('❌ Missing Supabase URL or anon key');
    return false;
  }
  
  if (!config.url.startsWith('http')) {
    console.error('❌ Invalid Supabase URL:', config.url);
    return false;
  }
  
  if (config.anonKey.length < 20) { // Basic validation for anon key
    console.error('❌ Invalid Supabase anon key');
    return false;
  }
  
  return true;
}

// Export configuration
window.supabaseConfig = config;

// Initialize Supabase asynchronously
(async () => {
  try {
    await initializeSupabase();
    
    // Dispatch an event when Supabase is ready
    const event = new Event('supabase:ready');
    window.dispatchEvent(event);
    
    console.log('🚀 Supabase initialization complete');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    window.supabase = createMockSupabaseClient();
  }
})();

// For backward compatibility
const script = document.querySelector('script[src*="supabase"]');
if (script && !script.onload) {
  script.onload = () => {
    console.log('Supabase SDK loaded, initializing...');
    if (typeof initializeSupabase === 'function') {
      initializeSupabase().catch(console.error);
    }
  };
}
    }
    
    // Fallback: Check periodically
    const checkInterval = setInterval(() => {
      if (typeof supabase !== 'undefined') {
        clearInterval(checkInterval);
        console.log('Supabase SDK loaded (fallback), initializing...');
        initializeSupabase();
      }
    }, 100);
    
    // Final fallback: Use mock client if Supabase doesn't load
    setTimeout(() => {
      if (!window.supabase) {
        clearInterval(checkInterval);
        console.warn('Supabase SDK not loaded after timeout, using mock client');
        window.supabase = createMockSupabaseClient();
      }
    }, 5000);
  }
} else {
  console.warn('Using mock client due to configuration issues');
  window.supabase = createMockSupabaseClient();
}

// Export for ES modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    supabase: window.supabase, 
    supabaseConfig: window.supabaseConfig,
    initialize: initializeSupabase,
    isMock: window.supabase?.auth?.constructor?.name === 'MockAuthClient'
  };
}

window.supabaseReady = Promise.resolve(window.supabase);
