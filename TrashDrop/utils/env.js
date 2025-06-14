/**
 * Environment and Configuration Utilities
 * 
 * This module provides utilities for working with environment variables
 * and application configuration.
 */

const config = require('../app.config');

/**
 * Get a configuration value using dot notation
 * @param {string} path - Dot notation path to the config value (e.g., 'app.name')
 * @param {*} defaultValue - Default value if the path doesn't exist
 * @returns {*}
 */
function getConfig(path, defaultValue = undefined) {
  return path.split('.').reduce((obj, key) => {
    return (obj && obj[key] !== undefined) ? obj[key] : defaultValue;
  }, config);
}

/**
 * Get an environment variable with a default value
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if the variable is not set
 * @returns {*}
 */
function getEnv(key, defaultValue = '') {
  return process.env[key] !== undefined ? process.env[key] : defaultValue;
}

/**
 * Get a required environment variable (throws if not set)
 * @param {string} key - Environment variable name
 * @returns {string}
 * @throws {Error} If the environment variable is not set
 */
function getRequiredEnv(key) {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Check if the application is running in production
 * @returns {boolean}
 */
function isProduction() {
  return getConfig('app.env') === 'production';
}

/**
 * Check if the application is running in development
 * @returns {boolean}
 */
function isDevelopment() {
  return getConfig('app.env') === 'development';
}

/**
 * Check if the application is running in test mode
 * @returns {boolean}
 */
function isTest() {
  return getConfig('app.env') === 'test';
}

/**
 * Get the current environment name
 * @returns {string}
 */
function getEnvironment() {
  return getConfig('app.env');
}

/**
 * Get the application name
 * @returns {string}
 */
function getAppName() {
  return getConfig('app.name', 'TrashDrop');
}

/**
 * Get the application version
 * @returns {string}
 */
function getAppVersion() {
  return getConfig('app.version', '1.0.0');
}

module.exports = {
  config,
  getConfig,
  getEnv,
  getRequiredEnv,
  isProduction,
  isDevelopment,
  isTest,
  getEnvironment,
  getAppName,
  getAppVersion,
  // Export commonly used configs for convenience
  app: config.app,
  firebase: config.firebase,
  api: config.api,
  security: config.security,
  logging: config.logging,
  client: config.client,
};
