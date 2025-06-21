const { logger } = require('../../utils/logger');
const { NotFoundError, APIError } = require('../middleware/errorHandler');
const paymentService = require('../../services/payment/paymentService');
const blockchainService = require('../../services/blockchain/blockchainService');
const aiService = require('../../services/ai/aiService');

/**
 * Create a new payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createPayment = async (req, res, next) => {
  try {
    const { amount, sourceCurrency, targetCurrency, recipient } = req.body;
    const senderId = req.user.id;

    logger.debug('Creating payment', { amount, sourceCurrency, targetCurrency, recipient });

    // Use AI service to find optimal routing if enabled
    let routeInfo = null;
    if (process.env.ENABLE_AI_OPTIMIZATION === 'true') {
      routeInfo = await aiService.optimizeRoute(amount, sourceCurrency, targetCurrency);
      logger.debug('AI route optimization result', { routeInfo });
    }

    // Create payment in database
    const payment = await paymentService.createPayment({
      senderId,
      amount,
      sourceCurrency,
      targetCurrency,
      recipient,
      routeInfo
    });

    // Initiate blockchain transaction
    const blockchainTxn = await blockchainService.createPayment({
      paymentId: payment.id,
      senderId,
      amount: payment.amount,
      fee: payment.fee,
      recipient: payment.recipient,
      sourceCurrency: payment.sourceCurrency
    });

    // Update payment with blockchain transaction details
    const updatedPayment = await paymentService.updatePaymentWithTransaction(payment.id, blockchainTxn);

    res.status(201).json({
      success: true,
      data: {
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
        transactionHash: blockchainTxn.hash
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List payments with filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const listPayments = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const userId = req.user.id;

    const result = await paymentService.listPayments(userId, {
      status,
      startDate,
      endDate,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      data: result.payments,
      pagination: {
        total: result.total,
        page,
        limit,
        pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getPaymentDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await paymentService.getPaymentById(id);

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Verify user is authorized to view this payment
    if (payment.senderId !== userId) {
      throw new APIError('Unauthorized access to payment', 403);
    }

    // Get blockchain status if payment has a transaction
    let blockchainStatus = null;
    if (payment.transactionHash) {
      blockchainStatus = await blockchainService.getTransactionStatus(payment.transactionHash);
    }

    res.status(200).json({
      success: true,
      data: {
        ...payment,
        blockchainStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a pending payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const cancelPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await paymentService.getPaymentById(id);

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Verify user is authorized to cancel this payment
    if (payment.senderId !== userId) {
      throw new APIError('Unauthorized access to payment', 403);
    }

    // Verify payment is in a cancelable state
    if (payment.status !== 'created' && payment.status !== 'processing') {
      throw new APIError('Payment cannot be cancelled in its current state', 400);
    }

    // Cancel payment on blockchain
    const blockchainResult = await blockchainService.cancelPayment(payment.id, payment.transactionHash);

    // Update payment status in database
    const updatedPayment = await paymentService.updatePaymentStatus(payment.id, 'cancelled', {
      cancellationReason: 'User requested',
      cancellationTxHash: blockchainResult.hash
    });

    res.status(200).json({
      success: true,
      data: {
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
        cancellationTxHash: blockchainResult.hash
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  listPayments,
  getPaymentDetails,
  cancelPayment
}; 