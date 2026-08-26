import { Router } from 'express';

import { organizationController } from '../controllers/organization.controller';
import { protect } from '../middleware/protect.middleware';
import { requireRole } from '../middleware/role.middleware';
import { uploadDocuments } from '../middleware/upload.middleware';
import { asyncHandler } from '../utils/async-handler';
import { requireVerifiedOrganization } from '../middleware/verification.middleware';
import { UserRole } from '../types/enums';

const router = Router();

router.post(
  '/documents',
  asyncHandler(protect),
  uploadDocuments,
  asyncHandler(organizationController.uploadDocuments)
);
router.get(
  '/verification-status',
  asyncHandler(protect),
  asyncHandler(organizationController.verificationStatus)
);
router.get(
  '/document-catalog',
  asyncHandler(protect),
  asyncHandler(organizationController.documentCatalog)
);
// Phase 13: real stats, branching on supply vs campaign category. requireRole is a
// deliberate tightening from the Phase 6 placeholder (which was reachable by any role, on
// purpose, to prove requireVerifiedOrganization ignored non-organization roles) — real
// stats logic doesn't make sense for a non-organization account.
router.get(
  '/dashboard',
  asyncHandler(protect),
  requireRole(UserRole.ORGANIZATION),
  requireVerifiedOrganization,
  asyncHandler(organizationController.dashboard)
);

export default router;
