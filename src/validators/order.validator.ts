import { body, param, query } from 'express-validator';

import { DeliveryMethod, OrderStatus } from '../types/enums';

export const checkoutValidation = [
  body('addressId').isMongoId().withMessage('addressId must be a valid id'),
  body('deliveryMethod')
    .isIn(Object.values(DeliveryMethod))
    .withMessage('deliveryMethod must be delivery or pickup'),
];

export const listOrdersValidation = [
  query('orderStatus')
    .optional()
    .isIn(Object.values(OrderStatus))
    .withMessage('Invalid orderStatus'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];

export const orderNumberParamValidation = [
  param('orderNumber').trim().notEmpty().withMessage('orderNumber is required'),
];

export const checkoutReferenceParamValidation = [
  param('checkoutReference').trim().notEmpty().withMessage('checkoutReference is required'),
];

export const updateOrderStatusValidation = [
  ...orderNumberParamValidation,
  body('status').isIn(Object.values(OrderStatus)).withMessage('Invalid status'),
];
