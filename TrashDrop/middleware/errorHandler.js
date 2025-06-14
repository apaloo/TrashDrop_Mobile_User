/**
 * Error Handling Middleware
 * 
 * Centralized error handling for Express applications.
 */

const { logger } = require('../utils/logger');
const { isProduction } = require('../utils/env');
const { internalError } = require('../utils/apiResponse');

/**
 * Error handler middleware for Express
 * @param {Error} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // Default to 500 Internal Server Error if status code is not set
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const errors = err.errors;
  const stack = isProduction() ? undefined : err.stack;

  // Log the error
  logger.error(message, {
    statusCode,
    code,
    stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous',
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Handle Mongoose validation errors
    const validationErrors = {};
    for (const field in err.errors) {
      validationErrors[field] = err.errors[field].message;
    }
    return res.status(400).json({
      success: false,
      status: 400,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: validationErrors,
      },
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      status: 401,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      status: 401,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      status: 413,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size is too large',
      },
    });
  }

  // Handle rate limit errors
  if (err.statusCode === 429) {
    return res.status(429).json({
      success: false,
      status: 429,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: err.retryAfter,
      },
    });
  }

  // Handle 404 errors
  if (statusCode === 404) {
    return res.status(404).json({
      success: false,
      status: 404,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  }

  // For all other errors, return the appropriate status code and message
  const errorResponse = {
    success: false,
    status: statusCode,
    error: {
      code,
      message,
      ...(errors && { errors }),
      ...(!isProduction() && { stack }), // Only include stack trace in non-production
    },
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found middleware
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

/**
 * Async handler wrapper to catch async/await errors
 * @param {function} fn - Async route handler function
 * @returns {function} Wrapped async function with error handling
 */
function asyncHandler(fn) {
  return function(req, res, next) {
    return Promise
      .resolve(fn(req, res, next))
      .catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  // Common error constructors
  createError: (statusCode, message, code, errors) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    if (errors) error.errors = errors;
    return error;
  },
  badRequest: (message = 'Bad Request', code = 'BAD_REQUEST', errors) => {
    const error = new Error(message);
    error.statusCode = 400;
    error.code = code;
    if (errors) error.errors = errors;
    return error;
  },
  unauthorized: (message = 'Unauthorized', code = 'UNAUTHORIZED') => {
    const error = new Error(message);
    error.statusCode = 401;
    error.code = code;
    return error;
  },
  forbidden: (message = 'Forbidden', code = 'FORBIDDEN') => {
    const error = new Error(message);
    error.statusCode = 403;
    error.code = code;
    return error;
  },
  notFound: (message = 'Not Found', code = 'NOT_FOUND') => {
    const error = new Error(message);
    error.statusCode = 404;
    error.code = code;
    return error;
  },
  conflict: (message = 'Conflict', code = 'CONFLICT') => {
    const error = new Error(message);
    error.statusCode = 409;
    error.code = code;
    return error;
  },
  internal: (message = 'Internal Server Error', code = 'INTERNAL_SERVER_ERROR') => {
    const error = new Error(message);
    error.statusCode = 500;
    error.code = code;
    return error;
  },
};
