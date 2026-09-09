import { body, param, query } from 'express-validator';

export const productIdParamValidation = [
  param('id').isMongoId().withMessage('id must be a valid id'),
];

export const listProductsValidation = [
  query('category').optional().trim().notEmpty().withMessage('category cannot be empty'),
  query('state').optional().trim().notEmpty().withMessage('state cannot be empty'),
  query('lga').optional().trim().notEmpty().withMessage('lga cannot be empty'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be a positive number'),
  query('search').optional().trim().notEmpty().withMessage('search cannot be empty'),
  query('sort')
    .optional()
    .isIn(['price_asc', 'price_desc', 'newest'])
    .withMessage('sort must be one of price_asc, price_desc, newest'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];

export const createProductValidation = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('category').trim().notEmpty().withMessage('category is required'),
  body('description').trim().notEmpty().withMessage('description is required'),
  body('price').isFloat({ gt: 0 }).withMessage('price must be greater than 0'),
  body('unit').trim().notEmpty().withMessage('unit is required'),
  body('quantityAvailable')
    .isFloat({ min: 0 })
    .withMessage('quantityAvailable must be 0 or greater'),
  body('minimumOrder').isFloat({ min: 1 }).withMessage('minimumOrder must be at least 1'),
  body('state').trim().notEmpty().withMessage('state is required'),
  body('lga').trim().notEmpty().withMessage('lga is required'),
];

export const updateProductValidation = [
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('description cannot be empty'),
  body('price').optional().isFloat({ gt: 0 }).withMessage('price must be greater than 0'),
  body('unit').optional().trim().notEmpty().withMessage('unit cannot be empty'),
  body('quantityAvailable')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('quantityAvailable must be 0 or greater'),
  body('minimumOrder')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('minimumOrder must be at least 1'),
  body('location.state').optional().trim().notEmpty().withMessage('location.state cannot be empty'),
  body('location.lga').optional().trim().notEmpty().withMessage('location.lga cannot be empty'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];
