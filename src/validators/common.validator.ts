import { body, ValidationChain } from 'express-validator';

import { isValidNigerianPhone, normalizeNigerianPhone } from '../utils/phone';

// Shared by every phone-collecting endpoint (onboarding, addresses) so the same number
// can't be valid in one place and invalid in another. Normalizes to +234... in place via
// customSanitizer, same "mutate req.body via the validator chain" pattern normalizeEmail()
// already uses on email fields — validateRequest doesn't use matchedData(), so downstream
// controllers/services see the normalized value directly on req.body.
export const phoneValidationRule = (
  field: string,
  options: { optional?: boolean } = {}
): ValidationChain => {
  const chain = body(field);
  if (options.optional) chain.optional();

  return chain
    .trim()
    .custom(isValidNigerianPhone)
    .withMessage('A valid phone number is required')
    .customSanitizer(normalizeNigerianPhone);
};

export const passwordRules = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];
