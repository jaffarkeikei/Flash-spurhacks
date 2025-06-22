const jwt = require('jsonwebtoken');
const { logger } = require('../../utils/logger');
const { APIError, AuthenticationError } = require('../middleware/errorHandler');
const { stellarPasskeyService } = require('../../services/auth/stellarPasskeyService');
const { User } = require('../../db/models');

/**
 * Generate Stellar keypair for user
 */
const generateKeypair = async (req, res, next) => {
  try {
    logger.info('Generating Stellar keypair for user');
    
    const keypair = stellarPasskeyService.generateStellarKeypair();
    
    res.status(200).json({
      success: true,
      data: {
        keypair: {
          publicKey: keypair.publicKey,
          // Note: In production, never return private key to frontend
          // This is for demo purposes only
          secretKey: keypair.secretKey
        }
      }
    });
    
  } catch (error) {
    logger.error('Failed to generate Stellar keypair', { error: error.message });
    next(new APIError('Failed to generate keypair', 500));
  }
};

/**
 * Begin passkey registration process
 */
const beginRegistration = async (req, res, next) => {
  try {
    const { username, displayName, stellarAddress } = req.body;
    
    logger.info('Beginning passkey registration', { username, stellarAddress });
    
    // Generate challenge for WebAuthn
    const challengeData = stellarPasskeyService.generateChallenge();
    
    // In a real implementation, store registration data temporarily
    // For demo purposes, return mock options
    const registrationOptions = {
      challenge: challengeData.challenge,
      rp: {
        name: 'Flash - Cross-Border Payments',
        id: 'localhost' // In production, use your domain
      },
      user: {
        id: Buffer.from(username).toString('base64url'),
        name: username,
        displayName: displayName
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 300000, // 5 minutes
      attestation: 'direct'
    };
    
    res.status(200).json({
      success: true,
      data: registrationOptions
    });
    
  } catch (error) {
    logger.error('Failed to begin passkey registration', { error: error.message });
    next(new APIError('Failed to begin registration', 500));
  }
};

/**
 * Complete passkey registration process
 */
const completeRegistration = async (req, res, next) => {
  try {
    const { 
      credentialId, 
      attestationObject, 
      clientDataJSON, 
      stellarAddress, 
      userInfo 
    } = req.body;
    
    logger.info('Completing passkey registration', { 
      credentialId: credentialId.slice(0, 20) + '...',
      stellarAddress,
      userEmail: userInfo.email
    });
    
    // For demo purposes, simulate successful registration
    // In production, would validate attestation and register on Stellar
    const stellarResult = await stellarPasskeyService.registerPasskey({
      userStellarAddress: stellarAddress,
      publicKey: 'mock_public_key',
      credentialId,
      displayName: userInfo.name,
      attestationObject,
      clientDataJSON
    });
    
    // Store passkey info in database
    try {
      let user = await User.findOne({ where: { email: userInfo.email } });
      
      if (!user) {
        // Create new user with passkey
        user = await User.create({
          name: userInfo.name,
          email: userInfo.email,
          password: 'passkey_user', // Placeholder password for passkey users
          role: 'user',
          walletAddress: stellarAddress
        });
      } else {
        // Update existing user with Stellar address
        user.walletAddress = stellarAddress;
        await user.save();
      }
    } catch (dbError) {
      logger.warn('Database operation failed, continuing with demo', { error: dbError.message });
    }
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Passkey registered successfully',
        stellarTransaction: stellarResult.transactionHash,
        credentialId,
        stellarAddress
      }
    });
    
  } catch (error) {
    logger.error('Failed to complete passkey registration', { error: error.message });
    next(new APIError('Failed to complete registration', 500));
  }
};

/**
 * Begin passkey authentication process
 */
const beginAuthentication = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    logger.info('Beginning passkey authentication', { email });
    
    // Generate challenge for WebAuthn
    const challengeData = stellarPasskeyService.generateChallenge();
    
    // For demo purposes, return mock authentication options
    const authenticationOptions = {
      challenge: challengeData.challenge,
      challengeId: challengeData.challengeId,
      timeout: 300000, // 5 minutes
      rpId: 'localhost', // In production, use your domain
      userVerification: 'required',
      // In a real implementation, would include allowCredentials based on user's registered passkeys
      allowCredentials: []
    };
    
    res.status(200).json({
      success: true,
      data: authenticationOptions
    });
    
  } catch (error) {
    logger.error('Failed to begin passkey authentication', { error: error.message });
    next(new APIError('Failed to begin authentication', 500));
  }
};

