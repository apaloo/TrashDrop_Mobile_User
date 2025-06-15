/**
 * Supabase Configuration (Using Consolidated Auth Module)
 * This file provides backward compatibility for code that relies
 * on supabase-config.js, but now uses the consolidated auth module
 * @version 2.0.0
 */

// Load the auth module script
function loadAuthModule() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.SupabaseAuthLoader) {
      resolve(window.SupabaseAuthLoader);
      return;
    }
    
    // If auth module loader not available, load it
    console.log('[supabase-config] Loading auth module loader...');
    const script = document.createElement('script');
    script.src = '/js/auth/supabase-auth-loader.js';
    script.async = true;
    
    script.onload = () => {
      if (window.SupabaseAuthLoader) {
        console.log('[supabase-config] Auth module loader loaded successfully');
        resolve(window.SupabaseAuthLoader);
      } else {
        reject(new Error('Auth module loader script loaded but SupabaseAuthLoader not defined'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load auth module loader'));
    };
    
    document.head.appendChild(script);
  });
}

// Configuration object populated from auth module
let config = {
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

// Fetch configuration - now using the auth module's config
async function fetchConfig() {
  try {
    // Try to load the auth module first
    const authLoader = await loadAuthModule();
    
    // Get config from the auth module
    const authConfig = await authLoader.getConfig();
    
    if (authConfig && authConfig.url && authConfig.anonKey) {
      config = {
        url: authConfig.url,
        anonKey: authConfig.anonKey,
        options: authConfig.options || config.options
      };
      
      console.log('[supabase-config] Config loaded from auth module');
      return config;
    }
    
    // If we couldn't get config from auth module, try server API
    console.log('[supabase-config] Trying to fetch config from server API...');
    const response = await fetch('/api/config/supabase');
    
    if (!response.ok) {
      throw new Error('Failed to fetch Supabase config');
    }
    
    const serverConfig = await response.json();
    
    config = {
      ...config,
      url: serverConfig.url || config.url,
      anonKey: serverConfig.anonKey || config.anonKey,
      options: {
        ...config.options,
        ...(serverConfig.options || {})
      }
    };
    
    return config;
  } catch (error) {
    console.error('[supabase-config] Error loading config:', error);
    return config;
  }
}

// Initialize Supabase client - now delegates to the auth module
async function initializeSupabase() {
  try {
    // Try to load the auth module
    const authLoader = await loadAuthModule();
    
    // Initialize the auth module
    await authLoader.initialize();
    
    // Get the client from the auth module
    const client = await authLoader.getClient();
    
    // For backward compatibility
    window.supabase = client;
    
    // Also update our config object
    const authConfig = await authLoader.getConfig();
    if (authConfig) {
      config = {
        url: authConfig.url,
        anonKey: authConfig.anonKey,
        options: authConfig.options || config.options
      };
    }
    
    console.log('✅ [supabase-config] Client initialized successfully via auth module');
    return client;
  } catch (error) {
    console.error('❌ [supabase-config] Error initializing client:', error);
    
    // Try to get a mock client
    try {
      const authLoader = await loadAuthModule();
      await authLoader.initialize({ mockMode: true, fallbackToMock: true });
      const mockClient = await authLoader.getClient();
      window.supabase = mockClient;
      console.warn('⚠️ [supabase-config] Using mock client from auth module');
      return mockClient;
    } catch (mockError) {
      console.error('❌ [supabase-config] Failed to create mock client:', mockError);
      throw error; // Re-throw the original error
    }
  }
}

// Validate configuration - for backward compatibility
function validateConfig() {
  if (!config.url || !config.anonKey) {
    console.error('❌ [supabase-config] Missing Supabase URL or anon key');
    return false;
  }
  
  console.log('✓ [supabase-config] Configuration validated');
  return true;
}

// Export configuration for backward compatibility
Object.defineProperty(window, 'supabaseConfig', {
  get: function() {
    return config;
  },
  configurable: true
});

// Initialize Supabase asynchronously
(function() {
  let initialized = false;
  
  async function onload() {
    try {
      // Now just rely on our consolidated auth module
      await initializeSupabase();
      initialized = true;
    } catch (error) {
      console.error('❌ [supabase-config] Error during initialization:', error);
      // Still consider this initialized to avoid endless retries
      initialized = true;
    }
  }
  
  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onload);
  } else {
    onload();
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

// Fallback: Check periodically for just a short time
const checkInterval = setInterval(() => {
  if (initialized) {
    clearInterval(checkInterval);
    return;
  }
  
  // If we see that supabase client exists now
  if (window.supabase || window.SupabaseAuthManager) {
    console.log('✓ [supabase-config] Supabase client discovered');
    clearInterval(checkInterval);
    initialized = true;
  }
}, 1000); // Check every second

// Stop checking after a short timeout
setTimeout(() => {
  if (!initialized) {
    clearInterval(checkInterval);
    console.error('❌ [supabase-config] Timed out waiting for Supabase initialization');
    window.dispatchEvent(new CustomEvent('supabaseInitFailed'));
    
    // Last attempt to initialize
    initializeSupabase().catch(console.error);
  }
}, 5000); // 5 seconds timeout

// Export for ESM modules
if (typeof window !== 'undefined') {
  window.initializeSupabase = initializeSupabase;
  window.fetchSupabaseConfig = fetchConfig;
}
const checkInterval = setInterval(() => {
  if (typeof supabase !== 'undefined') {
    clearInterval(checkInterval);
    console.log('Supabase SDK loaded (fallback), initializing...');
    initializeSupabase();
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
