import { Router } from 'express';

import { organizationController } from '../controllers/organization.controller';
import { protect } from '../middleware/protect.middleware';
import { uploadDocuments } from '../middleware/upload.middleware';
import { asyncHandler } from '../utils/async-handler';
import { requireVerifiedOrganization } from '../middleware/verification.middleware';

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
// Placeholder — stands in for the first real org-only endpoint (e.g. product listing)
router.get(
  '/dashboard',
  asyncHandler(protect),
  requireVerifiedOrganization,
  asyncHandler(organizationController.dashboard)
);

export default router;
