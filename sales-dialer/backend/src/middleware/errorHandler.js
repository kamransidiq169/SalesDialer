const { logger } = require('../config/logger');
const ApiError = require('../utils/ApiError');

/**
 * Global error handler middleware
 * Handles all error types and returns appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  if (process.env.NODE_ENV !== 'test') {
    if (err.statusCode >= 500 || !err.statusCode) {
      logger.error('Server Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        requestId: req.requestId,
      });
    } else {
      logger.warn('Client Error:', {
        message: err.message,
        statusCode: err.statusCode,
        url: req.originalUrl,
        method: req.method,
      });
    }
  }

  // Handle ApiError (custom operational errors)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Sequelize ValidationError
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
      type: e.type,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Sequelize UniqueConstraintError
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: `${e.path} already exists`,
    }));

    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Sequelize DatabaseError
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(400).json({
      success: false,
      message: 'Database error',
      timestamp: new Date().toISOString(),
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
      case 'MISSING_FILE':
        message = 'File is missing';
        break;
    }

    return res.status(400).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle SyntaxError (bad JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      timestamp: new Date().toISOString(),
    });
  }

  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'Cross-origin request blocked',
      timestamp: new Date().toISOString(),
    });
  }

  // Default: Internal server error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
