/**
 * Central configuration file for TrashDrop application
 * All environment variables and configuration settings should be accessed through this file
 */

// Load environment variables
require('dotenv').config();

// Application settings
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
  },
  
  // Security settings
  security: {
    sessionSecret: process.env.SESSION_SECRET,
    jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET,
    sessionDuration: parseInt(process.env.SESSION_DURATION || 86400000), // Default: 24 hours
    otpExpiration: parseInt(process.env.OTP_EXPIRATION || 600000), // Default: 10 minutes
  },
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    // Never expose the service role key to the client
    getClientConfig: () => ({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY
    })
  },
  
  // External services
  services: {
    smsApiKey: process.env.SMS_API_KEY
  }
};

// Validate critical configuration
function validateConfig() {
  const missingVars = [];
  
  if (!config.security.sessionSecret) missingVars.push('SESSION_SECRET');
  if (!config.security.jwtSecret) missingVars.push('JWT_SECRET or SESSION_SECRET');
  if (!config.supabase.url) missingVars.push('SUPABASE_URL');
  if (!config.supabase.anonKey) missingVars.push('SUPABASE_ANON_KEY');
  
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
