/**
 * Configuration API Routes
 * 
 * Provides secure access to configuration values for client-side applications
 */

const express = require('express');
const router = express.Router();
const config = require('../config/config-manager');

// Initialize config if not already done
if (!config.initialized) {
  config.initialize().catch(err => {
    console.error('Failed to initialize configuration:', err);
  });
}

/**
 * GET /api/config
 * Returns safe configuration values for client-side use
 */
router.get('/', (req, res) => {
  try {
    // Only expose safe configuration values (never include secrets or keys)
    const clientConfig = {
      app: {
        name: config.get('app.name'),
        env: config.get('app.env'),
        version: config.get('app.version'),
        url: config.get('app.url')
      },
      
      // Include public URL and anonymous key, but never the service role key
      supabase: {
        url: config.get('supabase.url'),
        anonKey: config.get('supabase.anonKey')
      },
      
      // Firebase config removed as we're now fully migrated to Supabase
      
      // CDN URLs are safe to expose
      cdn: config.get('cdn'),
      
      // Feature flags
      features: config.get('features'),
      
      // Public routes
      routes: {
        login: '/login.html',
        signup: '/signup.html',
        dashboard: '/dashboard.html',
        updatePassword: '/update-password.html',
        forgotPassword: '/forgot-password.html',
      }
    };
    
    res.json(clientConfig);
  } catch (error) {
    console.error('Error serving config:', error);
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

module.exports = router;
