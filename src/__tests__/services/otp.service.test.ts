import { OtpService } from '../../services/otp.services';
import { OtpStore } from '../../integrations/contracts/otp-store.interface';
import { EmailProvider } from '../../integrations/contracts/email-provider.interface';
import { UserRepository } from '../../repositories/user.repository';
import { ErrorCode } from '../../errors/error-codes';
import { VerificationStatus } from '../../types';

jest.mock('../../utils/otp', () => ({
  generateOtp: jest.fn(() => '123456'),
}));

describe('OtpService', () => {
  let otpService: OtpService;
  let otpStore: jest.Mocked<OtpStore>;
  let emailProvider: jest.Mocked<EmailProvider>;
  let userRepository: jest.Mocked<UserRepository>;

  const user = {
    _id: {
      toString: () => 'user-id-123',
    },
    email: 'test@example.com',
  } as any;

  beforeEach(() => {
    otpStore = {
      save: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    emailProvider = {
      sendEmail: jest.fn(),
    };

    userRepository = {
      findByEmail: jest.fn(),
      createIfNotExists: jest.fn(),
      updateById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    userRepository.createIfNotExists.mockResolvedValue(user);
    userRepository.findByEmail.mockResolvedValue(user);

    otpService = new OtpService(otpStore, emailProvider, userRepository);
  });

  describe('sendOtp', () => {
    it('should save and send an OTP successfully', async () => {
      await otpService.sendOtp('test@example.com');

      expect(userRepository.createIfNotExists).toHaveBeenCalledWith('test@example.com');

      expect(otpStore.save).toHaveBeenCalled();

      expect(emailProvider.sendEmail).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should return true for a valid OTP', async () => {
      otpStore.get.mockResolvedValue({
        code: '123456',
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      userRepository.findByEmail.mockResolvedValue({
        _id: {
          toString: () => 'user-id-123',
        },
        email: 'test@example.com',
      } as any);

      const result = await otpService.verifyOtp('test@example.com', '123456');

      expect(result).toBe(true);

      expect(otpStore.delete).toHaveBeenCalledWith('otp:email:test@example.com');

      expect(userRepository.updateById).toHaveBeenCalledWith('user-id-123', {
        isEmailVerified: true,
        verificationStatus: VerificationStatus.VERIFIED,
      });
    });

    it('should throw INVALID_OTP for an invalid OTP', async () => {
      otpStore.get.mockResolvedValue({
        code: '123456',
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(otpService.verifyOtp('test@example.com', '999999')).rejects.toMatchObject({
        code: ErrorCode.INVALID_OTP,
      });

      expect(otpStore.save).toHaveBeenCalled();
    });

    it('should throw INVALID_OTP when no OTP exists', async () => {
      otpStore.get.mockResolvedValue(null);

      await expect(otpService.verifyOtp('test@example.com', '123456')).rejects.toMatchObject({
        code: ErrorCode.INVALID_OTP,
      });
    });

    it('should delete and throw OTP_EXPIRED for an expired OTP', async () => {
      otpStore.get.mockResolvedValue({
        code: '123456',
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(otpService.verifyOtp('test@example.com', '123456')).rejects.toMatchObject({
        code: ErrorCode.OTP_EXPIRED,
      });

      expect(otpStore.delete).toHaveBeenCalledWith('otp:email:test@example.com');
    });

    it('should delete and throw OTP_MAX_ATTEMPTS after maximum attempts', async () => {
      otpStore.get.mockResolvedValue({
        code: '123456',
        attempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(otpService.verifyOtp('test@example.com', '123456')).rejects.toMatchObject({
        code: ErrorCode.OTP_MAX_ATTEMPTS,
      });

      expect(otpStore.delete).toHaveBeenCalledWith('otp:email:test@example.com');
    });

    it('should throw USER_NOT_FOUND when OTP is valid but user does not exist', async () => {
      otpStore.get.mockResolvedValue({
        code: '123456',
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      userRepository.findByEmail.mockResolvedValue(null);

      await expect(otpService.verifyOtp('test@example.com', '123456')).rejects.toMatchObject({
        code: ErrorCode.USER_NOT_FOUND,
      });
    });
  });
});
