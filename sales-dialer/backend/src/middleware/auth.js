const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { logger } = require('../config/logger');

/**
 * JWT Authentication middleware
 * Verifies the Bearer token and attaches user to request
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Token has expired. Please login again.');
      }
      throw ApiError.unauthorized('Invalid token. Please login again.');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (jwtError) {
      // Ignore JWT errors for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 * Must be used after auth middleware
 * @param {...string} allowedRoles - Roles that are allowed access
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} - Required role: ${allowedRoles.join(' or ')}`);
      return next(ApiError.forbidden('You do not have permission to access this resource'));
    }

    next();
  };
};

/**
 * Admin-only middleware shortcut
 */
const adminOnly = requireRole('admin');

module.exports = {
  auth,
  optionalAuth,
  requireRole,
  adminOnly,
};
