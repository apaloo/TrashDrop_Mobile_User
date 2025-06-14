/**
 * Request Validation Middleware
 * 
 * Middleware for validating request data against Joi schemas.
 */

const Joi = require('joi');
const { badRequest } = require('./errorHandler');
const { logger } = require('../utils/logger');

/**
 * Validates request data against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} [source='body'] - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      // Get the data to validate from the request
      const data = req[source];
      
      // Validate the data against the schema
      const { error, value } = schema.validate(data, {
        abortEarly: false, // Return all validation errors, not just the first one
        allowUnknown: true, // Allow unknown keys that will be ignored
        stripUnknown: true, // Remove unknown keys from the validated data
      });

      // If validation fails, return a 400 error
      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/["']/g, ''), // Remove quotes from error messages
          type: detail.type,
        }));

        logger.warn('Validation failed', {
          url: req.originalUrl,
          method: req.method,
          source,
          errors,
        });

        return badRequest(
          res,
          'Validation failed',
          'VALIDATION_ERROR',
          null,
          { errors }
        );
      }


      // Replace the request data with the validated and sanitized data
      req[source] = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error', { error: err });
      next(err);
    }
  };
}

/**
 * Validates request parameters against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateParams(schema) {
  return validate(schema, 'params');
}

/**
 * Validates query parameters against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateQuery(schema) {
  return validate(schema, 'query');
}

/**
 * Validates request body against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateBody(schema) {
  return validate(schema, 'body');
}

// Common validation schemas
const schemas = {
  // Authentication
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  // User registration
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  }),

  // Password reset request
  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  // Reset password
  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  }),

  // Report submission
  report: Joi.object({
    title: Joi.string().min(5).max(100).required(),
    description: Joi.string().max(1000),
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      address: Joi.string().required(),
    }).required(),
    wasteType: Joi.string().valid(
      'general', 'hazardous', 'recyclable', 'organic', 'e-waste', 'other'
    ).required(),
    severity: Joi.string().valid('low', 'medium', 'high').default('medium'),
    images: Joi.array().items(Joi.string().uri()).max(5),
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().pattern(/^[a-zA-Z0-9_,. ]+$/),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Search
  search: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    filters: Joi.object(),
  }),

  // File upload
  fileUpload: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().integer().min(1).required(),
    destination: Joi.string().required(),
    filename: Joi.string().required(),
    path: Joi.string().required(),
  }),
};

module.exports = {
  validate,
  validateParams,
  validateQuery,
  validateBody,
  schemas,
  Joi, // Export Joi for custom schemas
};
