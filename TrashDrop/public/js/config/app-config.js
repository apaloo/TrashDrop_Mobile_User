/**
 * TrashDrop Client Configuration System
 * 
 * This module provides a centralized configuration system for the client-side application.
 * It loads configuration from the server API and provides fallback values.
 * 
 * @version 1.0.0
 * @author TrashDrop Engineering
 */

/**
 * AppConfig - Client-side configuration management
 */
class AppConfig {
  /**
   * Constructor - initialize with default configuration
   */
  constructor() {
    // Initialization state
    this.initialized = false;
    this.initializing = false;
    this.error = null;
    
    // Default configuration (fallback values)
    this.config = {
      app: {
        name: 'TrashDrop',
        version: '2.0.0',
        environment: this._detectEnvironment(),
        baseUrl: window.location.origin,
        currentUrl: window.location.href
      },
      supabase: {
        url: 'https://glfseosbxoafanujgvwk.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZnNlb3NieG9hZmFudWpndndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTY5ODUzNjYsImV4cCI6MjAxMjU2MTM2Nn0.RTg_QPJFnJwN40OA8m7CWOriMkMQjQnGtOqjgKBcLoI'
      },
      api: {
        baseUrl: '/api'
      },
      features: {
        enableOfflineMode: true,
        enableLocationHistory: true
      },
      routes: {
        home: '/',
        login: '/login',
        dashboard: '/dashboard',
        scan: '/scan',
        rewards: '/rewards'
      },
      // Default CDN resources (fallbacks)
      cdnResources: {
        bootstrap: {
          css: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
          js: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
          icons: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css'
        },
        leaflet: {
          css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
          js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        },
        chartJs: 'https://cdn.jsdelivr.net/npm/chart.js@4.2.1/dist/chart.umd.min.js',
        supabase: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js'
      },
      // Event listeners
      _eventListeners: {}
    };
    
    // Bind event handler methods
    this._onConfigLoaded = this._onConfigLoaded.bind(this);
    this._onConfigError = this._onConfigError.bind(this);
    
    // Register service worker on page load
    if ('serviceWorker' in navigator && this.config.features.offlineSupport) {
      window.addEventListener('load', () => {
        this._registerServiceWorker();
      });
    }
  }
  
  /**
   * Initialize the configuration
   * @returns {Promise} - Promise that resolves when initialization is complete
   */
  async initialize() {
    console.log('Initializing AppConfig with fallback support...');
    
    try {
      // Load configuration from different sources in order of precedence
      try { await this._loadConfigFromMetaTags(); } catch (e) { console.warn('Meta tags config load failed:', e); }
      try { await this._loadConfigFromServer(); } catch (e) { console.warn('Server config load failed:', e); }
      try { await this._loadConfigFromLocalStorage(); } catch (e) { console.warn('LocalStorage config load failed:', e); }
      
      // If we reach here, we'll use whatever config we have, even if some sources failed
      this._initialized = true;
      this._triggerEvent('initialized', this.config);
      console.log('AppConfig initialized successfully with default or partial config');
      
      
      // Trigger the 'configloaded' event
      this._triggerEvent('configloaded', { config: this.config });
      
      return this.config;
    } catch (error) {
      // This should only happen for catastrophic errors
      console.error('Critical error initializing AppConfig:', error);
      
      // Still mark as initialized with defaults and continue
      this._initialized = true;
      console.warn('Using default configuration due to initialization errors');
      this._triggerEvent('initialized', this.config);
      this._triggerEvent('configloaded', { config: this.config });
      
      return this.config;
    }
  }
  
  /**
   * Get a configuration value
   * @param {string} path - Dot notation path to the config value
   * @param {any} defaultValue - Fallback value if path doesn't exist
   * @returns {any} - The config value or defaultValue
   */
  get(path, defaultValue = null) {
    if (!path) return this.config;
    
    const parts = path.split('.');
    let current = this.config;
    
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
  }
  
