import { Router } from 'express';

import { orderController } from '../controllers/order.controller';
import { protect } from '../middleware/protect.middleware';
import { checkoutLimiter } from '../middleware/rateLimiter.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  requireSupplyOrganization,
  requireVerifiedOrganization,
} from '../middleware/verification.middleware';
import {
  checkoutReferenceParamValidation,
  checkoutValidation,
  listOrdersValidation,
  orderNumberParamValidation,
  updateOrderStatusValidation,
} from '../validators/order.validator';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(asyncHandler(protect));

// Buyer
router.post(
  '/checkout',
  checkoutLimiter,
  checkoutValidation,
  validateRequest,
  asyncHandler(orderController.checkout)
);
router.get('/', listOrdersValidation, validateRequest, asyncHandler(orderController.listMine));
router.get(
  '/checkout/:checkoutReference',
  checkoutReferenceParamValidation,
  validateRequest,
  asyncHandler(orderController.getByCheckoutReference)
);

// Seller
router.get(
  '/seller/incoming',
  requireVerifiedOrganization,
  requireSupplyOrganization,
  listOrdersValidation,
  validateRequest,
  asyncHandler(orderController.listIncoming)
);
router.put(
  '/:orderNumber/status',
  requireVerifiedOrganization,
  requireSupplyOrganization,
  updateOrderStatusValidation,
  validateRequest,
  asyncHandler(orderController.updateStatus)
);

// Buyer (order-number scoped)
router.get(
  '/:orderNumber',
  orderNumberParamValidation,
  validateRequest,
  asyncHandler(orderController.getDetail)
);
router.post(
  '/:orderNumber/cancel',
  orderNumberParamValidation,
  validateRequest,
  asyncHandler(orderController.cancel)
);
router.post(
  '/:orderNumber/confirm-delivery',
  orderNumberParamValidation,
  validateRequest,
  asyncHandler(orderController.confirmDelivery)
);

export default router;
