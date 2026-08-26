import { body, query } from 'express-validator';

import {
  CampaignStatus,
  OrderStatus,
  PaymentStatus,
  ProductModerationStatus,
  UserRole,
  VerificationStatus,
} from '../types/enums';

export const listOrganizationsValidation = [
  query('status').optional().isIn(Object.values(VerificationStatus)).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
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

export const listCampaignsValidation = [
  query('status').optional().isIn(Object.values(CampaignStatus)).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];

export const reviewCampaignValidation = [
  body('decision')
    .isIn(['approved', 'rejected'])
    .withMessage('decision must be approved or rejected'),
  body('rejectionReason')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('rejectionReason cannot be empty'),
];

export const listUsersValidation = [
  query('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];

export const updateUserStatusValidation = [
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
];

export const listOrdersAdminValidation = [
  query('orderStatus')
    .optional()
    .isIn(Object.values(OrderStatus))
    .withMessage('Invalid orderStatus'),
  query('paymentStatus')
    .optional()
    .isIn(Object.values(PaymentStatus))
    .withMessage('Invalid paymentStatus'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];

export const listProductsAdminValidation = [
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('moderationStatus')
    .optional()
    .isIn(Object.values(ProductModerationStatus))
    .withMessage('Invalid moderationStatus'),
  query('category').optional().trim().notEmpty().withMessage('category cannot be empty'),
  query('sellerId').optional().isMongoId().withMessage('sellerId must be a valid id'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];

export const moderateProductValidation = [
  body('decision')
    .isIn(['approved', 'rejected'])
    .withMessage('decision must be approved or rejected'),
  body('rejectionReason')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('rejectionReason cannot be empty'),
];
