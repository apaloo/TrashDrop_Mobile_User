/**
 * Authentication Middleware
 * 
 * Middleware for authenticating and authorizing requests using Firebase Auth.
 */

const admin = require('firebase-admin');
const { unauthorized, forbidden } = require('./errorHandler');
const { logger } = require('../utils/logger');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    logger.info('Firebase Admin initialized in auth middleware');
  } catch (error) {
    logger.error('Firebase Admin initialization error in auth middleware', { error });
  }
}

/**
 * Middleware to verify Firebase ID token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function verifyToken(req, res, next) {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      logger.warn('No token provided', { url: req.originalUrl, method: req.method });
      return unauthorized(res, 'Authentication token is required');
    }

    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (!decodedToken || !decodedToken.uid) {
      logger.warn('Invalid token', { url: req.originalUrl, method: req.method });
      return unauthorized(res, 'Invalid authentication token');
    }

    // Add the decoded token to the request object
    req.user = decodedToken;
    req.userId = decodedToken.uid;
    
    logger.debug('User authenticated', { 
      userId: decodedToken.uid, 
      email: decodedToken.email,
      method: req.method,
      url: req.originalUrl 
    });
    
    next();
  } catch (error) {
    logger.error('Token verification failed', { 
      error: error.message, 
      url: req.originalUrl, 
      method: req.method 
    });
    
    if (error.code === 'auth/id-token-expired') {
      return unauthorized(res, 'Token has expired');
    }
    
    if (error.code === 'auth/argument-error') {
      return unauthorized(res, 'Invalid token format');
    }
    
    return unauthorized(res, 'Authentication failed');
  }
}

/**
 * Middleware to check if the authenticated user has required roles
 * @param {string|Array} roles - Required role(s) to access the route
 * @returns {Function} Express middleware function
 */
function checkRole(roles) {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated first
      await verifyToken(req, res, (err) => {
        if (err) return next(err);
      });

      // If no roles are required, just continue
      if (!roles || roles.length === 0) {
        return next();
      }

      // Convert single role to array for consistent handling
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      // Get the user's custom claims (roles)
      const user = await admin.auth().getUser(req.userId);
      const userRoles = user.customClaims?.roles || [];
      
      // Check if user has any of the required roles
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        logger.warn('Insufficient permissions', { 
          userId: req.userId, 
          requiredRoles, 
          userRoles,
          url: req.originalUrl,
          method: req.method 
        });
        return forbidden(res, 'Insufficient permissions');
      }
      
      // Add user roles to request object for use in subsequent middleware
      req.user.roles = userRoles;
      
      next();
    } catch (error) {
      logger.error('Role check failed', { 
        error: error.message, 
        userId: req.userId, 
        url: req.originalUrl,
        method: req.method 
      });
      next(error);
    }
  };
}

/**
 * Middleware to check if the authenticated user is the owner of the resource
 * @param {string} resourcePath - Path to the resource ID in req.params
 * @param {string} collection - Firestore collection name
 * @param {string} userIdField - Field name that contains the user ID in the document
 * @returns {Function} Express middleware function
 */
function checkOwnership(resourcePath, collection, userIdField = 'userId') {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated first
      await verifyToken(req, res, (err) => {
        if (err) return next(err);
      });

      const resourceId = req.params[resourcePath];
      
      if (!resourceId) {
        logger.warn('Resource ID not provided', { 
          resourcePath, 
          url: req.originalUrl,
          method: req.method 
        });
        return badRequest(res, 'Resource ID is required');
      }

      // Get the resource from Firestore
      const doc = await admin.firestore().collection(collection).doc(resourceId).get();
      
      if (!doc.exists) {
        logger.warn('Resource not found', { 
          resourceId, 
          collection,
          url: req.originalUrl,
          method: req.method 
        });
        return notFound(res, 'Resource not found');
      }
      
      const resourceData = doc.data();
      
      // Check if the user is the owner of the resource
      if (resourceData[userIdField] !== req.userId) {
        logger.warn('Access denied - not resource owner', { 
          userId: req.userId, 
          resourceOwner: resourceData[userIdField],
          resourceId,
          collection,
          url: req.originalUrl,
          method: req.method 
        });
        return forbidden(res, 'You do not have permission to access this resource');
      }
      
      // Add the resource to the request object for use in subsequent middleware
      req.resource = resourceData;
      req.resource.id = doc.id;
      
      next();
    } catch (error) {
      logger.error('Ownership check failed', { 
        error: error.message, 
        resourcePath, 
        collection,
        url: req.originalUrl,
        method: req.method 
      });
      next(error);
    }
  };
}

module.exports = {
  verifyToken,
  checkRole,
  checkOwnership,
  // Common roles (customize based on your application's needs)
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    DRIVER: 'driver',
    STAFF: 'staff',
  },
};
