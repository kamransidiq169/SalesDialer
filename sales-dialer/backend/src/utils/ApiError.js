/**
 * Custom API Error class with operational error support
 */
class ApiError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Array|null} errors - Array of validation errors
   */
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.message = message;
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a 400 Bad Request error
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static badRequest(message) {
    return new ApiError(message, 400);
  }

  /**
   * Create a 401 Unauthorized error
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(message, 401);
  }

  /**
   * Create a 403 Forbidden error
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static forbidden(message = 'Forbidden') {
    return new ApiError(message, 403);
  }

  /**
   * Create a 404 Not Found error
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static notFound(message = 'Resource not found') {
    return new ApiError(message, 404);
  }

  /**
   * Create a 409 Conflict error
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static conflict(message = 'Conflict') {
    return new ApiError(message, 409);
  }

  /**
   * Create a 422 Validation error
   * @param {Array} errors - Array of validation errors
   * @returns {ApiError}
   */
  static validation(errors) {
    return new ApiError('Validation failed', 422, errors);
  }

  /**
   * Create a 429 Too Many Requests error
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(message, 429);
  }
}

module.exports = ApiError;
