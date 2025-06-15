/**
 * Supabase Authentication Module
 * Consolidated implementation for Supabase client initialization and authentication
 * 
 * @version 1.0.1
 * @description Centralized Supabase client management to prevent duplicate implementations
 */

// UMD pattern for browser compatibility
(function(root, factory) {
  // Define the AuthStorage and STORAGE_KEYS here instead of importing
  const AuthStorage = {
    get: function(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error('Error getting from storage:', e);
        return null;
      }
    },
    set: function(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.error('Error setting to storage:', e);
        return false;
      }
    },
    remove: function(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.error('Error removing from storage:', e);
        return false;
      }
    }
  };
  
  const STORAGE_KEYS = {
    AUTH_TOKEN: 'trashdrop_auth_token',
    USER_DATA: 'trashdrop_user_data',
    SESSION_EXPIRES: 'trashdrop_session_expires'
  };
  
  root.SupabaseAuthManager = factory(AuthStorage, STORAGE_KEYS);
}(typeof self !== 'undefined' ? self : this, function(AuthStorage, STORAGE_KEYS) {

/**
 * SupabaseAuth - Singleton class for Supabase client management
 */
class SupabaseAuth {
  constructor() {
    this._client = null;
    this._config = null;
    this._isInitializing = false;
    this._initPromise = null;
    this._mockMode = false;
    
    // Bind methods to ensure 'this' context
    this.getClient = this.getClient.bind(this);
    this.initialize = this.initialize.bind(this);
    this._fetchConfig = this._fetchConfig.bind(this);
    this._createClient = this._createClient.bind(this);
    this._createMockClient = this._createMockClient.bind(this);
    this._loadSupabaseLibrary = this._loadSupabaseLibrary.bind(this);
  }
  
  /**
   * Get the Supabase client instance
   * @returns {Promise<Object>} - Supabase client
   */
  async getClient() {
    // Return existing client if available
    if (this._client) {
      return this._client;
    }
    
    // Initialize if not already done
    return this.initialize();
  }
  
  /**
   * Initialize Supabase client
   * @param {Object} options - Initialization options
   * @returns {Promise<Object>} - Supabase client
   */
  async initialize(options = {}) {
    // If already initializing, return existing promise
    if (this._isInitializing) {
      return this._initPromise;
    }
    
    // Set initializing flag
    this._isInitializing = true;
    
    // Create and store init promise
    this._initPromise = (async () => {
      try {
        console.log('[SupabaseAuth] Initializing Supabase client...');
        
        // Check for development mode
        this._mockMode = options.mockMode || 
                        (typeof window !== 'undefined' && 
                         window.location.hostname === 'localhost') ||
                        false;
                        
        if (this._mockMode) {
          console.log('[SupabaseAuth] Using mock client for development mode');
          this._client = await this._createMockClient();
          return this._client;
        }
        
        // Fetch configuration
        this._config = await this._fetchConfig();
        
        // Create client
        this._client = await this._createClient(this._config);
        
        console.log('[SupabaseAuth] Supabase client initialized successfully');
        return this._client;
      } catch (error) {
        console.error('[SupabaseAuth] Failed to initialize Supabase client:', error);
        
        // Handle initialization failure
        if (options.fallbackToMock) {
          console.log('[SupabaseAuth] Falling back to mock client');
          this._mockMode = true;
          this._client = await this._createMockClient();
          return this._client;
        }
        
        throw error;
      } finally {
        // Reset initializing flag
        this._isInitializing = false;
      }
    })();
    
    return this._initPromise;
  }
  
  /**
   * Fetch Supabase configuration from various sources
   * @private
   * @returns {Promise<Object>} - Supabase configuration
   */
  async _fetchConfig() {
    return new Promise(async (resolve, reject) => {
      // Create default config
      const config = {
        url: '',
        anonKey: '',
        options: {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
            storageKey: STORAGE_KEYS.SESSION
          }
        }
      };
      
      try {
        // 1. Try to get config from server endpoint
        try {
          const response = await fetch('/api/config/supabase');
          if (response.ok) {
            const serverConfig = await response.json();
            if (serverConfig.url) config.url = serverConfig.url;
            if (serverConfig.anonKey) config.anonKey = serverConfig.anonKey;
            console.log('[SupabaseAuth] Using server-provided configuration');
            resolve(config);
            return;
          }
        } catch (e) {
          console.warn('[SupabaseAuth] Failed to fetch server configuration:', e);
        }
        
        // 2. Try window.AppConfig
        if (typeof window !== 'undefined' && window.AppConfig) {
          try {
            await window.AppConfig.initialize();
            const appConfig = window.AppConfig.get('supabase');
            if (appConfig) {
              if (appConfig.url) config.url = appConfig.url;
              if (appConfig.anonKey) config.anonKey = appConfig.anonKey;
              console.log('[SupabaseAuth] Using AppConfig configuration');
              resolve(config);
              return;
            }
          } catch (e) {
            console.warn('[SupabaseAuth] Failed to get AppConfig:', e);
          }
        }
        
        // 3. Try meta tags
        if (typeof document !== 'undefined') {
          const urlMeta = document.querySelector('meta[name="supabase-url"]') || 
                        document.querySelector('meta[id="supabase-url"]');
          const url = urlMeta ? urlMeta.content || urlMeta.getAttribute('content') : null;
          
          const keyMeta = document.querySelector('meta[name="supabase-anon-key"]') || document.getElementById('supabase-anon-key');
          const key = keyMeta ? keyMeta.content || keyMeta.getAttribute('content') : null;
          
          if (url && key) {
            // Found in meta tags
            resolve({ url, key });
            return;
          }
          
          // Then check global variables
          if (window.SUPABASE_URL && window.SUPABASE_KEY) {
            resolve({ url: window.SUPABASE_URL, key: window.SUPABASE_KEY });
            return;
          }
          
          // Only use fallbacks in development
          if (window.location.hostname === 'localhost' || window.location.hostname.includes('ngrok')) {
            console.warn('Using environment-specific endpoint for Supabase configuration');
            // Try getting via API endpoint
            try {
              const response = await fetch('/api/config');
              if (response.ok) {
                const apiConfig = await response.json();
                if (apiConfig && apiConfig.supabase && apiConfig.supabase.url) {
                  console.log('Got Supabase config from API');
                  // Note: API only exposes the URL, not the key for security
                  // This is just for development - production should use proper env vars
                  resolve({
                    url: apiConfig.supabase.url,
                    key: 'dev-anon-key' // Safe dev placeholder - requires proper env setup
                  });
                  return;
                }
              }
            } catch (apiError) {
              console.warn('Failed to get config from API:', apiError);
            }
          }
        }
        
        // If we get here, we couldn't get the config
        reject(new Error('Could not find Supabase configuration'));
      } catch (error) {
        console.error('Error fetching Supabase configuration:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Create Supabase client using configuration
   * @private
   * @param {Object} config - Supabase configuration
   * @returns {Promise<Object>} - Supabase client
   */
  async _createClient(config) {
    // Validate configuration
    if (!config.url || !config.anonKey) {
      throw new Error('Invalid Supabase configuration: missing URL or anonymous key');
    }
    
    try {
      // Check if Supabase library is loaded
      if (typeof window === 'undefined' || !window.supabase) {
        // Try to load Supabase library
        await this._loadSupabaseLibrary();
      }
      
      // Verify Supabase is now available
      if (typeof window === 'undefined' || !window.supabase || !window.supabase.createClient) {
        throw new Error('Supabase library not available');
      }
      
      // Create client with configuration
      const client = window.supabase.createClient(
        config.url,
        config.anonKey,
        config.options || {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
            storageKey: STORAGE_KEYS.SESSION
          }
        }
      );
      
      // Verify client was created
      if (!client) {
        throw new Error('Failed to create Supabase client');
      }
      
      // Verify auth is available
      if (!client.auth) {
        throw new Error('Supabase client created, but auth is not available');
      }
      
      console.log('[SupabaseAuth] Supabase client created successfully');
      return client;
    } catch (error) {
      console.error('[SupabaseAuth] Error creating Supabase client:', error);
      throw error;
    }
  }

  /**
   * Create mock Supabase client for development
   * @private
   * @returns {Promise<Object>} - Mock Supabase client
   */
  async _createMockClient() {
    console.log('[SupabaseAuth] Creating mock Supabase client');
    
    // Create a mock user
    const mockUser = {
      id: 'mock-user-id',
      email: 'dev@trashdrop.com',
      user_metadata: {
        name: 'Development User',
        role: 'user'
      }
    };
    
    // Create a mock session
    const mockSession = {
      user: mockUser,
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };
    
    // Store mock session
    if (window.localStorage) {
      window.localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(mockSession));
      window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
    }
    
    // Create mock auth module
    const mockAuth = {
      user: mockUser,
      session: mockSession,
      
      // Auth methods
      getSession: async () => ({ data: { session: mockSession }, error: null }),
      getUser: async () => ({ data: { user: mockUser }, error: null }),
      signIn: async () => ({ data: { session: mockSession, user: mockUser }, error: null }),
      signUp: async () => ({ data: { user: mockUser, session: mockSession }, error: null }),
      signOut: async () => {
        if (window.localStorage) {
          window.localStorage.removeItem(STORAGE_KEYS.SESSION);
          window.localStorage.removeItem(STORAGE_KEYS.USER);
        }
        return { error: null };
      }
    };
    
    // Create mock database module with common tables
    const createMockTable = (tableName) => ({
      select: () => ({
        eq: () => ({ data: [], error: null }),
        neq: () => ({ data: [], error: null }),
        match: () => ({ data: [], error: null })
      }),
      insert: () => ({ data: { id: 'mock-id' }, error: null }),
      update: () => ({ data: { id: 'mock-id' }, error: null }),
      delete: () => ({ data: {}, error: null })
    });
    
    // Create the mock client
    return {
      auth: mockAuth,
      from: (table) => createMockTable(table),
      storage: {
        from: (bucket) => ({
          upload: () => ({ data: { path: 'mock-path' }, error: null }),
          download: () => ({ data: new Blob(), error: null }),
          list: () => ({ data: [], error: null })
        })
      }
    };
  }
  
  /**
   * Load Supabase client library
   * @private
   * @returns {Promise<void>}
   */
  async _loadSupabaseLibrary() {
    if (typeof window === 'undefined') {
      throw new Error('Cannot load Supabase in non-browser environment');
    }
    
    if (window.supabase) {
      return;
    }
    
    console.log('[SupabaseAuth] Loading Supabase client library');
    
    return new Promise((resolve, reject) => {
      // Create script element
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.js';
      script.async = true;
      
      // Handle loading events
      script.onload = () => {
        console.log('[SupabaseAuth] Supabase client library loaded');
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('[SupabaseAuth] Failed to load Supabase client library:', error);
        reject(new Error('Failed to load Supabase client library'));
      };
      
      // Add to document
      document.head.appendChild(script);
    });
  }
  
  /**
   * Get current session and user (if available)
   * @returns {Promise<Object>} - Session object or null
   */
  async getSession() {
    const client = await this.getClient();
    if (!client || !client.auth) {
      throw new Error('Supabase client not initialized');
    }
    
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('[SupabaseAuth] Error getting session:', error);
      return null;
    }
  }
  
  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    try {
      const session = await this.getSession();
      return !!session;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Authentication result
   */
  async signInWithEmail(email, password) {
    const client = await this.getClient();
    if (!client || !client.auth) {
      throw new Error('Supabase client not initialized');
    }
    
    try {
      // Handle different versions of Supabase API
      // New versions use signInWithPassword, older ones use signIn
      let result;
      
      if (typeof client.auth.signInWithPassword === 'function') {
        // New Supabase version
        result = await client.auth.signInWithPassword({
          email,
          password
        });
      } else if (typeof client.auth.signIn === 'function') {
        // Older Supabase version
        result = await client.auth.signIn({
          email,
          password
        });
      } else {
        // Fallback attempt for other API variations
        console.warn('[SupabaseAuth] Unable to find standard auth methods, attempting alternate format');
        
        // Try direct method on auth object
        if (typeof client.auth.signInWithEmail === 'function') {
          result = await client.auth.signInWithEmail(email, password);
        } else {
          throw new Error('No compatible authentication method found in Supabase client');
        }
      }
      
      const { data, error } = result || {};
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[SupabaseAuth] Sign in error:', error);
      return { success: false, error: error.message || 'Authentication failed' };
    }
  }
}

// Create singleton instance
const supabaseAuth = new SupabaseAuth();

// Return the singleton for UMD pattern
return supabaseAuth;

})); // End of UMD pattern
