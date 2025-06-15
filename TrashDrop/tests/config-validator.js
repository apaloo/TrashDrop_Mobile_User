/**
 * TrashDrop Configuration Validation Script
 * 
 * This script validates that all required configuration values
 * are properly loaded across both server and client environments.
 * 
 * Usage:
 * - Server validation: Run with Node.js -> node tests/config-validator.js
 * - Client validation: Open tests/config-validator.html in a browser
 */

// Detect environment (Node.js or Browser)
const isNode = typeof window === 'undefined';

/**
 * Required environment variables from .env
 */
const requiredEnvVars = [
  'APP_NAME',
  'APP_ENV',
  'APP_VERSION',
  'APP_URL',
  'SERVER_PORT',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SESSION_SECRET',
  'JWT_SECRET'
];

/**
 * Required client-side configuration keys
 */
const requiredClientConfig = {
  app: ['name', 'version', 'environment', 'baseUrl'],
  supabase: ['url', 'anonKey'],
  api: ['baseUrl'],
  features: ['enableOfflineMode', 'enableLocationHistory'],
  routes: ['home', 'login', 'dashboard', 'scan', 'rewards']
};

/**
 * Required Supabase configuration properties
 */
const requiredSupabaseConfig = ['url', 'anonKey', 'options'];

/**
 * Output formats
 */
const colors = isNode ? {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m'
} : {
  reset: '',
  bright: '',
  green: '',
  red: '',
  yellow: ''
};

/**
 * Test result tracking
 */
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

/**
 * Utility functions
 */
function log(message, type = 'info') {
  const prefix = {
    info: '',
    success: colors.green + '✓ ',
    error: colors.red + '✗ ',
    warning: colors.yellow + '⚠ '
  };
  
  const messageWithPrefix = prefix[type] + message + colors.reset;
  
  if (isNode) {
    console.log(messageWithPrefix);
  } else {
    const logElem = document.getElementById('log');
    if (logElem) {
      const logLine = document.createElement('div');
      logLine.className = type;
      logLine.textContent = message;
      logElem.appendChild(logLine);
    } else {
      console.log(messageWithPrefix);
    }
  }
  
  // Track results
  if (type === 'success') testResults.passed++;
  if (type === 'error') testResults.failed++;
  if (type === 'warning') testResults.warnings++;
  
  testResults.details.push({ type, message });
}

/**
 * Test runner
 */
async function runTests() {
  log(colors.bright + 'TrashDrop Configuration Validator' + colors.reset);
  log('-----------------------------------');
  
  // Test environment-specific configurations
  if (isNode) {
    await testNodeEnvironment();
  } else {
    await testBrowserEnvironment();
  }
  
  // Output summary
  log('');
  log(colors.bright + 'Test Summary:' + colors.reset);
  log(`Passed: ${testResults.passed}, Failed: ${testResults.failed}, Warnings: ${testResults.warnings}`);
  
  return testResults;
}

/**
 * Node.js environment tests
 */
async function testNodeEnvironment() {
  log('Testing Node.js Environment Variables', 'info');
  
  try {
    // Load environment variables if not already loaded
    try {
      require('dotenv').config();
    } catch (err) {
      log('Could not load dotenv, continuing with process.env', 'warning');
    }
    
    // Test environment variables
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        log(`ENV: ${envVar} is defined`, 'success');
      } else {
        log(`ENV: ${envVar} is missing`, 'error');
      }
    }
    
    // Try to load and initialize server-side config modules
    try {
      const configManager = require('../src/config/config-manager');
      log('Config manager loaded successfully', 'success');
      
      // Initialize config manager before checking values
      try {
        log('Initializing config manager...', 'info');
        await configManager.initialize();
        log('Config manager initialized successfully', 'success');
      } catch (initErr) {
        log(`Failed to initialize config manager: ${initErr.message}`, 'error');
      }
      
      // Test config values
      if (configManager.get && typeof configManager.get === 'function') {
        const appName = configManager.get('app.name');
        if (appName) {
          log(`Config manager can retrieve app.name: ${appName}`, 'success');
        } else {
          log('Config manager failed to retrieve app.name', 'error');
        }

        // Test a few other critical config values
        const supabaseUrl = configManager.get('supabase.url');
        if (supabaseUrl) {
          log(`Config manager can retrieve supabase.url: ${supabaseUrl}`, 'success');
        } else {
          log('Config manager failed to retrieve supabase.url', 'error');
        }
      } else {
        log('Config manager does not have expected get() method', 'error');
      }
    } catch (err) {
      log(`Failed to load config manager: ${err.message}`, 'error');
    }
    
  } catch (err) {
    log(`Unexpected error in Node.js tests: ${err.message}`, 'error');
    console.error(err);
  }
}

