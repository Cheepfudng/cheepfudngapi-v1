import { body } from 'express-validator';

import { AccountType, OrganizationType } from '../types/enums';
import { passwordRules, phoneValidationRule } from './common.validator';

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

  phoneValidationRule('phoneNumber'),

  ...passwordRules,
];

export const organizationOnboardingValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),

  body('organizationName').trim().notEmpty().withMessage('Organization name is required'),

  body('organizationType')
    .isIn(Object.values(OrganizationType))
    .withMessage('Invalid organization type'),

  phoneValidationRule('phoneNumber'),

  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('description cannot exceed 1000 characters'),

  ...passwordRules,
];
