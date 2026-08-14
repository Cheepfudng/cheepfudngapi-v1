import { body, param } from 'express-validator';

import { NIGERIAN_STATES } from '../utils/constants';

// Reuses the same Nigerian phone pattern as onboarding.validator.ts.
const NIGERIAN_PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export const addressIdParamValidation = [
  param('addressId').isMongoId().withMessage('addressId must be a valid id'),
];

export const createAddressValidation = [
  body('label').trim().notEmpty().withMessage('label is required'),
  body('street').trim().notEmpty().withMessage('street is required'),
  body('city').trim().notEmpty().withMessage('city is required'),
  body('state').isIn(NIGERIAN_STATES).withMessage('state must be a valid Nigerian state'),
  body('phone')
    .trim()
    .matches(NIGERIAN_PHONE_REGEX)
    .withMessage('A valid phone number is required'),
];

// isDefault is deliberately not a validated/accepted field here — see UserService.updateAddress.
export const updateAddressValidation = [
  ...addressIdParamValidation,
  body('label').optional().trim().notEmpty().withMessage('label cannot be empty'),
  body('street').optional().trim().notEmpty().withMessage('street cannot be empty'),
  body('city').optional().trim().notEmpty().withMessage('city cannot be empty'),
  body('state')
    .optional()
    .isIn(NIGERIAN_STATES)
    .withMessage('state must be a valid Nigerian state'),
  body('phone')
    .optional()
    .trim()
    .matches(NIGERIAN_PHONE_REGEX)
    .withMessage('A valid phone number is required'),
];