/**
 * Complete passkey authentication process
 */
const completeAuthentication = async (req, res, next) => {
  try {
    const { 
      credentialId, 
      authenticatorData, 
      clientDataJSON, 
      signature, 
      challengeId, 
      email 
    } = req.body;
    
    logger.info('Completing passkey authentication', { 
      email,
      credentialId: credentialId.slice(0, 20) + '...'
    });
    
    // For demo purposes, simulate successful authentication
    // In production, would verify signature on Stellar blockchain
    const stellarResult = await stellarPasskeyService.authenticatePasskey({
      userStellarAddress: 'mock_stellar_address',
      credentialId,
      signature,
      challengeId,
      authenticationData: authenticatorData,
      clientDataJSON
    });
    
    if (!stellarResult.success) {
      throw new AuthenticationError('Passkey authentication failed');
    }
    
    // Find or create user
    let user;
    try {
      user = await User.findOne({ where: { email } });
      
      if (!user) {
        // Create user for first-time passkey authentication
        user = await User.create({
          name: email.split('@')[0],
          email,
          password: 'passkey_user',
          role: 'user',
          walletAddress: 'mock_stellar_address'
        });
      }
    } catch (dbError) {
      logger.warn('Database operation failed, using mock user', { error: dbError.message });
      // Mock user for demo
      user = {
        id: 'stellar_user_1',
        name: email.split('@')[0],
        email,
        role: 'user',
        walletAddress: 'mock_stellar_address'
      };
    }
    
    // Generate JWT token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        authMethod: 'stellar_passkey',
        stellarAddress: user.walletAddress
      },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '24h' }
    );
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          authMethod: 'stellar_passkey'
        },
        accessToken,
        stellarTransaction: stellarResult.transactionHash,
        message: 'Authentication successful via Stellar passkey'
      }
    });
    
  } catch (error) {
    logger.error('Failed to complete passkey authentication', { error: error.message });
    
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      next(new APIError('Authentication failed', 500));
    }
  }
};

/**
 * Check if user has an existing passkey
 */
const checkPasskey = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    logger.info('Checking passkey status', { email });
    
    // For demo purposes, check if email contains certain keywords
    const hasPasskey = email.includes('demo') || email.includes('stellar') || email.includes('passkey');
    
    res.status(200).json({
      success: true,
      data: {
        hasPasskey,
        email
      }
    });
    
  } catch (error) {
    logger.error('Failed to check passkey status', { error: error.message });
    next(new APIError('Failed to check passkey status', 500));
  }
};

/**
 * Get passkey information for user
 */
const getPasskeyInfo = async (req, res, next) => {
  try {
    const { email } = req.params;
    
    logger.info('Getting passkey info', { email });
    
    // For demo purposes, return mock passkey info
    const mockPasskeyInfo = {
      email,
      credentialId: 'mock_credential_id_' + Date.now(),
      stellarAddress: 'GABC123...XYZ789',
      createdAt: new Date().toISOString(),
      isActive: true,
      authCount: Math.floor(Math.random() * 100)
    };
    
    res.status(200).json({
      success: true,
      data: mockPasskeyInfo
    });
    
  } catch (error) {
    logger.error('Failed to get passkey info', { error: error.message });
    next(new APIError('Failed to get passkey info', 500));
  }
};

/**
 * Revoke a user's passkey
 */
const revokePasskey = async (req, res, next) => {
  try {
    const { email, reason } = req.body;
    
    logger.info('Revoking passkey', { email, reason });
    
    // For demo purposes, simulate successful revocation
    // In production, would revoke passkey on Stellar blockchain
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Passkey revoked successfully',
        email,
        revokedAt: new Date().toISOString(),
        reason: reason || 'User requested'
      }
    });
    
  } catch (error) {
    logger.error('Failed to revoke passkey', { error: error.message });
    next(new APIError('Failed to revoke passkey', 500));
  }
};

module.exports = {
  generateKeypair,
  beginRegistration,
  completeRegistration,
  beginAuthentication,
  completeAuthentication,
  checkPasskey,
  getPasskeyInfo,
  revokePasskey
}; 