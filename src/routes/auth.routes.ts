import { Router } from 'express';

import { authController } from '../controllers/auth.controller';
import { loginValidation, refreshValidation } from '../validators/auth.validator';
import { validateRequest } from '../middleware/validation.middleware';
import { protect } from '../middleware/protect.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} from '../validators/auth.validator';
import { passwordLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/login', loginValidation, validateRequest, asyncHandler(authController.login));
router.post('/refresh', refreshValidation, validateRequest, asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(protect), asyncHandler(authController.logout));
router.get('/me', asyncHandler(protect), asyncHandler(authController.me));
router.post(
  '/forgot-password',
  passwordLimiter,
  forgotPasswordValidation,
  validateRequest,
  asyncHandler(authController.forgotPassword)
);
router.post(
  '/reset-password',
  passwordLimiter,
  resetPasswordValidation,
  validateRequest,
  asyncHandler(authController.resetPassword)
);
router.post(
  '/change-password',
  asyncHandler(protect),
  passwordLimiter,
  changePasswordValidation,
  validateRequest,
  asyncHandler(authController.changePassword)
);

export default router;
