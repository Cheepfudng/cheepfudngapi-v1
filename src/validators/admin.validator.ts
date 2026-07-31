import { body, query } from 'express-validator';

import { VerificationStatus } from '../types/enums';

export const listOrganizationsValidation = [
  query('status').optional().isIn(Object.values(VerificationStatus)).withMessage('Invalid status'),
];

export const reviewOrganizationValidation = [
  body('decision')
    .isIn(['approved', 'rejected'])
    .withMessage('decision must be approved or rejected'),
  body('rejectionReason')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('rejectionReason cannot be empty'),
];
