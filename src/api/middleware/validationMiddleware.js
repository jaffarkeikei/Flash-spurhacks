const { validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

/**
 * Validation middleware for express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (errors.isEmpty()) {
    return next();
  }
  
  const validationErrors = errors.array().map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value
  }));
  
  next(new ValidationError('Validation failed', validationErrors));
};

/**
 * Common validation chains for reuse
 */
const commonValidations = {
  // Currency code validation
  currencyCode: (field) => [
    field
      .isString()
      .withMessage('Currency code must be a string')
      .isLength({ min: 3, max: 5 })
      .withMessage('Currency code must be 3-5 characters')
      .isUppercase()
      .withMessage('Currency code must be uppercase')
  ],
  
  // Amount validation
  amount: (field) => [
    field
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number')
  ],
  
  // Pagination validation
  pagination: (queryPage, queryLimit) => [
    queryPage
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    queryLimit
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt()
  ]
};

module.exports = {
  validate,
  commonValidations
}; 