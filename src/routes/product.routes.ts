import { Router } from 'express';

import { productController } from '../controllers/product.controller';
import { protect } from '../middleware/protect.middleware';
import { uploadProductImages } from '../middleware/upload.middleware';
import {
  requireSupplyOrganization,
  requireVerifiedOrganization,
} from '../middleware/verification.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createProductValidation,
  listProductsValidation,
  updateProductValidation,
} from '../validators/product.validator';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/', listProductsValidation, validateRequest, asyncHandler(productController.list));
router.get('/:id', asyncHandler(productController.getById));

router.post(
  '/',
  asyncHandler(protect),
  requireVerifiedOrganization,
  requireSupplyOrganization,
  uploadProductImages,
  createProductValidation,
  validateRequest,
  asyncHandler(productController.create)
);

router.put(
  '/:id',
  asyncHandler(protect),
  updateProductValidation,
  validateRequest,
  asyncHandler(productController.update)
);

router.delete('/:id', asyncHandler(protect), asyncHandler(productController.remove));

export default router;
