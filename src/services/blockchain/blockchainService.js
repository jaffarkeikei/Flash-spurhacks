const { AptosClient, AptosAccount, HexString, TxnBuilderTypes } = require('aptos');
const { logger } = require('../../utils/logger');
const { APIError } = require('../../api/middleware/errorHandler');

// Initialize Aptos client with default devnet URL if not provided
const nodeUrl = process.env.APTOS_NODE_URL || 'https://fullnode.devnet.aptoslabs.com/v1';
const client = new AptosClient(nodeUrl);

// FlashSettle contract address - would be set based on deployment
const FLASHSETTLE_ADDRESS = process.env.APTOS_ADDRESS || '0x1';

// Coin type mapping
const COIN_TYPE_MAP = {
  'USDC': `${FLASHSETTLE_ADDRESS}::usdc::USDC`,
  'USDT': `${FLASHSETTLE_ADDRESS}::usdt::USDT`,
  'USD': `${FLASHSETTLE_ADDRESS}::usdc::USDC`, // Default USD to USDC
  'APT': '0x1::aptos_coin::AptosCoin'
};

/**
 * Initialize wallet from private key
 * @returns {AptosAccount} Aptos account
 */
const initializeWallet = () => {
  try {
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error('Private key not configured');
    }
    
    const privateKeyBytes = HexString.ensure(privateKeyHex).toUint8Array();
    return new AptosAccount(privateKeyBytes);
  } catch (error) {
    logger.error('Failed to initialize wallet', { error: error.message });
    throw new APIError('Blockchain wallet initialization failed', 500);
  }
};

/**
 * Map currency code to coin type
 * @param {string} currency - Currency code (e.g., 'USDC', 'USDT')
 * @returns {string} Aptos coin type
 */
const mapCurrencyToCoinType = (currency) => {
  const coinType = COIN_TYPE_MAP[currency];
  if (!coinType) {
    throw new APIError(`Unsupported currency: ${currency}`, 400);
  }
  return coinType;
};

/**
 * Submit a payment transaction to the blockchain
 * @param {Object} payment - Payment object
 * @returns {Object} Transaction result
 */
const submitPayment = async (payment) => {
  try {
    logger.debug('Submitting payment to blockchain', { 
      paymentId: payment.id,
      amount: payment.amount,
      recipient: payment.recipient
    });
    
    // In a real implementation, this would submit the transaction to the blockchain
    // For now, we'll simulate a successful transaction
    const txnHash = `0x${Array(64).fill('0').join('')}`;
    
    return {
      hash: txnHash,
      status: 'confirmed',
      onChainPaymentId: payment.id
    };
  } catch (error) {
    logger.error('Failed to submit payment to blockchain', {
      error: error.message,
      paymentId: payment.id
    });
    throw error;
  }
};

/**
 * Get transaction status from blockchain
 * @param {string} txnHash - Transaction hash
 * @returns {Object} Transaction status
 */
const getTransactionStatus = async (txnHash) => {
  try {
    logger.debug('Getting transaction status', { txnHash });
    
    // In a real implementation, this would check the transaction status on the blockchain
    // For now, we'll simulate a successful transaction
    return {
      status: 'confirmed',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get transaction status', {
      error: error.message,
      txnHash
    });
    throw error;
  }
};

/**
 * Create a payment on the blockchain
 * @param {Object} params - Payment parameters
 * @param {string} params.paymentId - Payment ID
 * @param {string} params.senderId - Sender ID
 * @param {number} params.amount - Payment amount
 * @param {number} params.fee - Fee amount
 * @param {string} params.recipient - Recipient address
 * @param {string} params.sourceCurrency - Source currency
 * @returns {Object} Transaction result
 */
