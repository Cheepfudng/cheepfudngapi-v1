import { Router } from 'express';

import { cartController } from '../controllers/cart.controller';
import { protect } from '../middleware/protect.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  addToCartValidation,
  adjustCartQuantityValidation,
  removeCartItemValidation,
  updateCartValidation,
} from '../validators/cart.validator';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(asyncHandler(protect));

router.post('/add', addToCartValidation, validateRequest, asyncHandler(cartController.addItem));
router.get('/', asyncHandler(cartController.getCart));
router.put(
  '/update',
  updateCartValidation,
  validateRequest,
  asyncHandler(cartController.updateItem)
);
router.patch(
  '/increment',
  adjustCartQuantityValidation,
  validateRequest,
  asyncHandler(cartController.adjustQuantity)
);
router.delete('/', asyncHandler(cartController.clearCart));
router.delete(
  '/:productId',
  removeCartItemValidation,
  validateRequest,
  asyncHandler(cartController.removeItem)
);

export default router;
