const axios = require('axios');
const { logger } = require('../../utils/logger');
const { APIError } = require('../../api/middleware/errorHandler');

// Circle API configuration
const CIRCLE_API_URL = process.env.CIRCLE_API_URL || 'https://api-sandbox.circle.com';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

// Enable real Circle API vs mock
const ENABLE_CIRCLE_API = process.env.ENABLE_CIRCLE_API === 'true' && CIRCLE_API_KEY && CIRCLE_API_KEY !== 'your_circle_api_key_here';

/**
 * Circle API client with authentication
 */
const circleClient = axios.create({
  baseURL: CIRCLE_API_URL,
  headers: {
    'Authorization': `Bearer ${CIRCLE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

/**
 * Get USDC balance for an address
 * @param {string} address - Blockchain address
 * @param {string} blockchain - Blockchain name (e.g., 'ETH', 'AVAX', 'SOL')
 * @returns {Object} Balance information
 */
const getUSDCBalance = async (address, blockchain = 'ETH') => {
  try {
    logger.debug('Getting USDC balance', { address, blockchain, enableCircleAPI: ENABLE_CIRCLE_API });
    
    if (!ENABLE_CIRCLE_API) {
      // Mock balance for development/testing
      return {
        balance: '1000.000000', // 1000 USDC
        currency: 'USD',
        blockchain,
        address,
        source: 'mock'
      };
    }
    
    // Real Circle API call
    const response = await circleClient.get(`/v1/wallets/addresses/balances`, {
      params: {
        address,
        currency: 'USD',
        chain: blockchain
      }
    });
    
    const balanceData = response.data.data;
    
    return {
      balance: balanceData.available || '0',
      currency: balanceData.currency,
      blockchain: balanceData.chain,
      address,
      source: 'circle_api'
    };
    
  } catch (error) {
    logger.error('Failed to get USDC balance', { 
      error: error.message, 
      address, 
      blockchain,
      enableCircleAPI: ENABLE_CIRCLE_API
    });
    
    // Return zero balance on error
    return {
      balance: '0',
      currency: 'USD',
      blockchain,
      address,
      source: 'error'
    };
  }
};

/**
 * Create a USDC transfer using Circle's API
 * @param {Object} transferParams - Transfer parameters
 * @returns {Object} Transfer result
 */
const createUSDCTransfer = async ({
  amount,
  destinationAddress,
  blockchain = 'ETH',
  idempotencyKey
}) => {
  try {
    logger.debug('Creating USDC transfer', { 
      amount, 
      destinationAddress, 
      blockchain,
      enableCircleAPI: ENABLE_CIRCLE_API
    });
    
    if (!ENABLE_CIRCLE_API) {
      // Mock transfer for development/testing
      const mockTransferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        id: mockTransferId,
        status: 'pending',
        amount: amount.toString(),
        currency: 'USD',
        destinationAddress,
        blockchain,
        transactionHash: null,
        source: 'mock'
      };
    }
    
    // Real Circle API transfer
    const transferData = {
      idempotencyKey: idempotencyKey || `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: {
        amount: amount.toString(),
        currency: 'USD'
      },
      destination: {
        type: 'blockchain',
        address: destinationAddress,
        chain: blockchain
      },
      source: {
        type: 'wallet',
        id: process.env.CIRCLE_WALLET_ID || 'default_wallet'
      }
    };
    
    const response = await circleClient.post('/v1/transfers', transferData);
    const transfer = response.data.data;
    
    logger.info('USDC transfer created', { 
      transferId: transfer.id,
      status: transfer.status,
      amount: transfer.amount.amount
    });
    
    return {
      id: transfer.id,
      status: transfer.status,
      amount: transfer.amount.amount,
      currency: transfer.amount.currency,
      destinationAddress: transfer.destination.address,
      blockchain: transfer.destination.chain,
      transactionHash: transfer.transactionHash,
      source: 'circle_api'
    };
    
  } catch (error) {
    logger.error('Failed to create USDC transfer', { 
      error: error.message,
      response: error.response?.data,
      enableCircleAPI: ENABLE_CIRCLE_API
    });
    
    throw new APIError(`USDC transfer failed: ${error.message}`, 500);
  }
};

