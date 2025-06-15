/**
 * TrashDrop Centralized Configuration Manager
 * 
 * Provides a unified API for accessing configuration values in both
 * browser and Node.js environments with proper fallbacks and security.
 */

// For Node.js environment
if (typeof window === 'undefined') {
  require('dotenv').config();
}

/**
 * Configuration Manager Class
 * Handles centralized configuration with environment-aware behavior
 */
class ConfigManager {
  constructor() {
    this.config = {};
    this.initialized = false;
    this.isNode = typeof window === 'undefined';
    this.configApi = '/api/config';
    this.environment = this.isNode ? (process.env.NODE_ENV || 'development') : 
                       (window.TRASHDROP_ENV || 'production');
  }

  /**
   * Initialize the configuration system
   */
  async initialize() {
    if (this.initialized) return this.config;

    if (this.isNode) {
      // Node.js - Load from environment variables
      await this._initNodeConfig();
    } else {
      // Browser - Load from meta tags, then API if available
      await this._initBrowserConfig();
    }

    this.initialized = true;
    return this.config;
  }

  /**
   * Initialize config in Node.js environment
   */
  async _initNodeConfig() {
    const loadFromEnv = (key, fallback) => process.env[key] || fallback;
    
    this.config = {
      app: {
        name: loadFromEnv('APP_NAME', 'TrashDrop'),
        env: this.environment,
        port: parseInt(loadFromEnv('PORT', '3000'), 10),
        url: loadFromEnv('APP_URL', 'http://localhost:3000'),
        localSiteUrl: loadFromEnv('LOCAL_SITE_URL', 'http://localhost:3000'),
      },
      supabase: {
        url: loadFromEnv('SUPABASE_URL', null),
        anonKey: loadFromEnv('SUPABASE_ANON_KEY', null),
        serviceRoleKey: loadFromEnv('SUPABASE_SERVICE_ROLE_KEY', null),
      },
      // Firebase configuration removed as we're fully migrated to Supabase
      security: {
        sessionSecret: loadFromEnv('SESSION_SECRET', null),
        jwtSecret: loadFromEnv('JWT_SECRET', null),
        sessionDuration: parseInt(loadFromEnv('SESSION_DURATION', '86400000'), 10), 
      },
      apis: {
        smsEndpoint: loadFromEnv('SMS_API_ENDPOINT', null),
        mapsKey: loadFromEnv('MAPS_API_KEY', null),
      },
      features: {
        enableSmsNotifications: loadFromEnv('ENABLE_SMS_NOTIFICATIONS', 'false') === 'true',
        enableDemoMode: loadFromEnv('ENABLE_DEMO_MODE', 'false') === 'true',
      },
      cdn: {
        bootstrap: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
        bootstrapJs: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
        bootstrapIcons: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
        leafletCss: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        leafletJs: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        chartJs: 'https://cdn.jsdelivr.net/npm/chart.js',
      }
    };

    // Security check for production - Ensure critical config exists
    if (this.environment === 'production') {
      this._validateProductionConfig();
    }
  }

  /**
   * Initialize config in browser environment
   */
  async _initBrowserConfig() {
    // First, load from meta tags
    this._loadFromMetaTags();
    
    // Then try to fetch from API if available
    try {
      const apiConfig = await this._fetchConfigFromApi();
      if (apiConfig) {
        this.config = this._mergeConfigs(this.config, apiConfig);
      }
    } catch (error) {
      console.warn('Failed to load config from API:', error);
    }
    
    // Finally, apply any defaults that might be missing
    this._applyBrowserDefaults();
  }

