import { OnboardingService } from '../../services/onboarding.service';
import { UserRepository } from '../../repositories/user.repository';
import { AccountType, UserRole, VerificationStatus } from '../../types/enums';
import { ErrorCode } from '../../errors/error-codes';

describe('OnboardingService', () => {
  let onboardingService: OnboardingService;
  let userRepository: jest.Mocked<UserRepository>;

  const user = {
    _id: {
      toString: () => 'user-id-123',
    },
    email: 'test@example.com',
    role: UserRole.USER,
    verificationStatus: VerificationStatus.VERIFIED,
    isEmailVerified: true,
    isActive: true,
  } as any;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      updateById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    onboardingService = new OnboardingService(userRepository);
  });

  describe('selectAccountType', () => {
    it('should throw when user does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        onboardingService.selectAccountType('test@example.com', AccountType.INDIVIDUAL)
      ).rejects.toMatchObject({
        code: ErrorCode.USER_NOT_FOUND,
        statusCode: 404,
      });
    });

    it('should reject unverified users', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...user,
        verificationStatus: VerificationStatus.PENDING,
      } as any);

      await expect(
        onboardingService.selectAccountType('test@example.com', AccountType.INDIVIDUAL)
      ).rejects.toMatchObject({
        code: ErrorCode.UNAUTHORIZED,
        statusCode: 403,
      });
    });

    it('should select individual account type', async () => {
      userRepository.findByEmail.mockResolvedValue(user);
      userRepository.updateById.mockResolvedValue({
        ...user,
        accountType: AccountType.INDIVIDUAL,
        role: UserRole.USER,
      } as any);

      const result = await onboardingService.selectAccountType(
        'test@example.com',
        AccountType.INDIVIDUAL
      );

      expect(userRepository.updateById).toHaveBeenCalledWith('user-id-123', {
        accountType: AccountType.INDIVIDUAL,
        role: UserRole.USER,
      });

      expect(result?.accountType).toBe(AccountType.INDIVIDUAL);
    });

    it('should select organization account type with admin role', async () => {
      userRepository.findByEmail.mockResolvedValue(user);
      userRepository.updateById.mockResolvedValue({
        ...user,
        accountType: AccountType.ORGANIZATION,
        role: UserRole.ADMIN,
      } as any);

      const result = await onboardingService.selectAccountType(
        'test@example.com',
        AccountType.ORGANIZATION
      );

      expect(userRepository.updateById).toHaveBeenCalledWith('user-id-123', {
        accountType: AccountType.ORGANIZATION,
        role: UserRole.ADMIN,
      });

      expect(result?.accountType).toBe(AccountType.ORGANIZATION);
    });
  });

  describe('completeIndividualOnboarding', () => {
    const input = {
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+2348012345678',
    };

    it('should reject a user with the wrong account type', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...user,
        accountType: AccountType.ORGANIZATION,
      } as any);

      await expect(
        onboardingService.completeIndividualOnboarding('test@example.com', input)
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
      });
    });

    it('should complete individual onboarding', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...user,
        accountType: AccountType.INDIVIDUAL,
      } as any);

      userRepository.updateById.mockResolvedValue({
        ...user,
        ...input,
        accountType: AccountType.INDIVIDUAL,
      } as any);

      const result = await onboardingService.completeIndividualOnboarding(
        'test@example.com',
        input
      );

      expect(userRepository.updateById).toHaveBeenCalledWith('user-id-123', {
        ...input,
        verificationStatus: VerificationStatus.VERIFIED,
      });

      expect(result?.firstName).toBe('John');
    });
  });

  describe('completeOrganizationOnboarding', () => {
    const input = {
      organizationName: 'Cheepfud Foundation',
      organizationType: 'non_profit',
      phoneNumber: '+2348012345678',
    };

    it('should reject a user with the wrong account type', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...user,
        accountType: AccountType.INDIVIDUAL,
      } as any);

      await expect(
        onboardingService.completeOrganizationOnboarding('test@example.com', input)
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
      });
    });

    it('should complete organization onboarding', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...user,
        accountType: AccountType.ORGANIZATION,
      } as any);

      userRepository.updateById.mockResolvedValue({
        ...user,
        ...input,
        accountType: AccountType.ORGANIZATION,
      } as any);

      const result = await onboardingService.completeOrganizationOnboarding(
        'test@example.com',
        input
      );

      expect(userRepository.updateById).toHaveBeenCalledWith('user-id-123', {
        ...input,
        verificationStatus: VerificationStatus.VERIFIED,
      });

      expect(result?.organizationName).toBe('Cheepfud Foundation');
    });
  });
});