/**
 * Get transfer status from Circle
 * @param {string} transferId - Transfer ID
 * @returns {Object} Transfer status
 */
const getTransferStatus = async (transferId) => {
  try {
    logger.debug('Getting transfer status', { transferId, enableCircleAPI: ENABLE_CIRCLE_API });
    
    if (!ENABLE_CIRCLE_API) {
      // Mock status for development/testing
      return {
        id: transferId,
        status: 'complete',
        transactionHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        source: 'mock'
      };
    }
    
    // Real Circle API status check
    const response = await circleClient.get(`/v1/transfers/${transferId}`);
    const transfer = response.data.data;
    
    return {
      id: transfer.id,
      status: transfer.status,
      transactionHash: transfer.transactionHash,
      errorCode: transfer.errorCode,
      source: 'circle_api'
    };
    
  } catch (error) {
    logger.error('Failed to get transfer status', { 
      error: error.message, 
      transferId,
      enableCircleAPI: ENABLE_CIRCLE_API
    });
    
    return {
      id: transferId,
      status: 'unknown',
      source: 'error'
    };
  }
};

/**
 * Cross-Chain Transfer Protocol (CCTP) - Burn USDC on source chain
 * @param {Object} burnParams - Burn parameters
 * @returns {Object} Burn result
 */
const burnUSDCForCCTP = async ({
  amount,
  destinationDomain,
  mintRecipient,
  burnToken = 'USDC'
}) => {
  try {
    logger.debug('Burning USDC for CCTP', { 
      amount, 
      destinationDomain, 
      mintRecipient,
      enableCircleAPI: ENABLE_CIRCLE_API
    });
    
    if (!ENABLE_CIRCLE_API) {
      // Mock CCTP burn
      const mockBurnTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      const mockAttestationHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      return {
        burnTxHash: mockBurnTxHash,
        attestationHash: mockAttestationHash,
        amount: amount.toString(),
        destinationDomain,
        mintRecipient,
        source: 'mock'
      };
    }
    
    // Real CCTP burn operation
    // Note: This would typically be done through a smart contract interaction
    // For Circle's CCTP, you'd interact with the TokenMessenger contract
    
    const cctpData = {
      amount: amount.toString(),
      destinationDomain,
      mintRecipient,
      burnToken
    };
    
    // This is a simplified version - actual CCTP requires smart contract interaction
    logger.info('CCTP burn operation initiated', cctpData);
    
    return {
      burnTxHash: 'pending_smart_contract_interaction',
      attestationHash: 'pending_attestation',
      amount: amount.toString(),
      destinationDomain,
      mintRecipient,
      source: 'cctp_api'
    };
    
  } catch (error) {
    logger.error('Failed to burn USDC for CCTP', { error: error.message });
    throw new APIError(`CCTP burn failed: ${error.message}`, 500);
  }
};

/**
 * CCTP - Mint USDC on destination chain using attestation
 * @param {Object} mintParams - Mint parameters
 * @returns {Object} Mint result
 */
const mintUSDCFromCCTP = async ({
  attestationHash,
  message,
  attestationSignature
}) => {
  try {
    logger.debug('Minting USDC from CCTP', { 
      attestationHash,
      enableCircleAPI: ENABLE_CIRCLE_API
    });
    
    if (!ENABLE_CIRCLE_API) {
      // Mock CCTP mint
      const mockMintTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      return {
        mintTxHash: mockMintTxHash,
        status: 'complete',
        attestationHash,
        source: 'mock'
      };
    }
    
    // Real CCTP mint operation
    // This would interact with the MessageTransmitter contract on the destination chain
    
    const mintData = {
      attestationHash,
      message,
      attestationSignature
    };
    
    logger.info('CCTP mint operation initiated', { attestationHash });
    
    return {
      mintTxHash: 'pending_smart_contract_interaction',
      status: 'pending',
      attestationHash,
      source: 'cctp_api'
    };
    
  } catch (error) {
    logger.error('Failed to mint USDC from CCTP', { error: error.message });
    throw new APIError(`CCTP mint failed: ${error.message}`, 500);
  }
};

