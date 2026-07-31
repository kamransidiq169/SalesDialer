const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Validation middleware runner
 * Runs express-validator checks and throws ApiError if validation fails
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Format errors for response
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    next(ApiError.validation(formattedErrors));
  };
};

module.exports = validate;
