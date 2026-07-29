import { Router } from 'express';

import {
  accountTypeValidation,
  individualOnboardingValidation,
  organizationOnboardingValidation,
} from '../validators/onboarding.validator';

import { validateRequest } from '../middleware/validation.middleware';

import { onboardingController } from '../controllers/onboarding.controller';

import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.post(
  '/account-type',
  accountTypeValidation,
  validateRequest,
  asyncHandler(onboardingController.selectAccountType)
);

router.post(
  '/individual',
  individualOnboardingValidation,
  validateRequest,
  asyncHandler(onboardingController.completeIndividual)
);

router.post(
  '/organization',
  organizationOnboardingValidation,
  validateRequest,
  asyncHandler(onboardingController.completeOrganization)
);

export default router;
