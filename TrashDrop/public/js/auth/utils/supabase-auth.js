/**
 * Supabase Authentication Module
 * Consolidated implementation for Supabase client initialization and authentication
 * 
 * @version 1.0.0
 * @description Centralized Supabase client management to prevent duplicate implementations
 */

// Import any needed dependencies
import { AuthStorage, STORAGE_KEYS } from './auth-utils.js';

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
          return config;
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
            return config;
          }
        } catch (e) {
          console.warn('[SupabaseAuth] Failed to get AppConfig:', e);
        }
      }
      
      // 3. Try meta tags
      if (typeof document !== 'undefined') {
        const urlMeta = document.querySelector('meta[name="supabase-url"]') || 
                      document.querySelector('meta[id="supabase-url"]');
        
        const keyMeta = document.querySelector('meta[name="supabase-anon-key"]') || 
                       document.querySelector('meta[id="supabase-anon-key"]');
        
        if (urlMeta && keyMeta) {
          config.url = urlMeta.content;
          config.anonKey = keyMeta.content;
          console.log('[SupabaseAuth] Using meta tag configuration');
          return config;
        }
      }
      
      // 4. Environment variables (for bundled environments)
      if (typeof process !== 'undefined' && process.env) {
        if (process.env.SUPABASE_URL) config.url = process.env.SUPABASE_URL;
        if (process.env.SUPABASE_ANON_KEY) config.anonKey = process.env.SUPABASE_ANON_KEY;
        if (config.url && config.anonKey) {
          console.log('[SupabaseAuth] Using environment variables');
          return config;
        }
      }
      
      // 5. Check for global window variables
      if (typeof window !== 'undefined') {
        if (window.SUPABASE_URL) config.url = window.SUPABASE_URL;
        if (window.SUPABASE_ANON_KEY) config.anonKey = window.SUPABASE_ANON_KEY;
        if (config.url && config.anonKey) {
          console.log('[SupabaseAuth] Using window variables');
          return config;
        }
      }
      
      // No valid configuration found
      throw new Error('No valid Supabase configuration found');
    } catch (error) {
      console.error('[SupabaseAuth] Error fetching configuration:', error);
      throw error;
    }
  }
