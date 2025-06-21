const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../utils/logger');
const { APIError, AuthenticationError } = require('../middleware/errorHandler');
const { User } = require('../../db/models');

// This is a simple in-memory store for demo purposes
// In a production application, this would use a database
const users = new Map();
const refreshTokens = new Map();
const apiClients = new Map();

// Sample API client for demo purposes
apiClients.set('demo-client', {
  clientId: 'demo-client',
  clientSecret: 'demo-secret',
  name: 'Demo Integration',
  permissions: ['read:payments', 'create:payments']
});

/**
 * User login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    logger.debug('Login attempt', { email });
    
    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    // Verify user exists and password is correct
    if (!user || !(await user.isValidPassword(password))) {
      throw new AuthenticationError('Invalid email or password');
    }
    
    // Generate tokens
    const { accessToken, refreshToken: token } = generateTokens(user);
    
    // Store refresh token
    user.refreshToken = token;
    await user.save();
    
    logger.info('User logged in successfully', { userId: user.id });
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken,
        refreshToken: token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    logger.debug('Registration attempt', { email });
    
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    
    if (existingUser) {
      throw new APIError('Email already in use', 400);
    }
    
    // Create new user
    const newUser = await User.create({
      name,
      email,
      password,
      role: 'user'
    });
    
    // Generate tokens
    const { accessToken, refreshToken: token } = generateTokens(newUser);
    
    // Store refresh token
    newUser.refreshToken = token;
    await newUser.save();
    
    logger.info('User registered successfully', { userId: newUser.id });
    
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        },
        accessToken,
        refreshToken: token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    logger.debug('Token refresh attempt');
    
    // Find user with this refresh token
    const user = await User.findOne({ where: { refreshToken } });
    
    if (!user) {
      throw new AuthenticationError('Invalid refresh token');
    }
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    
    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();
    
    logger.info('Token refreshed successfully', { userId: user.id });
    
    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get API token for service integrations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getApiToken = async (req, res, next) => {
  try {
    const { clientId, clientSecret } = req.body;
    
    logger.debug('API token request', { clientId });
    
    // Verify client credentials
    const client = apiClients.get(clientId);
    
    if (!client || client.clientSecret !== clientSecret) {
      throw new AuthenticationError('Invalid client credentials');
    }
    
    // Generate API token
    const accessToken = jwt.sign(
      {
        clientId,
        role: 'service',
        permissions: client.permissions
      },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '1h' }
    );
    
    logger.info('API token generated successfully', { clientId });
    
    res.status(200).json({
      success: true,
      data: {
        accessToken,
        expiresIn: 3600 // 1 hour in seconds
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate JWT tokens
 * @param {Object} user - User object
 * @returns {Object} Access and refresh tokens
 */
const generateTokens = (user) => {
  // Define permissions based on user role
  const permissions = user.role === 'admin' 
    ? ['read:all_payments', 'create:payments', 'admin:access'] 
    : ['read:own_payments', 'create:payments'];
  
  // Generate access token
  const accessToken = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      permissions
    },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '1h' }
  );
  
  // Generate refresh token
  const refreshToken = uuidv4();
  
  return { accessToken, refreshToken };
};

// Add a demo user for testing purposes
const addDemoUser = async () => {
  try {
    const demoEmail = 'demo@flashsettle.com';
    
    // Check if demo user already exists
    const existingUser = await User.findOne({ where: { email: demoEmail } });
    
    if (existingUser) {
      logger.debug('Demo user already exists');
      return;
    }
    
    // Create demo user
    await User.create({
      name: 'Demo User',
      email: demoEmail,
      password: 'password123',
      role: 'user'
    });
    
    logger.info('Demo user created successfully');
  } catch (error) {
    logger.error('Failed to create demo user', { error: error.message });
  }
};

// Add demo user on module load
addDemoUser();

module.exports = {
  login,
  register,
  refreshToken,
  getApiToken,
  addDemoUser
}; 