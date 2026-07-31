import { BrevoEmailAdapter } from '../integrations/brevo/brevo.email.adapter';
import { RedisOtpStore } from '../integrations/redis/redis.otp.store';
import { UserRepository } from '../repositories/user.repository';

import { OnboardingService } from './onboarding.service';
import { OtpService } from './otp.service';
import { RedisRefreshTokenStore } from '../integrations/redis/redis.refresh-token.store';
import { RedisTokenBlacklistStore } from '../integrations/redis/redis.token-blacklist.store';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { CloudinaryDocumentStorage } from '../integrations/cloudinary/cloudinary.document-storage';
import { VerificationDocumentRepository } from '../repositories/verification-document.repository';
import { DocumentService } from './document.service';
import { AdminService } from './admin.service';

export const refreshTokenStore = new RedisRefreshTokenStore();
export const tokenBlacklistStore = new RedisTokenBlacklistStore();

export const userRepository = new UserRepository();
export const authService = new AuthService(userRepository, refreshTokenStore, tokenBlacklistStore);

export const otpStore = new RedisOtpStore();
export const emailProvider = new BrevoEmailAdapter();

export const otpService = new OtpService(otpStore, emailProvider, userRepository);
export const documentStorage = new CloudinaryDocumentStorage();
export const verificationDocumentRepository = new VerificationDocumentRepository();

export const adminService = new AdminService(
  userRepository,
  verificationDocumentRepository,
  emailProvider
);
export const documentService = new DocumentService(
  userRepository,
  verificationDocumentRepository,
  documentStorage
);
export const onboardingService = new OnboardingService(userRepository);
export const passwordService = new PasswordService(
  userRepository,
  otpService,
  refreshTokenStore,
  authService
);
