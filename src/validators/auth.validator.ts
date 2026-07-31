import { body } from 'express-validator';
import { passwordRules } from './common.validator';

export const loginValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const refreshValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
];

export const resetPasswordValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit code'),
  ...passwordRules,
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  ...passwordRules,
];
