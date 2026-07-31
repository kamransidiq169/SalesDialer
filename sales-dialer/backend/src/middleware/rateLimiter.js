const rateLimit = require('express-rate-limit');

/**
 * JSON response formatter for rate limit errors
 */
const rateLimitHandler = (req, res, next) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: Math.round(req.rateLimit.resetTime / 1000) || 900,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Auth rate limiter - 5 requests per 15 minutes
 * Applied to login endpoint to prevent brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes',
    retryAfter: 900,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => req.path === '/api/health', // Skip health check
});

/**
 * API rate limiter - 100 requests per 15 minutes
 * General API protection for all authenticated endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: 900,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => req.path === '/api/health',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip;
  },
});

/**
 * Upload rate limiter - 10 requests per hour
 * For CSV import endpoint to prevent abuse
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per window
  message: {
    success: false,
    message: 'Upload limit reached, please try again later',
    retryAfter: 3600,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

/**
 * Strict rate limiter - 10 requests per minute
 * For sensitive operations like password changes
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message: 'Rate limit exceeded, please slow down',
    retryAfter: 60,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  strictLimiter,
};
