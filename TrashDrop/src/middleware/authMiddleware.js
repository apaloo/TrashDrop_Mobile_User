const { supabase, jwtHelpers } = require('../config/supabase');

// Environment check
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Main authentication middleware
 * Verifies JWT tokens and attaches user to request
 */
exports.authenticateUser = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check for development token
    if (isDevelopment && token.startsWith('dev-token-')) {
      console.log('Development token detected, bypassing JWT verification');
      
      // Get the mock user from localStorage on the server side
      const mockUserId = token.split('-')[2];
      req.user = {
        id: `dev-user-${mockUserId || Date.now()}`,
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      };
      
      return next();
    }
    
    // First try to verify with our custom JWT
    const jwtVerification = jwtHelpers.verifyToken(token);
    
    if (jwtVerification.valid) {
      // JWT is valid, set user info from decoded token
      req.user = jwtVerification.decoded;
      console.log('User authenticated with custom JWT:', req.user.sub);
      return next();
    }
    
    // If JWT verification fails, try Supabase verification
    const { data, error } = await supabase.supabase.auth.getUser(token);
    
    if (error || !data.user) {
      console.error('Token verification failed:', error?.message || 'Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Add user to request object
    req.user = data.user;
    console.log('User authenticated with Supabase JWT:', req.user.id);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Role-based authentication middleware
 * Ensures the user has the required role
 * @param {string[]} roles - Array of allowed roles
 */
exports.checkRole = (roles) => {
  return (req, res, next) => {
    // Skip role check in development mode
    if (isDevelopment) {
      return next();
    }
    
    // Make sure user exists
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has one of the required roles
    const userRole = req.user.role || 'user';
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  };
};