/**
 * Browser environment tests
 */
async function testBrowserEnvironment() {
  log('Testing Browser Environment', 'info');
  
  // Test AppConfig
  try {
    if (window.AppConfig) {
      log('AppConfig is available in window', 'success');
      
      if (window.AppConfig.initialized) {
        log('AppConfig is already initialized', 'success');
        await testAppConfig(window.AppConfig);
      } else {
        log('AppConfig not initialized, attempting initialization...', 'info');
        try {
          await window.AppConfig.initialize();
          log('AppConfig initialization successful', 'success');
          await testAppConfig(window.AppConfig);
        } catch (err) {
          log(`AppConfig initialization failed: ${err.message}`, 'error');
        }
      }
    } else {
      log('AppConfig is not available in window', 'error');
    }
  } catch (err) {
    log(`Error testing AppConfig: ${err.message}`, 'error');
  }
  
  // Test Supabase Auth
  try {
    log('Testing Supabase Authentication', 'info');
    
    // Check for consolidated auth module
    if (window.SupabaseAuthManager) {
      log('SupabaseAuthManager is available', 'success');
      
      // Test if initialization method exists
      if (typeof window.SupabaseAuthManager.initialize === 'function') {
        log('SupabaseAuthManager has initialize method', 'success');
      } else {
        log('SupabaseAuthManager is missing initialize method', 'error');
      }
      
      // Test if getClient method exists
      if (typeof window.SupabaseAuthManager.getClient === 'function') {
        log('SupabaseAuthManager has getClient method', 'success');
        
        try {
          const client = await window.SupabaseAuthManager.getClient();
          if (client) {
            log('Successfully retrieved Supabase client from AuthManager', 'success');
          } else {
            log('Retrieved null Supabase client from AuthManager', 'error');
          }
        } catch (err) {
          log(`Error getting client from AuthManager: ${err.message}`, 'error');
        }
      } else {
        log('SupabaseAuthManager is missing getClient method', 'error');
      }
    } 
    // Check for auth loader
    else if (window.SupabaseAuthLoader) {
      log('SupabaseAuthLoader is available (but AuthManager is not)', 'warning');
      
      try {
        const client = await window.SupabaseAuthLoader.getClient();
        if (client) {
          log('Successfully retrieved Supabase client from AuthLoader', 'success');
        } else {
          log('Retrieved null Supabase client from AuthLoader', 'error');
        }
      } catch (err) {
        log(`Error getting client from AuthLoader: ${err.message}`, 'error');
      }
    }
    // Check for legacy supabase global
    else if (window.supabase) {
      log('Legacy supabase global is available (but AuthManager/AuthLoader are not)', 'warning');
    } 
    else {
      log('No Supabase auth modules detected', 'error');
    }
  } catch (err) {
    log(`Error testing Supabase auth: ${err.message}`, 'error');
  }
}

/**
 * Test the AppConfig object structure and values
 */
async function testAppConfig(appConfig) {
  const config = appConfig.config;
  
  if (!config) {
    log('AppConfig.config is not available', 'error');
    return;
  }
  
  log('Testing AppConfig structure', 'info');
  
  // Test each section and key
  for (const section in requiredClientConfig) {
    if (config[section]) {
      log(`Found config section: ${section}`, 'success');
      
      for (const key of requiredClientConfig[section]) {
        if (config[section][key] !== undefined) {
          log(`  - ${section}.${key} = ${typeof config[section][key] === 'object' ? '[Object]' : config[section][key]}`, 'success');
        } else {
          log(`  - ${section}.${key} is missing`, 'error');
        }
      }
    } else {
      log(`Missing config section: ${section}`, 'error');
    }
  }
}

/**
 * Run the tests
 */
if (isNode) {
  // In Node.js, run immediately
  runTests()
    .then(() => {
      if (testResults.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
} else {
  // In browser, wait for DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTests);
  } else {
    runTests();
  }
}
