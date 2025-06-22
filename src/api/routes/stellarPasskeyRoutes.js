const express = require('express');
const { body } = require('express-validator');
const stellarPasskeyController = require('../controllers/stellarPasskeyController');
const validationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route POST /api/v1/auth/stellar/keypair
 * @desc Generate new Stellar keypair for user
 * @access Public
 */
router.post(
  '/stellar/keypair',
  stellarPasskeyController.generateKeypair
);

/**
 * @route POST /api/v1/auth/passkey/register/begin
 * @desc Begin passkey registration process
 * @access Public
 */
router.post(
  '/passkey/register/begin',
  [
    body('username')
      .isEmail()
      .withMessage('Valid email is required'),
    body('displayName')
      .isString()
      .withMessage('Display name is required'),
    body('stellarAddress')
      .isString()
      .withMessage('Stellar address is required')
  ],
  validationMiddleware.validate,
  stellarPasskeyController.beginRegistration
);

/**
 * @route POST /api/v1/auth/passkey/register/complete
 * @desc Complete passkey registration process
 * @access Public
 */
router.post(
  '/passkey/register/complete',
  [
    body('credentialId')
      .isString()
      .withMessage('Credential ID is required'),
    body('attestationObject')
      .isString()
      .withMessage('Attestation object is required'),
    body('clientDataJSON')
      .isString()
      .withMessage('Client data JSON is required'),
    body('stellarAddress')
      .isString()
      .withMessage('Stellar address is required'),
    body('userInfo')
      .isObject()
      .withMessage('User info is required')
  ],
  validationMiddleware.validate,
  stellarPasskeyController.completeRegistration
);

/**
 * @route POST /api/v1/auth/passkey/login/begin
 * @desc Begin passkey authentication process
 * @access Public
 */
router.post(
  '/passkey/login/begin',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
  ],
  validationMiddleware.validate,
  stellarPasskeyController.beginAuthentication
);

/**
 * @route POST /api/v1/auth/passkey/login/complete
 * @desc Complete passkey authentication process
 * @access Public
 */
router.post(
  '/passkey/login/complete',
  [
    body('credentialId')
      .isString()
      .withMessage('Credential ID is required'),
    body('authenticatorData')
      .isString()
      .withMessage('Authenticator data is required'),
    body('clientDataJSON')
      .isString()
      .withMessage('Client data JSON is required'),
    body('signature')
      .isString()
      .withMessage('Signature is required'),
    body('challengeId')
      .isString()
      .withMessage('Challenge ID is required'),
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
  ],
  validationMiddleware.validate,
  stellarPasskeyController.completeAuthentication
);

/**
 * @route POST /api/v1/auth/passkey/check
 * @desc Check if user has an existing passkey
 * @access Public
 */
router.post(
  '/passkey/check',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
  ],
  validationMiddleware.validate,
  stellarPasskeyController.checkPasskey
);

/**
 * @route GET /api/v1/auth/passkey/info/:email
 * @desc Get passkey information for user
 * @access Public
 */
router.get(
  '/passkey/info/:email',
  stellarPasskeyController.getPasskeyInfo
);

/**
 * @route POST /api/v1/auth/passkey/revoke
 * @desc Revoke a user's passkey
 * @access Authenticated
 */
router.post(
  '/passkey/revoke',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('reason')
      .optional()
      .isString()
      .withMessage('Reason must be a string')
  ],
  validationMiddleware.validate,
  stellarPasskeyController.revokePasskey
);

module.exports = router; 