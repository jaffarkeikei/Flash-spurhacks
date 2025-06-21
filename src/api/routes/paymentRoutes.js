const express = require('express');
const { body, param, query } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route POST /api/v1/payments
 * @desc Create a new payment
 * @access Private
 */
router.post(
  '/',
  authMiddleware.authenticate,
  [
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('sourceCurrency')
      .isString()
      .isLength({ min: 3, max: 5 })
      .withMessage('Source currency must be a valid currency code'),
    body('targetCurrency')
      .isString()
      .isLength({ min: 3, max: 5 })
      .withMessage('Target currency must be a valid currency code'),
    body('recipient')
      .isString()
      .withMessage('Recipient address is required')
  ],
  validationMiddleware.validate,
  paymentController.createPayment
);

/**
 * @route GET /api/v1/payments
 * @desc List payments with filters
 * @access Private
 */
router.get(
  '/',
  authMiddleware.authenticate,
  [
    query('status').optional().isString(),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  validationMiddleware.validate,
  paymentController.listPayments
);

/**
 * @route GET /api/v1/payments/:id
 * @desc Get payment details
 * @access Private
 */
router.get(
  '/:id',
  authMiddleware.authenticate,
  [
    param('id').isString().withMessage('Payment ID is required')
  ],
  validationMiddleware.validate,
  paymentController.getPaymentDetails
);

/**
 * @route POST /api/v1/payments/:id/cancel
 * @desc Cancel a pending payment
 * @access Private
 */
router.post(
  '/:id/cancel',
  authMiddleware.authenticate,
  [
    param('id').isString().withMessage('Payment ID is required')
  ],
  validationMiddleware.validate,
  paymentController.cancelPayment
);

module.exports = router; 