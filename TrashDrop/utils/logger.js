/**
 * Logger Utility
 * 
 * A configurable logging utility that supports different log levels and transports.
 */

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, json } = format;
const path = require('path');
const fs = require('fs');
const { app } = require('../app.config');
const { isProduction, isTest } = require('./env');

// Ensure logs directory exists
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  const stackString = stack ? `\n${stack}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${metaString}${stackString}`;
});

// Create console transport
const consoleTransport = new transports.Console({
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    logFormat
  ),
  level: isTest ? 'error' : 'debug', // Only log errors in test mode
});

// Create file transport for production
const fileTransports = [];

if (isProduction) {
  fileTransports.push(
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: combine(
        timestamp(),
        format.errors({ stack: true }),
        json()
      ),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: combine(
        timestamp(),
        json()
      ),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );
}

// Create logger instance
const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  defaultMeta: { service: app.name },
  transports: [consoleTransport, ...fileTransports],
  exitOnError: false, // Don't exit on handled exceptions
});

// Handle uncaught exceptions
if (isProduction) {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Don't exit in production, let the process manager handle it
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// Add stream for morgan HTTP request logging
logger.stream = {
  write: (message) => {
    // Remove newline character at the end
    const logMessage = message.trim();
    // Skip health check requests in production
    if (isProduction && (logMessage.includes('GET /healthz') || logMessage.includes('GET /ready') || logMessage.includes('GET /live'))) {
      return;
    }
    logger.http(logMessage);
  },
};

/**
 * Log a debug message
 * @param {string} message - The message to log
 * @param {object} [meta] - Additional metadata to include in the log
 */
const debug = (message, meta) => logger.debug(message, meta);

/**
 * Log an info message
 * @param {string} message - The message to log
 * @param {object} [meta] - Additional metadata to include in the log
 */
const info = (message, meta) => logger.info(message, meta);

/**
 * Log a warning message
 * @param {string} message - The message to log
 * @param {object} [meta] - Additional metadata to include in the log
 */
const warn = (message, meta) => logger.warn(message, meta);

/**
 * Log an error message
 * @param {string} message - The message to log
 * @param {Error} [error] - The error object to log
 * @param {object} [meta] - Additional metadata to include in the log
 */
const error = (message, error, meta = {}) => {
  if (error instanceof Error) {
    meta.stack = error.stack;
    meta.error = {
      message: error.message,
      name: error.name,
      ...(error.code && { code: error.code }),
    };
    logger.error(message, meta);
  } else {
    // If second argument is not an error, treat it as metadata
    logger.error(message, error || meta);
  }
};

/**
 * Log an HTTP request/response
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {number} [responseTime] - Response time in milliseconds
 */
const http = (req, res, responseTime) => {
  const meta = {
    method: req.method,
    url: req.originalUrl || req.url,
    status: res.statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer'),
  };

  // Log request body for non-GET requests (except sensitive data)
  if (req.method !== 'GET' && req.body) {
    const body = { ...req.body };
    
    // Redact sensitive fields
    const sensitiveFields = ['password', 'newPassword', 'confirmPassword', 'token', 'accessToken', 'refreshToken'];
    sensitiveFields.forEach(field => {
      if (body[field]) {
        body[field] = '***REDACTED***';
      }
    });
    
    meta.body = body;
  }

  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    meta.query = req.query;
  }

  // Log user info if available
  if (req.user) {
    meta.user = {
      id: req.user.uid || req.user.id,
      email: req.user.email,
      // Don't include sensitive user data here
    };
  }

  logger.http(`${req.method} ${req.originalUrl || req.url}`, meta);
};

module.exports = {
  logger,
  debug,
  info,
  warn,
  error,
  http,
  stream: logger.stream,
};
