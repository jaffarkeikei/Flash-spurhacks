const StellarSdk = require('stellar-sdk');
const crypto = require('crypto');
const { logger } = require('../../utils/logger');
const { APIError } = require('../../api/middleware/errorHandler');

// Stellar configuration
const STELLAR_NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const STELLAR_HORIZON_URL = STELLAR_NETWORK === 'mainnet' 
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

// Contract configuration
const CONTRACT_ID = process.env.STELLAR_PASSKEY_CONTRACT_ID || 'CA...EXAMPLE'; // Will be set after deployment
const CONTRACT_SOURCE_ACCOUNT = process.env.STELLAR_CONTRACT_SOURCE || 'GA...EXAMPLE';

// Initialize Stellar server
const server = new StellarSdk.Horizon.Server(STELLAR_HORIZON_URL);
const networkPassphrase = STELLAR_NETWORK === 'mainnet' 
  ? StellarSdk.Networks.PUBLIC 
  : StellarSdk.Networks.TESTNET;

/**
 * Stellar Passkey Authentication Service
 * Handles WebAuthn integration with Stellar smart contracts
 */
class StellarPasskeyService {
  constructor() {
    this.contractAddress = CONTRACT_ID;
    this.sourceKeypair = null;
    
    // Initialize source keypair if private key is provided
    if (process.env.STELLAR_PRIVATE_KEY) {
      this.sourceKeypair = StellarSdk.Keypair.fromSecret(process.env.STELLAR_PRIVATE_KEY);
    }
  }

  /**
   * Generate challenge for WebAuthn authentication
   * @returns {Object} Challenge data
   */
  generateChallenge() {
    const challenge = crypto.randomBytes(32);
    const challengeId = crypto.randomUUID();
    
    // Store challenge temporarily (in production, use Redis)
    this.challenges = this.challenges || new Map();
    this.challenges.set(challengeId, {
      challenge: challenge.toString('base64url'),
      timestamp: Date.now(),
      used: false
    });
    
    // Clean up old challenges (older than 5 minutes)
    this.cleanupOldChallenges();
    
    return {
      challengeId,
      challenge: challenge.toString('base64url'),
      timeout: 300000, // 5 minutes
    };
  }

  /**
   * Validate challenge for WebAuthn authentication
   * @param {string} challengeId - Challenge ID
   * @param {string} providedChallenge - Challenge provided by client
   * @returns {boolean} True if valid
   */
  validateChallenge(challengeId, providedChallenge) {
    if (!this.challenges || !this.challenges.has(challengeId)) {
      return false;
    }
    
    const challengeData = this.challenges.get(challengeId);
    
    // Check if challenge is expired (5 minutes)
    if (Date.now() - challengeData.timestamp > 300000) {
      this.challenges.delete(challengeId);
      return false;
    }
    
    // Check if challenge was already used
    if (challengeData.used) {
      return false;
    }
    
    // Validate challenge
    const isValid = challengeData.challenge === providedChallenge;
    
    if (isValid) {
      challengeData.used = true;
    }
    
    return isValid;
  }

  /**
   * Register a passkey on the Stellar blockchain
   * @param {Object} params - Registration parameters
   * @returns {Object} Transaction result
   */
  async registerPasskey({ 
    userStellarAddress, 
    publicKey, 
    credentialId, 
    displayName,
    attestationObject,
    clientDataJSON 
  }) {
    try {
      logger.info('Registering passkey on Stellar', { 
        userAddress: userStellarAddress,
        credentialId: credentialId.slice(0, 20) + '...'
      });

      // For demo purposes, return mock success
      // In production, would interact with actual Stellar smart contract
      return {
        success: true,
        transactionHash: `stellar_${crypto.randomBytes(32).toString('hex')}`,
        contractAddress: this.contractAddress,
        credentialId,
        stellarAddress: userStellarAddress
      };

    } catch (error) {
      logger.error('Failed to register passkey on Stellar', {
        error: error.message,
        userAddress: userStellarAddress
      });
      throw new APIError(`Passkey registration failed: ${error.message}`, 500);
    }
  }

  /**
   * Authenticate a user using their passkey
   * @param {Object} params - Authentication parameters
   * @returns {Object} Authentication result
   */
  async authenticatePasskey({
    userStellarAddress,
    credentialId,
    signature,
    challengeId,
    authenticationData,
    clientDataJSON
  }) {
    try {
      logger.info('Authenticating passkey on Stellar', {
        userAddress: userStellarAddress,
        credentialId: credentialId.slice(0, 20) + '...'
      });

      // For demo purposes, return mock success
      // In production, would verify signature on Stellar smart contract
      return {
        success: true,
        authenticated: true,
        transactionHash: `stellar_auth_${crypto.randomBytes(16).toString('hex')}`,
        timestamp: new Date().toISOString(),
        userAddress: userStellarAddress
      };

    } catch (error) {
      logger.error('Passkey authentication failed', {
        error: error.message,
        userAddress: userStellarAddress
      });
      
      throw new APIError(`Authentication failed: ${error.message}`, 500);
    }
  }

