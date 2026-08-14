import { body, param } from 'express-validator';

export const addToCartValidation = [
  body('productId').isMongoId().withMessage('productId must be a valid id'),
  body('quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1'),
];

export const updateCartValidation = [
  body('productId').isMongoId().withMessage('productId must be a valid id'),
  body('quantity').isInt({ min: 0 }).withMessage('quantity must be 0 or greater'),
];

export const removeCartItemValidation = [
  param('productId').isMongoId().withMessage('productId must be a valid id'),
];

export const adjustCartQuantityValidation = [
  body('productId').isMongoId().withMessage('productId must be a valid id'),
  body('delta')
    .custom((value) => value === 1 || value === -1)
    .withMessage('delta must be exactly 1 or -1'),
];
