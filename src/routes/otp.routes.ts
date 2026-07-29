import { Router } from 'express';

import { otpController } from '../controllers/otp.controller';
import { asyncHandler } from '../utils/async-handler';
import { requestOtpValidation, verifyOtpValidation } from '../validators/onboarding.validator';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

router.post(
  '/request',
  requestOtpValidation,
  validateRequest,
  asyncHandler(otpController.requestOtp)
);

router.post('/verify', verifyOtpValidation, validateRequest, asyncHandler(otpController.verifyOtp));

export default router;
