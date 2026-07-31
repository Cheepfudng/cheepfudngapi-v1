import { Router } from 'express';

import { organizationController } from '../controllers/organization.controller';
import { protect } from '../middleware/protect.middleware';
import { uploadDocuments } from '../middleware/upload.middleware';
import { asyncHandler } from '../utils/async-handler';

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

export default router;
