/**
 * Authentication Module for TrashDrop
 * Handles Supabase initialization and authentication methods
 */

// Use an IIFE to create a private scope
(function() {
  'use strict';
  
  // Track initialization state
  let isInitialized = false;
  let isInitializing = false;
  const initCallbacks = [];
  let initError = null;
  
  // Configuration
  const config = {
    url: 'https://cpeyavpxqcloupolbvyh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZXlhdnB4cWNsb3Vwb2xidnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTY4OTYsImV4cCI6MjA2MTA3Mjg5Nn0.5rxsiRuLHCpeJZ5TqoIA5X4UwoAAuxIpNu_reafwwbQ',
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  };

  /**
   * Create a mock Supabase client for fallback
   * @returns {object} Mock Supabase client
   */
  function createMockSupabaseClient() {
    console.warn('[AUTH] Using mock Supabase client');
    return {
      auth: {
        signInWithPassword: () => Promise.resolve({ error: new Error('Not implemented') }),
        signUp: () => Promise.resolve({ error: new Error('Not implemented') }),
        signOut: () => Promise.resolve({ error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        resetPasswordForEmail: () => Promise.resolve({ error: new Error('Not implemented') })
      }
    };
  }

  /**
   * Get the Supabase client, initializing it if necessary
   * @returns {Promise<object>} Initialized Supabase client
   */
  async function getSupabaseClient() {
    try {
      // If Supabase is already available, use it
      if (window.supabase?.auth) {
        return window.supabase;
      }

      // Try to load Supabase from CDN if not available
      if (typeof window.createClient === 'function') {
        window.supabase = window.createClient(config.url, config.anonKey, config.options);
        return window.supabase;
      }

      // If we can't load Supabase, use a mock client
      console.error('[AUTH] Supabase client not available');
      return createMockSupabaseClient();
    } catch (error) {
      console.error('[AUTH] Error getting Supabase client:', error);
      return createMockSupabaseClient();
    }
  }

  // JWT token handling functions
  const jwtHelpers = {
    /**
     * Decode a JWT token without verification
     * @param {string} token - JWT token to decode
     * @returns {object|null} Decoded token payload or null if invalid
     */
    decodeToken(token) {
      if (!token) return null;
      
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
      } catch (error) {
        console.error('[AUTH] Error decoding token:', error);
        return null;
      }
    },

    /**
     * Check if a JWT token is expired
     * @param {string} token - JWT token to check
     * @returns {boolean} True if token is expired or invalid, false otherwise
     */
    isTokenExpired(token) {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    }
  };

  // Function to run when auth is ready
  function onAuthReady(callback) {
    // If no callback provided, return a Promise
    if (typeof callback !== 'function') {
      return new Promise((resolve, reject) => {
        onAuthReady((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    // Handle the callback case
    if (isInitialized) {
      // If already initialized, call immediately
      setTimeout(() => callback(initError), 0);
      return;
    }

    // If initializing, add to queue
    if (isInitializing) {
      initCallbacks.push(callback);
      return;
    }

    // Start initialization
    isInitializing = true;
    
    const handleInitialization = async () => {
      try {
        await auth.initializeAuthModule();
        isInitialized = true;
        isInitializing = false;
        initError = null;
        callback(null);
        // Notify any queued callbacks
        while (initCallbacks.length) {
          const cb = initCallbacks.shift();
          if (typeof cb === 'function') cb(null);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        isInitialized = true; // Still mark as initialized to prevent hanging
        isInitializing = false;
        initError = error;
        callback(error);
        // Notify any queued callbacks with the error
        while (initCallbacks.length) {
          const cb = initCallbacks.shift();
          if (typeof cb === 'function') cb(error);
        }
      }
    };

    // Start initialization
    handleInitialization();
  }

  // Create the auth API
  const auth = {
    /**
     * Sign in with email and password
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @returns {Promise<{data: object|null, error: Error|null}>} Authentication result
     */
    signIn: async function(email, password) {
      try {
        console.log('[AUTH] Signing in...');
        
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        console.log('[AUTH] Sign in successful');
        return { data, error: null };
        
      } catch (error) {
        console.error('[AUTH] Sign in error:', error);
        return { data: null, error };
      }
    },
    
    /**
     * Sign up a new user
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @param {object} [userData={}] - Additional user data
     * @returns {Promise<{data: object|null, error: Error|null}>} Registration result
     */
    signUp: async function(email, password, userData = {}) {
      try {
        console.log('[AUTH] Signing up...');
        
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: userData
          }
        });
        
        if (error) throw error;
        
        console.log('[AUTH] Sign up successful');
        return { data, error: null };
        
      } catch (error) {
        console.error('[AUTH] Sign up error:', error);
        return { data: null, error };
      }
    },
    
    /**
     * Sign out the current user
     * @returns {Promise<{error: Error|null}>} Sign out result
     */
    signOut: async function() {
      try {
        console.log('[AUTH] Signing out...');
        
        const supabase = await getSupabaseClient();
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        console.log('[AUTH] Sign out successful');
        return { error: null };
        
      } catch (error) {
        console.error('[AUTH] Sign out error:', error);
        return { error };
      }
    },
    
    /**
     * Get the current session
     * @returns {Promise<{data: object, error: Error|null}>} Session data
     */
    getSession: async function() {
      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        return { data, error: null };
        
      } catch (error) {
        console.error('[AUTH] Get session error:', error);
        return { data: { session: null }, error };
      }
    },
    
    /**
     * Get the current user
     * @returns {Promise<{data: object, error: Error|null}>} User data
     */
    getUser: async function() {
      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        return { data, error: null };
        
      } catch (error) {
        console.error('[AUTH] Get user error:', error);
        return { data: { user: null }, error };
      }
    },
    
    /**
     * Reset password
     * @param {string} email - User's email
     * @returns {Promise<{error: Error|null}>} Reset result
     */
    resetPassword: async function(email) {
      try {
        console.log('[AUTH] Resetting password...');
        
        if (!email) {
          throw new Error('Email is required');
        }
        
        const supabase = await getSupabaseClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        });
        
        if (error) throw error;
      
        console.log('[AUTH] Password reset email sent');
        return { error: null };
        
      } catch (error) {
        console.error('[AUTH] Reset password error:', error);
        return { error };
      }
    },
    
    // JWT helpers
    jwt: jwtHelpers,
    
    // Expose the reset password URL for reference
    getResetPasswordUrl: () => `${window.location.origin}/reset-password-new.html`,
    
    // Get the Supabase client (use with caution)
    get client() {
      return getSupabaseClient();
    },
    
    /**
     * Initialize auth module
     * @returns {Promise<{initialized: boolean, error: Error|null}>} Initialization result
     */
    initializeAuthModule: async function() {
      console.log('[AUTH] Starting auth module initialization...');
      
      // Check if Supabase is already available
      if (window.supabase?.auth) {
        console.log('[AUTH] Supabase already initialized');
        return { initialized: true };
      }
      
      try {
        // Try to initialize Supabase
        const client = await getSupabaseClient();
        if (client?.auth) {
          console.log('[AUTH] Successfully initialized Supabase');
          return { initialized: true };
        }
        console.warn('[AUTH] Supabase client loaded but auth not available');
        return { initialized: false, error: new Error('Auth not available') };
      } catch (error) {
        console.error('[AUTH] Error initializing auth module:', error);
        return { initialized: false, error };
      }
    }
  };

  // Initialize auth when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
  } else {
    initializeAuth();
  }

  // Initialize auth state change listener
  function initializeAuth() {
    console.log('[AUTH] Initializing auth...');
    
    // Check if Supabase is already available
    if (window.supabase?.auth) {
      console.log('[AUTH] Supabase already available');
      markAsInitialized();
      return;
    }

    // Set up a promise to track Supabase readiness
    if (!window.supabaseReady) {
      console.log('[AUTH] Creating supabaseReady promise');
      window.supabaseReady = new Promise((resolve) => {
        const checkSupabase = setInterval(() => {
          if (window.supabase?.auth) {
            console.log('[AUTH] Supabase client detected');
            clearInterval(checkSupabase);
            resolve();
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkSupabase);
          console.warn('[AUTH] Timeout waiting for Supabase client');
          resolve(); // Resolve anyway to unblock the app
        }, 5000);
      });
    }
    
    // Wait for Supabase to be ready
    window.supabaseReady
      .then(() => {
        console.log('[AUTH] Supabase is ready');
        markAsInitialized();
      })
      .catch(error => {
        console.error('[AUTH] Error waiting for Supabase:', error);
        markAsInitialized();
      });
  }

  function markAsInitialized() {
    if (isInitialized) return;
    
    console.log('[AUTH] Marking auth as initialized');
    isInitialized = true;
    
    // Run any queued callbacks
    while (initCallbacks.length) {
      const callback = initCallbacks.shift();
      try {
        callback();
      } catch (e) {
        console.error('[AUTH] Error in auth ready callback:', e);
      }
    }
  }

  // Initialize auth when ready
  function initAuth() {
    console.log('[AUTH] Initializing auth module...');
    
    // Check if Supabase is already available
    if (window.supabase?.auth) {
      console.log('[AUTH] Supabase already available');
      markAsInitialized();
      return;
    }
    
    // Set up a promise to track Supabase readiness
    if (!window.supabaseReady) {
      console.log('[AUTH] Creating supabaseReady promise');
      window.supabaseReady = new Promise((resolve) => {
        const checkSupabase = setInterval(() => {
          if (window.supabase?.auth) {
            console.log('[AUTH] Supabase client detected');
            clearInterval(checkSupabase);
            resolve();
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkSupabase);
          console.warn('[AUTH] Timeout waiting for Supabase client');
          resolve(); // Resolve anyway to unblock the app
        }, 5000);
      });
    }
    
    // Wait for Supabase to be ready
    window.supabaseReady
      .then(() => {
        console.log('[AUTH] Supabase is ready');
        markAsInitialized();
      })
      .catch(error => {
        console.error('[AUTH] Error waiting for Supabase:', error);
        markAsInitialized();
      });
  }

  // Expose the auth API
  window.TrashDropAuth = auth;
  
  // Initialize auth when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }
  
  // Dispatch ready event
  const readyEvent = new CustomEvent('authReady', {
    detail: { 
      auth,
      isInitialized: isInitialized,
      isInitializing: isInitializing
    }
  });
  
  // Wait a tick to ensure all listeners are registered
  setTimeout(() => {
    document.dispatchEvent(readyEvent);
  }, 0);
  
  console.log('[AUTH] Auth module loaded');
})();
