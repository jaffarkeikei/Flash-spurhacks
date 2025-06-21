const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('./errorHandler');
const { logger } = require('../../utils/logger');

/**
 * Middleware to authenticate requests using JWT
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authentication required. Please provide a valid Bearer token.');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AuthenticationError('Authentication token is required');
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      
      // Add user info to request object
      req.user = {
        id: decoded.userId,
        role: decoded.role,
        permissions: decoded.permissions || []
      };
      
      logger.debug('User authenticated', { userId: req.user.id, role: req.user.role });
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token expired');
      }
      
      throw new AuthenticationError('Invalid authentication token');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user has required permissions
 * @param {string[]} requiredPermissions - Array of required permissions
 * @returns {Function} Express middleware
 */
const authorize = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }
      
      // Admin role has all permissions
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        req.user.permissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        throw new AuthorizationError('You do not have permission to access this resource');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has required role
 * @param {string|string[]} roles - Required role(s)
 */
const hasRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }
      
      const userRole = req.user.role;
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!requiredRoles.includes(userRole)) {
        throw new AuthorizationError(`Requires role: ${requiredRoles.join(' or ')}`);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate API key for external service access
 */
const validateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }
    
    // In a real implementation, validate the API key against database
    // For now, we'll use a simple environment variable check
    if (apiKey !== process.env.API_KEY) {
      throw new AuthenticationError('Invalid API key');
    }
    
    // For API key auth, we add minimal user info
    req.user = {
      id: 'api-client',
      role: 'service',
      permissions: ['read:payments', 'create:payments']
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  authorize,
  hasRole,
  validateApiKey
}; 