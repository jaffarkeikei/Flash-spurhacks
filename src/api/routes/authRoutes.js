const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route POST /api/v1/auth/register
 * @desc User registration
 * @access Public
 */
router.post(
  '/register',
  [
    body('username')
      .isString()
      .withMessage('Username is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('picture')
      .isString()
      .withMessage('Photo is required')
  ],
  validationMiddleware.validate,
  authController.register
);

/**
 * @route POST /api/v1/auth/login
 * @desc User login
 * @access Public
 */
router.post(
  '/login',
  [
    body('username')
      .isString()
      .withMessage('Username is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  validationMiddleware.validate,
  authController.login
);

module.exports = router;