import { Router } from 'express';

import { adminController } from '../controllers/admin.controller';
import { protect } from '../middleware/protect.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  listCampaignsValidation,
  listOrdersAdminValidation,
  listOrganizationsValidation,
  listProductsAdminValidation,
  listUsersValidation,
  moderateProductValidation,
  reviewCampaignValidation,
  reviewOrganizationValidation,
  updateUserStatusValidation,
} from '../validators/admin.validator';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '../types/enums';

const router = Router();

router.use(asyncHandler(protect), requireRole(UserRole.ADMIN));

router.get(
  '/organizations',
  listOrganizationsValidation,
  validateRequest,
  asyncHandler(adminController.listOrganizations)
);
router.get('/organizations/:id', asyncHandler(adminController.getOrganization));
router.put(
  '/organizations/:id/verify',
  reviewOrganizationValidation,
  validateRequest,
  asyncHandler(adminController.reviewOrganization)
);

router.get(
  '/campaigns',
  listCampaignsValidation,
  validateRequest,
  asyncHandler(adminController.listCampaigns)
);
router.put(
  '/campaigns/:id/approve',
  reviewCampaignValidation,
  validateRequest,
  asyncHandler(adminController.reviewCampaign)
);

router.post('/orders/expire-stale', asyncHandler(adminController.expireStaleOrders));

router.get('/users', listUsersValidation, validateRequest, asyncHandler(adminController.listUsers));
router.put(
  '/users/:id/status',
  updateUserStatusValidation,
  validateRequest,
  asyncHandler(adminController.updateUserStatus)
);

router.get(
  '/orders',
  listOrdersAdminValidation,
  validateRequest,
  asyncHandler(adminController.listOrders)
);

router.get(
  '/products',
  listProductsAdminValidation,
  validateRequest,
  asyncHandler(adminController.listProducts)
);
router.put(
  '/products/:id/moderate',
  moderateProductValidation,
  validateRequest,
  asyncHandler(adminController.moderateProduct)
);

router.get('/dashboard', asyncHandler(adminController.dashboard));

export default router;
