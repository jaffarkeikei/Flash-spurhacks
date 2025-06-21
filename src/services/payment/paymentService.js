const { logger } = require('../../utils/logger');
const { APIError } = require('../../api/middleware/errorHandler');
const { Payment } = require('../../db/models');
const { Op } = require('sequelize');

/**
 * Create a new payment
 * @param {Object} paymentData - Payment data
 * @returns {Object} Created payment
 */
const createPayment = async ({
  senderId,
  amount,
  sourceCurrency,
  targetCurrency,
  recipient,
  routeInfo
}) => {
  try {
    logger.debug('Creating payment record', { 
      senderId, 
      amount, 
      sourceCurrency, 
      targetCurrency 
    });
    
    // Calculate fee based on route optimization or default value
    const fee = routeInfo ? routeInfo.fee : (amount * 0.005); // Default 0.5%
    
    // Create payment in database
    const payment = await Payment.create({
      senderId,
      amount,
      fee,
      recipient,
      sourceCurrency,
      targetCurrency,
      status: 'created',
      routeInfo
    });
    
    logger.debug('Payment record created', { paymentId: payment.id });
    
    return payment;
  } catch (error) {
    logger.error('Failed to create payment record', { error: error.message });
    throw new APIError(`Payment creation failed: ${error.message}`, 500);
  }
};

/**
 * Update payment with blockchain transaction details
 * @param {string} paymentId - Payment ID
 * @param {Object} txnDetails - Transaction details
 * @returns {Object} Updated payment
 */
const updatePaymentWithTransaction = async (paymentId, txnDetails) => {
  try {
    logger.debug('Updating payment with transaction details', { 
      paymentId, 
      txnHash: txnDetails.hash 
    });
    
    const payment = await Payment.findByPk(paymentId);
    
    if (!payment) {
      throw new APIError(`Payment not found: ${paymentId}`, 404);
    }
    
    // Update payment with blockchain transaction details
    payment.transactionHash = txnDetails.hash;
    payment.onChainPaymentId = txnDetails.onChainPaymentId;
    payment.status = txnDetails.status === 'confirmed' ? 'processing' : 'failed';
    
    await payment.save();
    
    logger.debug('Payment updated with transaction details', { 
      paymentId, 
      status: payment.status 
    });
    
    return payment;
  } catch (error) {
    logger.error('Failed to update payment with transaction', { 
      error: error.message,
      paymentId 
    });
    throw new APIError(`Payment update failed: ${error.message}`, 500);
  }
};

/**
 * Update payment status
 * @param {string} paymentId - Payment ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Object} Updated payment
 */
const updatePaymentStatus = async (paymentId, status, additionalData = {}) => {
  try {
    logger.debug('Updating payment status', { paymentId, status });
    
    const payment = await Payment.findByPk(paymentId);
    
    if (!payment) {
      throw new APIError(`Payment not found: ${paymentId}`, 404);
    }
    
    // Update payment status and additional data
    payment.status = status;
    
    // Update additional fields if provided
    Object.keys(additionalData).forEach(key => {
      payment[key] = additionalData[key];
    });
    
    await payment.save();
    
    logger.debug('Payment status updated', { paymentId, status });
    
    return payment;
  } catch (error) {
    logger.error('Failed to update payment status', { 
      error: error.message,
      paymentId 
    });
    throw new APIError(`Payment status update failed: ${error.message}`, 500);
  }
};

/**
 * Get payment by ID
 * @param {string} paymentId - Payment ID
 * @returns {Object} Payment
 */
const getPaymentById = async (paymentId) => {
  try {
    logger.debug('Getting payment by ID', { paymentId });
    
    const payment = await Payment.findByPk(paymentId);
    
    return payment;
  } catch (error) {
    logger.error('Failed to get payment by ID', { 
      error: error.message,
      paymentId 
    });
    throw new APIError(`Payment retrieval failed: ${error.message}`, 500);
  }
};

/**
 * List payments with filters
 * @param {string} userId - User ID
 * @param {Object} filters - Filter criteria
 * @returns {Object} Payments and total count
 */
const listPayments = async (userId, { status, startDate, endDate, page = 1, limit = 10 }) => {
  try {
    logger.debug('Listing payments with filters', { 
      userId, 
      status, 
      startDate, 
      endDate 
    });
    
    // Build query conditions
    const whereConditions = { senderId: userId };
    
    // Apply status filter if provided
    if (status) {
      whereConditions.status = status;
    }
    
    // Apply date filters if provided
    if (startDate || endDate) {
      whereConditions.createdAt = {};
      
      if (startDate) {
        whereConditions.createdAt[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        whereConditions.createdAt[Op.lte] = new Date(endDate);
      }
    }
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Fetch payments with pagination
    const { count, rows } = await Payment.findAndCountAll({
      where: whereConditions,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    logger.debug('Payments filtered and paginated', { 
      total: count, 
      returned: rows.length 
    });
    
    return {
      payments: rows,
      total: count
    };
  } catch (error) {
    logger.error('Failed to list payments', { error: error.message });
    throw new APIError(`Payment listing failed: ${error.message}`, 500);
  }
};

module.exports = {
  createPayment,
  updatePaymentWithTransaction,
  updatePaymentStatus,
  getPaymentById,
  listPayments
}; 