const createPayment = async ({
  paymentId,
  senderId,
  amount,
  fee,
  recipient,
  sourceCurrency
}) => {
  try {
    logger.debug('Creating blockchain payment', { paymentId, amount, recipient, sourceCurrency });
    
    const account = initializeWallet();
    const coinType = mapCurrencyToCoinType(sourceCurrency);
    
    // Convert amount to on-chain units (e.g., from dollars to cents or smallest unit)
    const onChainAmount = Math.floor(amount * 1_000_000); // Assuming 6 decimals
    const onChainFee = Math.floor(fee * 1_000_000); // Assuming 6 decimals
    
    // Build transaction payload
    const payload = {
      function: `${FLASHSETTLE_ADDRESS}::flashsettle_module::create_payment`,
      type_arguments: [coinType],
      arguments: [recipient, onChainAmount, onChainFee]
    };
    
    // For testing/hackathon purpose, we'll simulate the transaction
    // In a production environment, you would use the actual blockchain methods
    const txnHash = `0x${Array(64).fill(Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Simulate transaction result
    const txnResult = {
      success: true,
      gas_used: '1000',
      version: '1'
    };
    
    logger.debug('Blockchain payment created', { 
      paymentId, 
      txnHash, 
      status: txnResult.success ? 'success' : 'failed' 
    });
    
    if (!txnResult.success) {
      throw new Error('Transaction failed on blockchain');
    }
    
    // For testing/hackathon, simulate on-chain payment ID
    let onChainPaymentId = `payment_${Math.floor(Math.random() * 1000000)}`;
    
    return {
      hash: txnHash,
      status: txnResult.success ? 'confirmed' : 'failed',
      gasUsed: txnResult.gas_used,
      onChainPaymentId
    };
  } catch (error) {
    logger.error('Blockchain payment creation failed', { 
      error: error.message, 
      paymentId,
      stack: error.stack
    });
    
    throw new APIError(`Blockchain payment failed: ${error.message}`, 500);
  }
};

/**
 * Cancel a payment on the blockchain
 * @param {string} paymentId - Payment ID
 * @param {string} txnHash - Original transaction hash
 * @returns {Object} Transaction result
 */
const cancelPayment = async (paymentId, txnHash) => {
  try {
    logger.debug('Cancelling blockchain payment', { paymentId, txnHash });
    
    const account = initializeWallet();
    
    // Build transaction payload
    const payload = {
      function: `${FLASHSETTLE_ADDRESS}::flashsettle_module::cancel_payment`,
      type_arguments: [], // This would depend on specific contract requirements
      arguments: [paymentId]
    };
    
    // For testing/hackathon purpose, we'll simulate the transaction
    // In a production environment, you would use the actual blockchain methods
    const cancelTxnHash = `0x${Array(64).fill(Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Simulate transaction result
    const txnResult = {
      success: true,
      gas_used: '1000',
      version: '1'
    };
    
    logger.debug('Blockchain payment cancelled', { 
      paymentId, 
      txnHash: cancelTxnHash, 
      status: txnResult.success ? 'success' : 'failed' 
    });
    
    if (!txnResult.success) {
      throw new Error('Cancellation transaction failed on blockchain');
    }
    
    return {
      hash: cancelTxnHash,
      status: txnResult.success ? 'confirmed' : 'failed',
      gasUsed: txnResult.gas_used
    };
  } catch (error) {
    logger.error('Blockchain payment cancellation failed', { 
      error: error.message, 
      paymentId,
      stack: error.stack
    });
    
    throw new APIError(`Blockchain payment cancellation failed: ${error.message}`, 500);
  }
};

/**
 * Sponsor a transaction for gasless experience
 * @param {string} txnHash - Transaction hash to sponsor
 * @param {string} function_name - Function being called
 * @param {number} gasAmount - Gas amount to sponsor
 * @returns {Object} Sponsorship result
 */
const sponsorTransaction = async (txnHash, function_name, gasAmount) => {
  try {
    logger.debug('Sponsoring transaction', { txnHash, function_name, gasAmount });
    
    const account = initializeWallet();
    
    // Convert txnHash to bytes
    const txnHashBytes = HexString.ensure(txnHash).toUint8Array();
    
    // Build transaction payload
    const payload = {
      function: `${FLASHSETTLE_ADDRESS}::gas_station_module::sponsor_transaction`,
      type_arguments: [],
      arguments: [txnHashBytes, account.address().hex(), function_name, gasAmount]
    };
    
    // For testing/hackathon purpose, we'll simulate the transaction
    // In a production environment, you would use the actual blockchain methods
    const sponsorTxnHash = `0x${Array(64).fill(Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Simulate transaction result
    const txnResult = {
      success: true,
      gas_used: '1000',
      version: '1'
    };
    
    logger.debug('Transaction sponsored', { 
      txnHash, 
      sponsorTxnHash, 
      status: txnResult.success ? 'success' : 'failed' 
    });
    
    if (!txnResult.success) {
      throw new Error('Sponsorship transaction failed on blockchain');
    }
    
    return {
      hash: sponsorTxnHash,
      status: txnResult.success ? 'confirmed' : 'failed',
      gasUsed: txnResult.gas_used
    };
  } catch (error) {
    logger.error('Transaction sponsorship failed', { 
      error: error.message, 
      txnHash,
      stack: error.stack
    });
    
    throw new APIError(`Transaction sponsorship failed: ${error.message}`, 500);
  }
};

module.exports = {
  client,
  submitPayment,
  getTransactionStatus,
  createPayment,
  cancelPayment,
  sponsorTransaction,
  mapCurrencyToCoinType
}; 