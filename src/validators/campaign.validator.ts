import { body, param, query } from 'express-validator';

import { UrgencyLevel } from '../types/enums';

export const listCampaignsValidation = [
  query('urgencyLevel')
    .optional()
    .isIn(Object.values(UrgencyLevel))
    .withMessage('Invalid urgencyLevel'),
  query('state').optional().trim().notEmpty().withMessage('state cannot be empty'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];

export const campaignIdParamValidation = [
  param('id').isMongoId().withMessage('id must be a valid id'),
];

export const listDonationsForCampaignValidation = [
  ...campaignIdParamValidation,
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];

export const createCampaignValidation = [
  body('title').trim().isLength({ min: 10, max: 100 }).withMessage('title must be 10-100 characters'),
  body('description')
    .trim()
    .isLength({ min: 50 })
    .withMessage('description must be at least 50 characters'),
  body('urgencyLevel')
    .isIn(Object.values(UrgencyLevel))
    .withMessage('urgencyLevel must be one of critical, high, medium, low'),
  body('fundingGoal').isFloat({ gt: 0 }).withMessage('fundingGoal must be greater than 0'),
  body('foodGoalDescription').trim().notEmpty().withMessage('foodGoalDescription is required'),
  body('foodGoalQuantity')
    .isFloat({ min: 0 })
    .withMessage('foodGoalQuantity must be 0 or greater'),
  body('foodGoalUnit').trim().notEmpty().withMessage('foodGoalUnit is required'),
  body('distributionPlan').optional().trim(),
  body('state').trim().notEmpty().withMessage('state is required'),
  body('lga').trim().notEmpty().withMessage('lga is required'),
  body('startDate').isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').isISO8601().withMessage('endDate must be a valid date'),
];

export const updateCampaignValidation = [
  ...campaignIdParamValidation,
  body('description').optional().trim().notEmpty().withMessage('description cannot be empty'),
  body('distributionPlan').optional().trim(),
  body('urgencyLevel')
    .optional()
    .isIn(Object.values(UrgencyLevel))
    .withMessage('Invalid urgencyLevel'),
  body('fundingGoal').optional().isFloat({ gt: 0 }).withMessage('fundingGoal must be greater than 0'),
];

export const postCampaignUpdateValidation = [
  ...campaignIdParamValidation,
  body('message').trim().notEmpty().withMessage('message is required'),
];

export const addDistributionRecordValidation = [
  ...campaignIdParamValidation,
  body('date').isISO8601().withMessage('date must be a valid date'),
  body('quantity').isFloat({ min: 0 }).withMessage('quantity must be 0 or greater'),
  body('beneficiaries').isInt({ min: 0 }).withMessage('beneficiaries must be 0 or greater'),
  body('location').trim().notEmpty().withMessage('location is required'),
];

export const donateValidation = [
  ...campaignIdParamValidation,
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
];
