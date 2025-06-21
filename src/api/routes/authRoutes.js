const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route POST /api/v1/auth/login
 * @desc User login
 * @access Public
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  validationMiddleware.validate,
  authController.login
);

/**
 * @route POST /api/v1/auth/register
 * @desc User registration
 * @access Public
 */
router.post(
  '/register',
  [
    body('name')
      .isString()
      .withMessage('Name is required'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  validationMiddleware.validate,
  authController.register
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post(
  '/refresh',
  [
    body('refreshToken')
      .isString()
      .withMessage('Refresh token is required')
  ],
  validationMiddleware.validate,
  authController.refreshToken
);

/**
 * @route POST /api/v1/auth/token
 * @desc Get API token (for service integrations)
 * @access Public
 */
router.post(
  '/token',
  [
    body('clientId')
      .isString()
      .withMessage('Client ID is required'),
    body('clientSecret')
      .isString()
      .withMessage('Client secret is required')
  ],
  validationMiddleware.validate,
  authController.getApiToken
);

module.exports = router; 