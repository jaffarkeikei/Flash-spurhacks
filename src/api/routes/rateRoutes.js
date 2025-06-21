const express = require('express');
const { query, param } = require('express-validator');
const rateController = require('../controllers/rateController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route GET /api/v1/rates
 * @desc Get current exchange rates
 * @access Public
 */
router.get(
  '/',
  [
    query('sourceCurrency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 5 })
      .withMessage('Source currency must be a valid currency code'),
    query('targetCurrency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 5 })
      .withMessage('Target currency must be a valid currency code')
  ],
  validationMiddleware.validate,
  rateController.getCurrentRates
);

/**
 * @route GET /api/v1/rates/:sourceCurrency/:targetCurrency
 * @desc Get specific exchange rate
 * @access Public
 */
router.get(
  '/:sourceCurrency/:targetCurrency',
  [
    param('sourceCurrency')
      .isString()
      .isLength({ min: 3, max: 5 })
      .withMessage('Source currency must be a valid currency code'),
    param('targetCurrency')
      .isString()
      .isLength({ min: 3, max: 5 })
      .withMessage('Target currency must be a valid currency code')
  ],
  validationMiddleware.validate,
  rateController.getSpecificRate
);

/**
 * @route GET /api/v1/rates/history
 * @desc Get historical exchange rates
 * @access Private
 */
router.get(
  '/history',
  authMiddleware.authenticate,
  [
    query('sourceCurrency')
      .isString()
      .isLength({ min: 3, max: 5 })
      .withMessage('Source currency must be a valid currency code'),
    query('targetCurrency')
      .isString()
      .isLength({ min: 3, max: 5 })
      .withMessage('Target currency must be a valid currency code'),
    query('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date')
  ],
  validationMiddleware.validate,
  rateController.getRateHistory
);

/**
 * @route GET /api/v1/rates/supported
 * @desc Get list of supported currencies
 * @access Public
 */
router.get(
  '/supported',
  rateController.getSupportedCurrencies
);

module.exports = router; 