  /**
   * Add an event listener for configuration events
   * @param {string} event - Event name ('configloaded', 'configerror', 'configloading')
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.config._eventListeners[event]) {
      this.config._eventListeners[event] = [];
    }
    this.config._eventListeners[event].push(callback);
  }
  
  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (!this.config._eventListeners[event]) return;
    this.config._eventListeners[event] = this.config._eventListeners[event]
      .filter(cb => cb !== callback);
  }
  
  /**
   * Update the app's theme based on configuration
   */
  applyTheme() {
    if (this.get('features.darkMode')) {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light');
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }
  
  /**
   * Private method to detect the current environment
   * @returns {string} - The current environment ('production', 'development', etc.)
   * @private
   */
  _detectEnvironment() {
    const host = window.location.hostname;
    
    if (host === 'localhost' || host === '127.0.0.1' || host.includes('ngrok')) {
      return 'development';
    }
    
    if (host.includes('staging') || host.includes('test')) {
      return 'staging';
    }
    
    return 'production';
  }
  
  /**
   * Load configuration from meta tags in the document head
   * @private
   */
  _loadConfigFromMetaTags() {
    // Extract Supabase configuration
    const supabaseUrl = document.getElementById('supabase-url')?.content;
    const supabaseKey = document.getElementById('supabase-anon-key')?.content;
    
    if (supabaseUrl) this.config.supabase.url = supabaseUrl;
    if (supabaseKey) this.config.supabase.anonKey = supabaseKey;
    
    // Extract environment information
    const environment = document.querySelector('meta[name="environment"]')?.content;
    if (environment) this.config.app.environment = environment;
    
    // Extract app information
    const appName = document.querySelector('meta[name="app-name"]')?.content;
    const appVersion = document.querySelector('meta[name="app-version"]')?.content;
    
    if (appName) this.config.app.name = appName;
    if (appVersion) this.config.app.version = appVersion;
    
    // Extract feature flags
    const offlineSupport = document.querySelector('meta[name="feature-offline-support"]')?.content;
    const darkMode = document.querySelector('meta[name="feature-dark-mode"]')?.content;
    
    if (offlineSupport === 'false') this.config.features.offlineSupport = false;
    if (darkMode === 'false') this.config.features.darkMode = false;
    
    console.log('Configuration loaded from meta tags');
  }
  
  /**
   * Load configuration from the server
   * @returns {Promise} - Promise that resolves when config is loaded
   * @private
   */
  async _loadConfigFromServer() {
    try {
      // First try the API endpoint (when server is running)
      const response = await fetch('/api/config/client');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const serverConfig = await response.json();
      
      // Merge server configuration with the current config
      this._mergeConfig(serverConfig);
      
      console.log('Configuration loaded from server API');
      return this.config;
    } catch (error) {
      console.warn('Failed to load configuration from server API:', error);
      
      // Try loading from the root client-config.json file (easiest to serve)
      try {
        const rootResponse = await fetch('/client-config.json');
        
        if (!rootResponse.ok) {
          throw new Error(`Root config returned ${rootResponse.status}: ${rootResponse.statusText}`);
        }
        
        const rootConfig = await rootResponse.json();
        
        // Merge root configuration with the current config
        this._mergeConfig(rootConfig);
        
        console.log('Configuration loaded from root client-config.json');
        return this.config;
      } catch (rootError) {
        console.warn('Failed to load from root config file:', rootError);
      }
      
      // Try loading from the static JSON file (for development with http-server)
      try {
        const staticResponse = await fetch('/api/config/client.json');
        
        if (!staticResponse.ok) {
          throw new Error(`Static config returned ${staticResponse.status}: ${staticResponse.statusText}`);
        }
        
        const staticConfig = await staticResponse.json();
        
        // Merge static configuration with the current config
        this._mergeConfig(staticConfig);
        
        console.log('Configuration loaded from static JSON file');
        return this.config;
      } catch (staticError) {
        console.warn('Failed to load from static config file:', staticError);
      }
      
      // Try loading from the legacy endpoint as last resort
      try {
        await this._loadSupabaseConfigFromLegacyEndpoint();
        return this.config;
      } catch (legacyError) {
        console.warn('Failed to load from legacy endpoint:', legacyError);
      }
      
      // Re-throw the original error
      throw error;
    }
  }
  
  /**
   * Load Supabase configuration from the legacy endpoint
   * @returns {Promise} - Promise that resolves when Supabase config is loaded
   * @private
   */
  async _loadSupabaseConfigFromLegacyEndpoint() {
    const response = await fetch('/api/config/supabase');
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const supabaseConfig = await response.json();
    
    // Update only the Supabase configuration
    if (supabaseConfig.url) this.config.supabase.url = supabaseConfig.url;
    if (supabaseConfig.anonKey) this.config.supabase.anonKey = supabaseConfig.anonKey;
    
    console.log('Supabase configuration loaded from legacy endpoint');
    return this.config;
  }
  
  /**
   * Merge a configuration object into the current configuration
   * @param {Object} newConfig - New configuration to merge
   * @private
   */
  _mergeConfig(newConfig) {
    // Don't overwrite event listeners
    const eventListeners = this.config._eventListeners;
    
    // Deep merge
    this.config = this._deepMerge(this.config, newConfig);
    
    // Restore event listeners
    this.config._eventListeners = eventListeners;
  }
  
  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} - Merged object
   * @private
   */
  _deepMerge(target, source) {
    // Handle edge cases
    if (!source) return target;
    if (!target) return source;
    
    const output = { ...target };
    
    // Handle source being a primitive value
    if (typeof source !== 'object' || source instanceof Array) {
      return source;
    }
    
    // Iterate through source properties and merge recursively
    Object.keys(source).forEach(key => {
      if (key === '_eventListeners') return; // Skip event listeners
      
      if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
        output[key] = this._deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
    
    return output;
  }
  
  /**
   * Register the service worker for offline support
   * @private
   */
  _registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('ServiceWorker registration failed:', error);
        });
    }
  }

  /**
   * Load configuration from localStorage
   * @returns {Promise} - Promise that resolves when config is loaded
   * @private
   */
  async _loadConfigFromLocalStorage() {
    return new Promise((resolve) => {
      try {
        const savedConfig = localStorage.getItem('trashdrop_config');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          if (parsedConfig && typeof parsedConfig === 'object') {
            console.log('Loaded configuration from localStorage');
            this._mergeConfig(parsedConfig);
          }
        }
        resolve();
      } catch (e) {
        console.warn('Error loading config from localStorage:', e);
        resolve(); // Resolve anyway to continue initialization
      }
    });
  }
  
  /**
   * Trigger an event
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   * @private
   */
  _triggerEvent(eventName, data) {
    if (!this.config._eventListeners[eventName]) return;
    
    for (const callback of this.config._eventListeners[eventName]) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${eventName} event listener:`, error);
      }
    }
    
    // Also dispatch a DOM event for broader consumption
    const event = new CustomEvent(`appconfig.${eventName}`, { detail: data });
    document.dispatchEvent(event);
  }
  
  /**
   * Handler for configuration loaded event
   * @param {Object} data - Event data
   * @private
   */
  _onConfigLoaded(data) {
    console.log('Configuration loaded:', data);
    
    // Apply theme based on configuration
    this.applyTheme();
  }
  
  /**
   * Handler for configuration error event
   * @param {Object} data - Event data
   * @private
   */
  _onConfigError(data) {
    console.error('Configuration error:', data.error);
  }
}

// Create a singleton instance
const appConfig = new AppConfig();

// Auto-register event handlers for common events
appConfig.on('configloaded', appConfig._onConfigLoaded);
appConfig.on('configerror', appConfig._onConfigError);

// Export the singleton
window.AppConfig = appConfig;

// Auto-initialize on script load if the document is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => appConfig.initialize(), 0);
} else {
  document.addEventListener('DOMContentLoaded', () => appConfig.initialize());
}

// No export needed - already exposed via window.AppConfig
// This is a regular script, not a module