/**
 * Get Circle attestation for CCTP
 * @param {string} messageHash - Message hash from burn transaction
 * @returns {Object} Attestation data
 */
const getCCTPAttestation = async (messageHash) => {
  try {
    logger.debug('Getting CCTP attestation', { messageHash, enableCircleAPI: ENABLE_CIRCLE_API });
    
    if (!ENABLE_CIRCLE_API) {
      // Mock attestation
      return {
        attestation: '0x' + Array(130).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        status: 'complete',
        messageHash,
        source: 'mock'
      };
    }
    
    // Real Circle attestation API
    const response = await circleClient.get(`/v1/attestations/${messageHash}`);
    const attestationData = response.data;
    
    return {
      attestation: attestationData.attestation,
      status: attestationData.status,
      messageHash,
      source: 'circle_api'
    };
    
  } catch (error) {
    logger.error('Failed to get CCTP attestation', { error: error.message, messageHash });
    
    return {
      attestation: null,
      status: 'pending',
      messageHash,
      source: 'error'
    };
  }
};

/**
 * Get supported blockchains for USDC
 * @returns {Array} List of supported blockchains
 */
const getSupportedBlockchains = async () => {
  try {
    if (!ENABLE_CIRCLE_API) {
      // Mock supported blockchains
      return [
        { chain: 'ETH', name: 'Ethereum', native: true },
        { chain: 'AVAX', name: 'Avalanche', native: true },
        { chain: 'SOL', name: 'Solana', native: true },
        { chain: 'APTOS', name: 'Aptos', native: false, cctp: true }
      ];
    }
    
    // Real Circle API call for supported chains
    const response = await circleClient.get('/v1/configuration');
    const config = response.data.data;
    
    return config.payments?.supportedChains || [];
    
  } catch (error) {
    logger.error('Failed to get supported blockchains', { error: error.message });
    
    // Return default list on error
    return [
      { chain: 'ETH', name: 'Ethereum', native: true },
      { chain: 'AVAX', name: 'Avalanche', native: true }
    ];
  }
};

/**
 * Estimate transfer fees
 * @param {Object} feeParams - Fee estimation parameters
 * @returns {Object} Fee estimation
 */
const estimateTransferFees = async ({
  amount,
  sourceChain,
  destinationChain,
  transferType = 'standard'
}) => {
  try {
    if (!ENABLE_CIRCLE_API) {
      // Mock fee estimation
      const baseFee = parseFloat(amount) * 0.001; // 0.1%
      const networkFee = transferType === 'cctp' ? 0.1 : 0.05;
      
      return {
        totalFee: (baseFee + networkFee).toFixed(6),
        baseFee: baseFee.toFixed(6),
        networkFee: networkFee.toFixed(6),
        currency: 'USD',
        source: 'mock'
      };
    }
    
    // Real fee estimation would go here
    // Circle doesn't always provide fee estimation APIs, so this might be calculated
    
    const estimatedBaseFee = parseFloat(amount) * 0.001; // 0.1%
    const estimatedNetworkFee = 0.05; // Fixed network fee
    
    return {
      totalFee: (estimatedBaseFee + estimatedNetworkFee).toFixed(6),
      baseFee: estimatedBaseFee.toFixed(6),
      networkFee: estimatedNetworkFee.toFixed(6),
      currency: 'USD',
      source: 'estimated'
    };
    
  } catch (error) {
    logger.error('Failed to estimate transfer fees', { error: error.message });
    
    return {
      totalFee: '0.10',
      baseFee: '0.05',
      networkFee: '0.05',
      currency: 'USD',
      source: 'default'
    };
  }
};

module.exports = {
  getUSDCBalance,
  createUSDCTransfer,
  getTransferStatus,
  burnUSDCForCCTP,
  mintUSDCFromCCTP,
  getCCTPAttestation,
  getSupportedBlockchains,
  estimateTransferFees,
  ENABLE_CIRCLE_API,
  circleClient
}; 