/**
 * API Response Utility
 * 
 * Provides consistent response formatting for all API endpoints.
 */

const { logger } = require('./logger');
const { getAppVersion } = require('./env');

/**
 * Success response
 * @param {object} res - Express response object
 * @param {*} data - Response data
 * @param {string} [message='Success'] - Success message
 * @param {number} [statusCode=200] - HTTP status code
 * @param {object} [meta] - Additional metadata
 * @returns {object} - Formatted success response
 */
const success = (res, data = null, message = 'Success', statusCode = 200, meta = {}) => {
  const response = {
    success: true,
    status: statusCode,
    message,
    version: getAppVersion(),
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} [code] - Error code
 * @param {Error} [error] - Error object for logging
 * @param {object} [meta] - Additional metadata
 * @returns {object} - Formatted error response
 */
const error = (res, message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', error = null, meta = {}) => {
  // Log the error if provided
  if (error) {
    logger.error(message, error, { statusCode, code, ...meta });
  } else if (statusCode >= 500) {
    // Log server errors even without error object
    logger.error(message, { statusCode, code, ...meta });
  } else {
    // Log client errors at warning level
    logger.warn(message, { statusCode, code, ...meta });
  }

  const response = {
    success: false,
    status: statusCode,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && error ? { details: error.message } : {}),
      ...(process.env.NODE_ENV === 'development' && error?.stack ? { stack: error.stack } : {}),
    },
    version: getAppVersion(),
    timestamp: new Date().toISOString(),
    ...meta,
  };

  return res.status(statusCode).json(response);
};

/**
 * Not Found response (404)
 * @param {object} res - Express response object
 * @param {string} [message='Resource not found'] - Error message
 * @param {string} [code='NOT_FOUND'] - Error code
 * @returns {object} - Formatted 404 response
 */
const notFound = (res, message = 'Resource not found', code = 'NOT_FOUND') => {
  return error(res, message, 404, code);
};

/**
 * Bad Request response (400)
 * @param {object} res - Express response object
 * @param {string|object} errors - Error message or validation errors object
 * @param {string} [code='BAD_REQUEST'] - Error code
 * @returns {object} - Formatted 400 response
 */
const badRequest = (res, errors, code = 'BAD_REQUEST') => {
  if (typeof errors === 'string') {
    return error(res, errors, 400, code);
  }
  
  // Handle validation errors
  if (errors && errors.details) {
    const validationErrors = {};
    errors.details.forEach((detail) => {
      const key = detail.path.join('.');
      validationErrors[key] = detail.message;
    });
    
    return error(
      res,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      null,
      { errors: validationErrors }
    );
  }
  
  // Handle other error objects
  return error(
    res,
    'Invalid request data',
    400,
    code,
    null,
    { errors }
  );
};

/**
 * Unauthorized response (401)
 * @param {object} res - Express response object
 * @param {string} [message='Unauthorized'] - Error message
 * @param {string} [code='UNAUTHORIZED'] - Error code
 * @returns {object} - Formatted 401 response
 */
const unauthorized = (res, message = 'Unauthorized', code = 'UNAUTHORIZED') => {
  return error(res, message, 401, code);
};

/**
 * Forbidden response (403)
 * @param {object} res - Express response object
 * @param {string} [message='Forbidden'] - Error message
 * @param {string} [code='FORBIDDEN'] - Error code
 * @returns {object} - Formatted 403 response
 */
const forbidden = (res, message = 'Forbidden', code = 'FORBIDDEN') => {
  return error(res, message, 403, code);
};

/**
 * Conflict response (409)
 * @param {object} res - Express response object
 * @param {string} [message='Conflict'] - Error message
 * @param {string} [code='CONFLICT'] - Error code
 * @returns {object} - Formatted 409 response
 */
const conflict = (res, message = 'Conflict', code = 'CONFLICT') => {
  return error(res, message, 409, code);
};

/**
 * Rate limit exceeded response (429)
 * @param {object} res - Express response object
 * @param {string} [message='Too many requests'] - Error message
 * @param {string} [code='RATE_LIMIT_EXCEEDED'] - Error code
 * @returns {object} - Formatted 429 response
 */
const tooManyRequests = (res, message = 'Too many requests', code = 'RATE_LIMIT_EXCEEDED') => {
  return error(res, message, 429, code);
};

/**
 * Internal server error response (500)
 * @param {object} res - Express response object
 * @param {string} [message='Internal server error'] - Error message
 * @param {Error} [error] - Error object for logging
 * @param {string} [code='INTERNAL_SERVER_ERROR'] - Error code
 * @returns {object} - Formatted 500 response
 */
const internalError = (res, message = 'Internal server error', error = null, code = 'INTERNAL_SERVER_ERROR') => {
  return error(res, message, 500, code, error);
};

module.exports = {
  success,
  error,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  conflict,
  tooManyRequests,
  internalError,
  // Aliases for common status codes
  ok: (res, data, message, meta) => success(res, data, message, 200, meta),
  created: (res, data, message = 'Resource created', meta) => success(res, data, message, 201, meta),
  noContent: (res, message = 'No content') => success(res, null, message, 204),
  validationError: (res, errors, message = 'Validation failed') => badRequest(res, errors, 'VALIDATION_ERROR'),
  serviceUnavailable: (res, message = 'Service temporarily unavailable', error = null) => 
    error(res, message, 503, 'SERVICE_UNAVAILABLE', error),
};
