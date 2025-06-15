const { supabase, jwtHelpers } = require('../config/supabase');

// Environment check
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Main authentication middleware
 * Verifies JWT tokens and attaches user to request
 */
exports.authenticateUser = async (req, res, next) => {
  try {
    // Enhanced debugging to show all request path information
    console.log('Auth middleware debug info:');
    console.log(`- req.path: ${req.path}`);
    console.log(`- req.baseUrl: ${req.baseUrl}`);
    console.log(`- req.originalUrl: ${req.originalUrl}`);
    console.log(`- req.url: ${req.url}`);
    
    // DEVELOPMENT BYPASS: Always bypass auth for any /bags/user or /user request in development
    // Use a more flexible path matching that works with mounted routers
    if (isDevelopment || process.env.FORCE_DEV_BYPASS) {
      // Check various path combinations to ensure we catch the right requests
      const isUserPath = (
        req.path === '/user' || 
        req.originalUrl === '/api/bags/user' || 
        req.originalUrl.endsWith('/bags/user')
      );
      
      if (isUserPath) {
        console.log('DEVELOPMENT BYPASS: Skipping authentication for bags/user endpoint');
        console.log(`Request path: ${req.originalUrl}`);
        
        // Create a mock user for development
        req.user = {
          id: 'dev-user-automated',
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        };
        
        return next();
      }
    }
    
    // Get token from multiple sources (header, cookie, query param)
    let token = req.headers.authorization?.split(' ')[1];
    
    // Check if request is coming from ngrok domain
    const isNgrok = req.headers.host && req.headers.host.includes('ngrok-free.app');
    
    // For ngrok requests, also check query params and cookies as fallbacks
    if (isNgrok && !token) {
      // Try to get token from query parameter (useful for ngrok debugging)
      token = req.query.token;
      
      // If still no token, try cookies
      if (!token && req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
      }
      
      // Log that we're handling an ngrok request
      console.log(`Handling ngrok domain request from ${req.headers.host}`); 
    }
    
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
