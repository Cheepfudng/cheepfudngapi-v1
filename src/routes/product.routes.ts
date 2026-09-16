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
  listMyProductsValidation,
  listProductsValidation,
  productIdParamValidation,
  updateProductValidation,
} from '../validators/product.validator';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/', listProductsValidation, validateRequest, asyncHandler(productController.list));

// Must be registered before GET /:id — otherwise Express would match "mine" as the :id
// param and fail isMongoId validation before ever reaching this handler.
router.get(
  '/mine',
  asyncHandler(protect),
  requireVerifiedOrganization,
  requireSupplyOrganization,
  listMyProductsValidation,
  validateRequest,
  asyncHandler(productController.listMine)
);

// Must also be registered before GET /:id, same reasoning as /mine above.
router.get(
  '/mine/:id',
  asyncHandler(protect),
  requireVerifiedOrganization,
  requireSupplyOrganization,
  productIdParamValidation,
  validateRequest,
  asyncHandler(productController.getMine)
);

router.get(
  '/:id',
  productIdParamValidation,
  validateRequest,
  asyncHandler(productController.getById)
);

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

// uploadProductImages (multer) only activates for multipart/form-data requests -- a plain
// JSON request (the existing contract for every other field) is untouched, since multer
// simply calls next() when the Content-Type isn't multipart. This is what lets images stay
// optional on update without breaking every existing JSON-only caller.
router.put(
  '/:id',
  asyncHandler(protect),
  productIdParamValidation,
  uploadProductImages,
  updateProductValidation,
  validateRequest,
  asyncHandler(productController.update)
);

router.delete(
  '/:id',
  asyncHandler(protect),
  productIdParamValidation,
  validateRequest,
  asyncHandler(productController.remove)
);

export default router;
