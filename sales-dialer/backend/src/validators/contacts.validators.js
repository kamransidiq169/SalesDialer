const { body, query } = require('express-validator');

/**
 * Validation rules for creating a contact
 */
const createContactValidators = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .escape(),
  body('phone')
    .trim()
    .matches(/^[+]?[\d\s\-().]{7,20}$/)
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters')
    .escape(),
  body('status')
    .optional()
    .isIn(['new', 'contacted', 'interested', 'not_interested'])
    .withMessage('Invalid status value'),
];

/**
 * Validation rules for updating a contact
 */
const updateContactValidators = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .escape(),
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s\-().]{7,20}$/)
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters')
    .escape(),
  body('status')
    .optional()
    .isIn(['new', 'contacted', 'interested', 'not_interested'])
    .withMessage('Invalid status value'),
];

/**
 * Validation rules for contact query parameters
 */
const queryValidators = [
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
  query('search')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: 200 })
    .withMessage('Search query is too long'),
  query('status')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['new', 'contacted', 'interested', 'not_interested'])
    .withMessage('Invalid status filter'),
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'lastContactedAt', 'status'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Invalid sort order'),
];

module.exports = {
  createContactValidators,
  updateContactValidators,
  queryValidators,
};