  /**
   * Load configuration from meta tags
   */
  _loadFromMetaTags() {
    const metaTags = document.querySelectorAll('meta[name^="config."]');
    this.config = this.config || {};
    
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name');
      const value = tag.getAttribute('content');
      if (name && value) {
        // Strip the 'config.' prefix and use as path
        const path = name.replace('config.', '').split('.');
        this._setNestedValue(this.config, path, value);
      }
    });

    // Special handling for Supabase config which might use different meta names
    const supabaseUrl = document.querySelector('meta[name="supabase-url"]')?.getAttribute('content');
    const supabaseKey = document.querySelector('meta[name="supabase-anon-key"]')?.getAttribute('content');
    
    if (supabaseUrl || supabaseKey) {
      this.config.supabase = this.config.supabase || {};
      if (supabaseUrl) this.config.supabase.url = supabaseUrl;
      if (supabaseKey) this.config.supabase.anonKey = supabaseKey;
    }
  }

  /**
   * Apply default values for browser environment
   */
  _applyBrowserDefaults() {
    this.config.app = this.config.app || {};
    this.config.app.localSiteUrl = this.config.app.localSiteUrl || 'http://localhost:3000';
    
    // Add CDN defaults if not defined
    this.config.cdn = this.config.cdn || {
      bootstrap: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
      bootstrapJs: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
      bootstrapIcons: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
      leafletCss: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      leafletJs: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
      chartJs: 'https://cdn.jsdelivr.net/npm/chart.js',
    };
  }
  
  /**
   * Fetch configuration from API endpoint
   */
  async _fetchConfigFromApi() {
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}${this.configApi}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Error fetching config from API:', error);
    }
    return null;
  }
  
  /**
   * Set a nested value in an object using a path array
   */
  _setNestedValue(obj, path, value) {
    if (path.length === 0) return;
    
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = path[path.length - 1];
    current[lastKey] = value;
  }
  
  /**
   * Merge two configuration objects
   */
  _mergeConfigs(target, source) {
    const merged = { ...target };

    for (const key in source) {
      if (source[key] === null || source[key] === undefined) {
        continue;
      }
      
      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        merged[key] = this._mergeConfigs(merged[key] || {}, source[key]);
      } else {
        merged[key] = source[key];
      }
    }

    return merged;
  }
  
  /**
   * Validate critical configuration for production environment
   */
  _validateProductionConfig() {
    // Only run validation in actual production environment
    // Use process.env.NODE_ENV directly to check the actual runtime environment
    const actualNodeEnv = this.isNode ? process.env.NODE_ENV : undefined;
    if (actualNodeEnv !== 'production') {
      console.log(`Skipping critical config validation for environment: ${actualNodeEnv || this.environment}`);
      return;
    }
    
    const criticalKeys = [
      'supabase.url',
      'supabase.anonKey',
      // Firebase keys removed as we're fully migrated to Supabase
      'security.sessionSecret',
      'security.jwtSecret'
    ];
    
    const missingKeys = criticalKeys.filter(key => {
      const path = key.split('.');
      let current = this.config;
      
      for (const segment of path) {
        if (!current || current[segment] === null || current[segment] === undefined) {
          return true;
        }
        current = current[segment];
      }
      
      return false;
    });
    
    if (missingKeys.length > 0) {
      const errorMsg = `Missing critical configuration for production: ${missingKeys.join(', ')}`;
      console.error(errorMsg);
      
      if (this.isNode) {
        // In Node.js environment, we can terminate the process
        console.error('Terminating due to missing critical configuration');
        process.exit(1);
      } else {
        // In browser, throw an error that can be caught by error handlers
        throw new Error(errorMsg);
      }
    }
  }
  
  /**
   * Get a configuration value by path
   */
  get(path, defaultValue = null) {
    if (!this.initialized) {
      console.warn('Configuration not initialized. Call initialize() first.');
      return defaultValue;
    }
    
    const segments = path.split('.');
    let current = this.config;
    
    for (const segment of segments) {
      if (!current || current[segment] === undefined) {
        return defaultValue;
      }
      current = current[segment];
    }
    
    return current !== null && current !== undefined ? current : defaultValue;
  }
  
  /**
   * Set a configuration value by path
   */
  set(path, value) {
    if (!this.initialized) {
      console.warn('Configuration not initialized. Call initialize() first.');
      return;
    }
    
    const segments = path.split('.');
    this._setNestedValue(this.config, segments, value);
  }
  
  /**
   * Get Supabase client configuration
   */
  getSupabaseConfig() {
    return {
      url: this.get('supabase.url'),
      anonKey: this.get('supabase.anonKey'),
    };
  }
  
  /**
   * Firebase configuration removed
   * The application now uses Supabase exclusively for authentication and backend services
   */
  
  /**
   * Get CDN URLs
   */
  getCdnUrls() {
    return this.get('cdn');
  }
}

// Create a singleton instance
const configManager = new ConfigManager();

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = configManager;
} 

// Export for browser environment (using UMD pattern)
if (typeof window !== 'undefined') {
  // Expose as global
  window.AppConfig = configManager;
  
  // Handle AMD
  if (typeof define === 'function' && define.amd) {
    define('AppConfig', [], function() { return configManager; });
  } 
  
  // For browser script tag loading, initialize immediately
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize if not already done
    if (!configManager.initialized) {
      configManager.initialize()
        .catch(err => console.error('Error initializing AppConfig:', err));
    }
  });
}
