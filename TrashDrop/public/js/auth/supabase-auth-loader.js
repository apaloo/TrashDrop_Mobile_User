/**
 * Supabase Authentication Loader
 * Non-module script for loading and initializing the Supabase authentication utility
 * 
 * @description Supports traditional script tags for non-ESM environments
 * @version 1.0.1
 */

(function() {
  'use strict';
  
  // Track loading state
  let isLoading = false;
  let loadPromise = null;
  let supabaseAuth = null;
  
  /**
   * Load the auth module dynamically
   */
  async function loadAuthModule() {
    if (isLoading) {
      return loadPromise;
    }
    
    isLoading = true;
    
    loadPromise = (async () => {
      try {
        console.log('[SupabaseAuthLoader] Loading Supabase auth module...');
        
        // Load as regular script - no ESM imports for browser compatibility
        await loadScript('/js/auth/utils/supabase-auth-unified.js');
        
        // Wait for window.SupabaseAuth to be defined
        await waitForGlobal('SupabaseAuthManager');
        supabaseAuth = window.SupabaseAuthManager;
        console.log('[SupabaseAuthLoader] Module loaded successfully');
        
        return supabaseAuth;
      } catch (error) {
        console.error('[SupabaseAuthLoader] Failed to load auth module:', error);
        throw error;
      } finally {
        isLoading = false;
      }
    })();
    
    return loadPromise;
  }
  
  /**
   * Load a script dynamically
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.type = 'text/javascript'; // Regular script type for compatibility
      
      script.onload = () => resolve();
      script.onerror = (error) => reject(new Error(`Failed to load script: ${src}`));
      
      document.head.appendChild(script);
    });
  }
  
  /**
   * Wait for a global variable to be defined
   */
  function waitForGlobal(name, timeout = 30000) { // Increased timeout to 30 seconds
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      console.log(`[SupabaseAuthLoader] Waiting for ${name} to be defined...`);
      
      // Create event listener for custom event that might be dispatched when the module is loaded
      const eventName = `${name}:ready`;
      const handleReadyEvent = (event) => {
        console.log(`[SupabaseAuthLoader] Received ${eventName} event`);
        document.removeEventListener(eventName, handleReadyEvent);
        resolve(window[name]);
      };
      document.addEventListener(eventName, handleReadyEvent);
      
      const check = () => {
        if (window[name] && typeof window[name] === 'object') {
          console.log(`[SupabaseAuthLoader] ${name} is now available`);
          document.removeEventListener(eventName, handleReadyEvent);
          return resolve(window[name]);
        }
        
        if (Date.now() - startTime > timeout) {
          console.error(`[SupabaseAuthLoader] Timeout waiting for ${name} to be defined after ${timeout}ms`);
          document.removeEventListener(eventName, handleReadyEvent);
          
          // Last attempt to create a basic mock for development
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn(`[SupabaseAuthLoader] Creating emergency mock ${name} for development`);
            window[name] = { _isMock: true };
            return resolve(window[name]);
          }
          
          return reject(new Error(`Timeout waiting for ${name} to be defined`));
        }
        
        setTimeout(check, 100); // Check every 100ms
      };
      
      check();
    });
  }
  
  /**
   * Initialize the Supabase auth module
   */
  async function initializeAuth(options = {}) {
    try {
      const auth = await loadAuthModule();
      return await auth.initialize(options);
    } catch (error) {
      console.error('[SupabaseAuthLoader] Failed to initialize auth:', error);
      throw error;
    }
  }
  
  /**
   * Get the Supabase client
   */
  async function getClient() {
    try {
      const auth = await loadAuthModule();
      return await auth.getClient();
    } catch (error) {
      console.error('[SupabaseAuthLoader] Failed to get client:', error);
      throw error;
    }
  }
  
  // Export to window
  window.SupabaseAuthLoader = {
    initialize: initializeAuth,
    getClient: getClient,
    loadModule: loadAuthModule
  };
})();
