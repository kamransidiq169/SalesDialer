/**
 * Pagination helper utilities
 */

/**
 * Build pagination metadata from query results
 * @param {number} total - Total number of records
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
function buildPaginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  };
}

/**
 * Calculate offset for database queries
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @returns {number} Offset value
 */
function calculateOffset(page, limit) {
  return (page - 1) * limit;
}

/**
 * Sanitize and parse pagination parameters
 * @param {Object} query - Request query object
 * @param {Object} defaults - Default values
 * @returns {Object} Sanitized pagination params
 */
function sanitizePaginationParams(query, defaults = {}) {
  const page = Math.max(1, parseInt(query.page) || defaults.page || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(query.limit) || defaults.limit || 10)
  );

  return { page, limit, offset: calculateOffset(page, limit) };
}

module.exports = {
  buildPaginationMeta,
  calculateOffset,
  sanitizePaginationParams,
};
