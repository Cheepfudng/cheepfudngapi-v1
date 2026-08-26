import { Router } from 'express';

import { campaignController } from '../controllers/campaign.controller';
import { optionalAuth, protect } from '../middleware/protect.middleware';
import { uploadCampaignImages, uploadDistributionMedia } from '../middleware/upload.middleware';
import {
  requireCampaignOrganization,
  requireVerifiedOrganization,
} from '../middleware/verification.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  addDistributionRecordValidation,
  campaignIdParamValidation,
  createCampaignValidation,
  donateValidation,
  listCampaignsValidation,
  listDonationsForCampaignValidation,
  postCampaignUpdateValidation,
  updateCampaignValidation,
} from '../validators/campaign.validator';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Owner-only middleware chain, reused across every campaign-org endpoint below —
// mirrors requireSupplyOrganization's usage on Products exactly.
const ownerOnly = [asyncHandler(protect), requireVerifiedOrganization, requireCampaignOrganization];

router.get('/', listCampaignsValidation, validateRequest, asyncHandler(campaignController.list));
router.get(
  '/:id',
  campaignIdParamValidation,
  validateRequest,
  asyncHandler(optionalAuth),
  asyncHandler(campaignController.getById)
);

router.post(
  '/:id/donate',
  asyncHandler(protect),
  donateValidation,
  validateRequest,
  asyncHandler(campaignController.donate)
);

router.post(
  '/',
  ...ownerOnly,
  uploadCampaignImages,
  createCampaignValidation,
  validateRequest,
  asyncHandler(campaignController.create)
);

router.put(
  '/:id',
  ...ownerOnly,
  updateCampaignValidation,
  validateRequest,
  asyncHandler(campaignController.update)
);

router.post(
  '/:id/updates',
  ...ownerOnly,
  postCampaignUpdateValidation,
  validateRequest,
  asyncHandler(campaignController.postUpdate)
);

router.post(
  '/:id/distribution-records',
  ...ownerOnly,
  uploadDistributionMedia,
  addDistributionRecordValidation,
  validateRequest,
  asyncHandler(campaignController.addDistributionRecord)
);

router.get(
  '/:id/fund-summary',
  ...ownerOnly,
  campaignIdParamValidation,
  validateRequest,
  asyncHandler(campaignController.getFundSummary)
);

router.get(
  '/:id/donations',
  ...ownerOnly,
  listDonationsForCampaignValidation,
  validateRequest,
  asyncHandler(campaignController.getDonations)
);

export default router;