  /**
   * Check if user has an active passkey
   * @param {string} userStellarAddress - User's Stellar address
   * @returns {boolean} True if user has active passkey
   */
  async hasActivePasskey(userStellarAddress) {
    try {
      const contract = new StellarSdk.Contract(this.contractAddress);
      const sourceAccount = await server.loadAccount(CONTRACT_SOURCE_ACCOUNT);
      
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          contract.call(
            'has_active_passkey',
            StellarSdk.Address.fromString(userStellarAddress)
          )
        )
        .build();

      // Simulate transaction to get result without submitting
      const result = await server.simulateTransaction(transaction);
      
      return result.results?.[0]?.xdr ? 
        StellarSdk.scValToNative(result.results[0].xdr) : false;

    } catch (error) {
      logger.error('Failed to check passkey status', {
        error: error.message,
        userAddress: userStellarAddress
      });
      return false;
    }
  }

  /**
   * Get user's passkey information
   * @param {string} userStellarAddress - User's Stellar address
   * @returns {Object|null} Passkey info or null
   */
  async getPasskeyInfo(userStellarAddress) {
    try {
      const contract = new StellarSdk.Contract(this.contractAddress);
      const sourceAccount = await server.loadAccount(CONTRACT_SOURCE_ACCOUNT);
      
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          contract.call(
            'get_passkey_info',
            StellarSdk.Address.fromString(userStellarAddress)
          )
        )
        .build();

      const result = await server.simulateTransaction(transaction);
      
      if (result.results?.[0]?.xdr) {
        return StellarSdk.scValToNative(result.results[0].xdr);
      }
      
      return null;

    } catch (error) {
      logger.error('Failed to get passkey info', {
        error: error.message,
        userAddress: userStellarAddress
      });
      return null;
    }
  }

  /**
   * Prepare WebAuthn registration data for contract
   * @private
   */
  prepareRegistrationArgs({ publicKey, credentialId, displayName, attestationObject }) {
    return {
      publicKey: Buffer.from(publicKey, 'base64url'),
      credentialId: Buffer.from(credentialId, 'base64url'),
      displayName: Buffer.from(displayName, 'utf8'),
      attestationObject: Buffer.from(attestationObject, 'base64url')
    };
  }

  /**
   * Prepare WebAuthn authentication data for contract
   * @private
   */
  prepareAuthenticationArgs({ signature, challenge, authenticationData, clientDataJSON }) {
    const authCounter = this.extractAuthCounter(authenticationData);
    
    return {
      signature: Buffer.from(signature, 'base64url'),
      challenge: Buffer.from(challenge, 'base64url'),
      auth_counter: authCounter,
      client_data_hash: crypto.createHash('sha256')
        .update(Buffer.from(clientDataJSON, 'base64url'))
        .digest()
    };
  }

  /**
   * Extract authentication counter from authenticator data
   * @private
   */
  extractAuthCounter(authenticationData) {
    const authDataBuffer = Buffer.from(authenticationData, 'base64url');
    // Authentication counter is at bytes 33-36 in authenticator data
    return authDataBuffer.readUInt32BE(33);
  }

  /**
   * Parse authentication result from Stellar transaction
   * @private
   */
  async parseAuthenticationResult(transactionResult) {
    try {
      // In a real implementation, parse the transaction result
      // For demo purposes, assume success if transaction succeeded
      return transactionResult.successful;
    } catch (error) {
      logger.error('Failed to parse authentication result', { error: error.message });
      return false;
    }
  }

  /**
   * Clean up old challenges
   * @private
   */
  cleanupOldChallenges() {
    if (!this.challenges) return;
    
    const now = Date.now();
    for (const [id, challengeData] of this.challenges.entries()) {
      if (now - challengeData.timestamp > 300000) { // 5 minutes
        this.challenges.delete(id);
      }
    }
  }

  /**
   * Generate a new Stellar keypair for users
   * @returns {Object} Keypair information
   */
  generateStellarKeypair() {
    const keypair = StellarSdk.Keypair.random();
    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret()
    };
  }

  /**
   * Fund a new account on testnet (for demo purposes)
   * @param {string} publicKey - Account public key
   * @returns {boolean} Success status
   */
  async fundTestnetAccount(publicKey) {
    if (STELLAR_NETWORK !== 'testnet') {
      throw new APIError('Account funding only available on testnet', 400);
    }

    try {
      const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
      return response.ok;
    } catch (error) {
      logger.error('Failed to fund testnet account', { error: error.message, publicKey });
      return false;
    }
  }
}

module.exports = {
  StellarPasskeyService,
  // Export singleton instance
  stellarPasskeyService: new StellarPasskeyService()
}; 