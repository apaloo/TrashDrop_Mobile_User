/**
 * Rate Limiting Middleware
 * 
 * Provides rate limiting for API endpoints to prevent abuse and ensure fair usage.
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');
const { isProduction } = require('../utils/env');

// In-memory store for rate limiting (use Redis in production for distributed systems)
const MemoryStore = require('rate-limit-mongo').MemoryStore;

/**
 * Create a rate limiter with the specified options
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} [options.keyGenerator] - Function to generate rate limit key
 * @param {boolean} [options.standardHeaders] - Enable standard rate limit headers
 * @param {boolean} [options.legacyHeaders] - Enable legacy rate limit headers
 * @returns {Function} Express rate limiter middleware
 */
function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 100, // limit each IP to 100 requests per windowMs
  keyGenerator = (req) => req.ip, // Default to IP-based limiting
  standardHeaders = true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders = false, // Disable the `X-RateLimit-*` headers
  skip = (req) => false, // Function to skip rate limiting for certain requests
  message = 'Too many requests, please try again later.',
  statusCode = 429,
  skipFailedRequests = false, // Skip counting failed requests (status >= 400)
  skipSuccessfulRequests = false, // Skip counting successful requests (status < 400)
  skipOnEnv = ['test'], // Skip rate limiting in test environment
} = {}) {
  // Skip rate limiting in test environment
  if (skipOnEnv.includes(process.env.NODE_ENV)) {
    return (req, res, next) => next();
  }

  // Create rate limiter
  const limiter = rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders,
    legacyHeaders,
    skip,
    message: { success: false, error: message },
    statusCode,
    skipFailedRequests,
    skipSuccessfulRequests,
    // Custom store that logs rate limit events
    store: new MemoryStore({
      windowMs,
      // Handler for when a client exceeds the rate limit
      onLimitReached: (key, req) => {
        logger.warn('Rate limit reached', {
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          key,
          userAgent: req.get('user-agent'),
          userId: req.user?.uid || 'anonymous',
        });
      },
    }),
    // Custom handler for when rate limit is exceeded
    handler: (req, res, next, options) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('user-agent'),
        userId: req.user?.uid || 'anonymous',
      });
      
      res.status(options.statusCode).json({
        success: false,
        status: options.statusCode,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message.error,
          retryAfter: req.rateLimit.resetTime - Date.now(),
        },
      });
    },
  });

  return limiter;
}

// Common rate limiter configurations
const rateLimiters = {
  // Strict rate limiter for authentication endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per window
    message: 'Too many login attempts, please try again later.',
  }),
  
  // Standard API rate limiter
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
  }),
  
  // Public endpoints rate limiter (more lenient)
  public: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // Limit each IP to 1000 requests per hour
  }),
  
  // Strict rate limiter for sensitive operations
  sensitive: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 requests per hour
    message: 'Too many attempts, please try again later.',
  }),
  
  // Per-user rate limiter (requires authentication)
  user: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each user to 200 requests per window
    keyGenerator: (req) => req.user?.uid || req.ip, // Fallback to IP if not authenticated
  }),
};

/**
 * Middleware to skip rate limiting for certain IPs (e.g., internal services, load balancers)
 * @param {Array|string} trustedIps - Array of trusted IPs or CIDR ranges
 * @returns {Function} Express middleware function
 */
function skipRateLimitForIps(trustedIps) {
  const ips = Array.isArray(trustedIps) ? trustedIps : [trustedIps];
  
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Skip rate limiting for trusted IPs
    if (ips.some(ip => {
      if (ip.includes('/')) {
        // CIDR notation (e.g., '192.168.1.0/24')
        const [subnet, bits] = ip.split('/');
        const subnetLong = ipToLong(subnet);
        const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1) >>> 0;
        return (ipToLong(clientIp) & mask) === (subnetLong & mask);
      }
      // Exact IP match
      return clientIp === ip;
    })) {
      return next('route'); // Skip to the next route handler
    }
    
    next();
  };
}

/**
 * Convert an IP address to a long integer
 * @private
 */
function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet, idx) => {
    return acc + (parseInt(octet, 10) << (8 * (3 - idx)));
  }, 0) >>> 0;
}

module.exports = {
  createRateLimiter,
  rateLimiters,
  skipRateLimitForIps,
};
