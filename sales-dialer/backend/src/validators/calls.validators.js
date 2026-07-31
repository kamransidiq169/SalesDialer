const { body, query } = require('express-validator');

/**
 * Validation rules for starting a call
 */
const startCallValidators = [
  body('contactId')
    .notEmpty()
    .withMessage('Contact ID is required')
    .isUUID()
    .withMessage('Invalid contact ID format'),
];

/**
 * Validation rules for ending a call
 */
const endCallValidators = [
  body('callId')
    .notEmpty()
    .withMessage('Call ID is required')
    .isUUID()
    .withMessage('Invalid call ID format'),
];

/**
 * Validation rules for adding a call note
 */
const noteValidators = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Note content must be between 1 and 5000 characters')
    .escape(),
];

/**
 * Validation rules for call query parameters
 */
const callQueryValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('contactId')
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage('Invalid contact ID format'),
  query('sortBy')
    .optional()
    .isIn(['startTime', 'duration', 'createdAt', 'date'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Invalid sort order'),
];

module.exports = {
  startCallValidators,
  endCallValidators,
  noteValidators,
  callQueryValidators,
};
