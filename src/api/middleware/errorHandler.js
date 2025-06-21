const { logger } = require('../../utils/logger');

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, name = 'APIError') {
    super(message);
    this.statusCode = statusCode;
    this.name = name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication Error class
 */
class AuthenticationError extends APIError {
  constructor(message) {
    super(message, 401, 'AuthenticationError');
  }
}

/**
 * Authorization Error class
 */
class AuthorizationError extends APIError {
  constructor(message) {
    super(message, 403, 'AuthorizationError');
  }
}

/**
 * Validation Error class
 */
class ValidationError extends APIError {
  constructor(message, errors = []) {
    super(message, 400, 'ValidationError');
    this.errors = errors;
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  // Handle custom errors
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        name: err.name,
        message: err.message,
        ...(err.errors && { errors: err.errors })
      }
    });
  }
  
  // Handle Sequelize errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
    
    return res.status(400).json({
      success: false,
      error: {
        name: 'ValidationError',
        message: 'Validation failed',
        errors
      }
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        name: 'AuthenticationError',
        message: 'Invalid token'
      }
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        name: 'AuthenticationError',
        message: 'Token expired'
      }
    });
  }
  
  // Handle all other errors
  return res.status(500).json({
    success: false,
    error: {
      name: 'ServerError',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
    }
  });
};

module.exports = {
  APIError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  errorHandler
}; 