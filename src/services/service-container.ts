import { BrevoEmailAdapter } from '../integrations/brevo/brevo.email.adapter';
import { RedisOtpStore } from '../integrations/redis/redis.otp.store';
import { UserRepository } from '../repositories/user.repository';

import { OnboardingService } from './onboarding.service';
import { OtpService } from './otp.services';

export const userRepository = new UserRepository();

export const otpStore = new RedisOtpStore();
export const emailProvider = new BrevoEmailAdapter();

export const otpService = new OtpService(otpStore, emailProvider, userRepository);

export const onboardingService = new OnboardingService(userRepository);
