/**
 * Legacy configuration file for TrashDrop application
 * This file now uses the central config-manager
 * 
 * @version 3.0.0
 * @author TrashDrop Engineering
 */

// Import the central configuration manager
const configManager = require('./config-manager');
// Initialize configuration if needed
if (!configManager.initialized) {
  // Note: This synchronous usage should be avoided in the future
  // We're maintaining this for backward compatibility only
  try {
    configManager.initialize();
  } catch (err) {
    console.warn('Could not initialize config manager synchronously:', err.message);
  }
}

// For backward compatibility, map our current config structure
const config = {
  // Application metadata
  app: {
    name: process.env.APP_NAME || 'TrashDrop',
    version: process.env.npm_package_version || '2.1.0',
    description: 'Waste management and recycling solution',
    domain: process.env.APP_DOMAIN || 'trashdrop-app.web.app',
    baseUrl: process.env.BASE_URL || ''
  },

  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    httpsEnabled: process.env.HTTPS_ENABLED === 'true',
    sslConfig: process.env.SSL_KEY && process.env.SSL_CERT ? {
      key: process.env.SSL_KEY,
      cert: process.env.SSL_CERT
    } : null
  },
  
  // Security settings
  security: {
    sessionSecret: process.env.SESSION_SECRET,
    jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET,
    sessionDuration: parseInt(process.env.SESSION_DURATION || 86400000), // Default: 24 hours
    otpExpiration: parseInt(process.env.OTP_EXPIRATION || 600000), // Default: 10 minutes
    csrfProtection: process.env.CSRF_PROTECTION !== 'false',
    rateLimiting: {
      enabled: process.env.RATE_LIMITING !== 'false',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 900000), // Default: 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || 100) // Default: 100 requests
    }
  },
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL || defaults.supabase.url,
    anonKey: process.env.SUPABASE_ANON_KEY || defaults.supabase.anonKey,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // External services
  services: {
    smsApiKey: process.env.SMS_API_KEY,
    maps: {
      provider: process.env.MAPS_PROVIDER || 'leaflet',
      apiKey: process.env.MAPS_API_KEY
    }
  },

  // Feature flags
  features: {
    offlineSupport: process.env.FEATURE_OFFLINE_SUPPORT !== 'false',
    darkMode: process.env.FEATURE_DARK_MODE !== 'false',
    reportDumping: process.env.FEATURE_REPORT_DUMPING !== 'false',
    analytics: process.env.FEATURE_ANALYTICS === 'true'
  },

  // API endpoints configuration
  api: {
    paths: {
      auth: {
        login: '/api/auth/login',
        signup: '/api/auth/signup',
        logout: '/api/logout'
      },
      bags: {
        order: '/api/bags/order',
        register: '/api/bags/register',
        count: '/api/bags/count',
        user: '/api/bags/user'
      },
      points: {
        user: '/api/points/user',
        rewards: '/api/points/rewards',
        history: '/api/points/history',
        award: '/api/points/award',
        redeem: '/api/points/redeem'
      },
      pickups: {
        schedule: '/api/pickups/schedule',
        active: '/api/pickups/active'
      },
      locations: {
        all: '/api/locations',
        disposalCenters: '/api/locations/disposal-centers'
      },
      config: {
        client: '/api/config/client',
        supabase: '/api/config/supabase'
      }
    }
  },

  // External CDN resources
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

  // UI Routes (for client-side navigation)
  routes: {
    home: '/',
    login: '/login',
    signup: '/signup',
    dashboard: '/dashboard',
    scan: '/scan',
    rewards: '/rewards',
    requestPickup: '/request-pickup',
    schedulePickup: '/schedule-pickup',
    orderBags: '/order-bags',
    reportDumping: '/report-dumping',
    activity: '/activity',
    reports: '/reports',
    profile: '/profile',
    help: '/help',
    contact: '/contact',
    privacy: '/privacy',
    terms: '/terms'
  }
};

// Get a safe subset of configuration for the client
config.getClientConfig = function() {
  return {
    app: this.app,
    server: {
      environment: this.server.environment,
      isDevelopment: this.server.isDevelopment
    },
    supabase: {
      url: this.supabase.url,
      anonKey: this.supabase.anonKey
    },
    features: this.features,
    api: {
      paths: this.api.paths
    },
    cdnResources: this.cdnResources,
    routes: this.routes
  };
};

// Get template variables for server-side rendering
config.getTemplateVariables = function() {
  return {
    APP_NAME: this.app.name,
    APP_VERSION: this.app.version,
    APP_DESCRIPTION: this.app.description,
    APP_DOMAIN: this.app.domain,
    BASE_URL: this.app.baseUrl,
    ENVIRONMENT: this.server.environment,
    IS_DEVELOPMENT: this.server.isDevelopment,
    SUPABASE_URL: this.supabase.url,
    SUPABASE_ANON_KEY: '[PROTECTED]', // We'll use a client-side API to get this
    BOOTSTRAP_CSS: this.cdnResources.bootstrap.css,
    BOOTSTRAP_JS: this.cdnResources.bootstrap.js,
    BOOTSTRAP_ICONS: this.cdnResources.bootstrap.icons,
    LEAFLET_CSS: this.cdnResources.leaflet.css,
    LEAFLET_JS: this.cdnResources.leaflet.js,
    CHARTJS: this.cdnResources.chartJs,
    SUPABASE_JS: this.cdnResources.supabase,
    FEATURE_OFFLINE_SUPPORT: this.features.offlineSupport,
    FEATURE_DARK_MODE: this.features.darkMode
  };
};

// Validate critical configuration
function validateConfig() {
  const missingVars = [];
  
  // In production, check for required variables
  if (!config.server.isDevelopment) {
    if (!config.security.sessionSecret) missingVars.push('SESSION_SECRET');
    if (!config.security.jwtSecret) missingVars.push('JWT_SECRET or SESSION_SECRET');
    if (!config.supabase.url) missingVars.push('SUPABASE_URL');
    if (!config.supabase.anonKey) missingVars.push('SUPABASE_ANON_KEY');
  }
  
  if (missingVars.length > 0) {
    if (config.server.isDevelopment) {
      console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
      console.warn('Application will use default values for development');
    } else {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }
}

// Run validation
validateConfig();

module.exports = config;
