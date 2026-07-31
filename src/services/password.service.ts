import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenStore } from '../integrations/contracts/refresh-token-store.interface';
import { OtpService } from './otp.services';
import { AuthService } from './auth.service';

export class PasswordService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpService: OtpService,
    private readonly refreshTokenStore: RefreshTokenStore,
    private readonly authService: AuthService
  ) {}

  async forgotPassword(email: string): Promise<void> {
    await this.otpService.sendOtp(email, 'password_reset');
    // Caller always returns the same generic message regardless of outcome
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const user = await this.otpService.verifyOtp(email, code, 'password_reset');

    user.password = newPassword;
    await this.userRepository.save(user); // triggers hash + passwordChangedAt hooks

    // Unauthenticated recovery flow — kill every session, require fresh login
    await this.refreshTokenStore.deleteAllForUser(user._id.toString());
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findByIdWithPassword(userId);

    if (!user || !(await user.comparePassword(currentPassword))) {
      throw new AppError('Current password is incorrect', 401, ErrorCode.INVALID_CURRENT_PASSWORD);
    }

    user.password = newPassword;
    await this.userRepository.save(user);

    // Kill all sessions, then issue a fresh pair so THIS session survives
    await this.refreshTokenStore.deleteAllForUser(user._id.toString());
    const tokens = await this.authService.issueTokens(
      user._id.toString(),
      user.role,
      user.verificationStatus
    );

    return { user, ...tokens };
  }
}
