/**
 * Special authentication middleware for ngrok domains
 * This middleware handles the authentication requirements when the app is accessed via ngrok
 */

const { jwtHelpers } = require('../config/supabase');

/**
 * Middleware to handle ngrok-specific authentication
 * This is needed because ngrok domains can have cross-domain issues with normal authentication
 */
const handleNgrokAuth = (req, res, next) => {
  // Check if request is from an ngrok domain
  const isNgrok = req.headers.host && req.headers.host.includes('ngrok-free.app');
  
  if (!isNgrok) {
    // If not an ngrok request, skip this middleware
    return next();
  }
  
  // Log ngrok request
  console.log(`Handling ngrok request from ${req.headers.host}`);
  
  // For ngrok requests, make sure CORS headers are set correctly
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // For OPTIONS requests (preflight), return immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Try to get token from various sources
  let token = null;
  
  // 1. Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // 2. Check query parameter (useful for debugging with ngrok)
  if (!token && req.query && req.query.token) {
    token = req.query.token;
    console.log('Using token from query parameter');
  }
  
  // 3. Check cookies
  if (!token && req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
    console.log('Using token from cookie');
  }
  
  // If we have a token, verify it and set user info
  if (token) {
    try {
      // First try our custom JWT verification
      const jwtVerification = jwtHelpers.verifyToken(token);
      
      if (jwtVerification.valid) {
        // Set user from decoded token
        req.user = jwtVerification.decoded;
        console.log('Ngrok auth: User authenticated with JWT');
        return next();
      }
      
      // For development, allow dev tokens
      if (token.startsWith('dev-token-')) {
        const mockUserId = token.split('-')[2];
        req.user = {
          id: `dev-user-${mockUserId || Date.now()}`,
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        };
        console.log('Ngrok auth: Using development token');
        return next();
      }
      
      // If we got here, the token is invalid
      console.log('Ngrok auth: Invalid token');
    } catch (error) {
      console.error('Ngrok auth error:', error);
    }
  }
  
  // For ngrok testing in development, allow unauthenticated requests
  if (process.env.NODE_ENV !== 'production') {
    console.log('Ngrok auth: Allowing unauthenticated request in development mode');
    req.user = {
      id: 'dev-user-ngrok',
      role: 'user',
      isNgrokDevUser: true
    };
    return next();
  }
  
  // If we get here, authentication failed
  return res.status(401).json({
    error: 'Authentication failed',
    message: 'Unable to authenticate with the provided credentials via ngrok',
    host: req.headers.host
  });
};

module.exports = {
  handleNgrokAuth
};
