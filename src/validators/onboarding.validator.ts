import { body } from 'express-validator';

import { AccountType } from '../types/enums';

export const requestOtpValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
];

export const verifyOtpValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),

  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit code'),
];

export const accountTypeValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),

  body('accountType').isIn(Object.values(AccountType)).withMessage('Invalid account type'),
];

export const individualOnboardingValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),

  body('firstName').trim().notEmpty().withMessage('First name is required'),

  body('lastName').trim().notEmpty().withMessage('Last name is required'),

  body('phoneNumber')
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('A valid phone number is required'),
];

export const organizationOnboardingValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),

  body('organizationName').trim().notEmpty().withMessage('Organization name is required'),

  body('organizationType').trim().notEmpty().withMessage('Organization type is required'),

  body('phoneNumber')
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('A valid phone number is required'),
];
