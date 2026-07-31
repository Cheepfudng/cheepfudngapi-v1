import { EmailProvider } from '../integrations/contracts/email-provider.interface';
import { OtpStore } from '../integrations/contracts/otp-store.interface';
import { env } from '../config/env';
import { generateOtp } from '../utils/otp';
import { createOtpEmailTemplate } from '../integrations/brevo/templates/otp-email.template';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { UserRepository } from '../repositories/user.repository';
export type OtpPurpose = 'email_verification' | 'password_reset';

export class OtpService {
  constructor(
    private readonly otpStore: OtpStore,
    private readonly emailProvider: EmailProvider,
    private readonly userRepository: UserRepository
  ) {}

  async sendOtp(email: string, purpose: OtpPurpose = 'email_verification'): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    if (purpose === 'email_verification') {
      await this.userRepository.createIfNotExists(normalizedEmail);
    } else {
      const exists = await this.userRepository.existsByEmail(normalizedEmail);
      if (!exists) return;
    }

    const code = generateOtp(env.OTP_LENGTH);
    const key = `otp:${purpose}:${normalizedEmail}`;

    await this.otpStore.save(
      key,
      {
        code,
        attempts: 0,
        expiresAt: new Date(Date.now() + env.OTP_EXPIRES_IN_MINUTES * 60 * 1000),
      },
      env.OTP_EXPIRES_IN_MINUTES * 60
    );

    const subject =
      purpose === 'password_reset'
        ? 'Reset your Cheepfud password'
        : 'Your Cheepfud verification code';

    await this.emailProvider.sendEmail({
      to: normalizedEmail,
      subject,
      htmlContent: createOtpEmailTemplate({
        otp: code,
        expiresInMinutes: env.OTP_EXPIRES_IN_MINUTES,
      }),
    });
  }

  async verifyOtp(email: string, code: string, purpose: OtpPurpose = 'email_verification') {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    const key = `otp:${purpose}:${normalizedEmail}`;

    const record = await this.otpStore.get(key);

    if (!record) {
      throw new AppError('OTP is invalid or has expired', 400, ErrorCode.INVALID_OTP);
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await this.otpStore.delete(key);
      throw new AppError('OTP has expired', 400, ErrorCode.OTP_EXPIRED);
    }

    if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
      await this.otpStore.delete(key);
      throw new AppError('Maximum OTP attempts exceeded', 429, ErrorCode.OTP_MAX_ATTEMPTS);
    }

    if (record.code !== normalizedCode) {
      await this.otpStore.save(
        key,
        { ...record, attempts: record.attempts + 1 },
        Math.max(1, Math.floor((record.expiresAt.getTime() - Date.now()) / 1000))
      );
      throw new AppError('Invalid OTP', 400, ErrorCode.INVALID_OTP);
    }

    await this.otpStore.delete(key);

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);
    }

    if (purpose === 'email_verification') {
      await this.userRepository.updateById(user._id.toString(), { isEmailVerified: true });
    }

    return user;
  }
}
