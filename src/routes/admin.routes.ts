import { Router } from 'express';

import { adminController } from '../controllers/admin.controller';
import { protect } from '../middleware/protect.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  listCampaignsValidation,
  listOrganizationsValidation,
  reviewCampaignValidation,
  reviewOrganizationValidation,
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

export default router;
