import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { UserRepository } from '../repositories/user.repository';
import { AccountType, OnboardingStatus, UserRole, VerificationStatus } from '../types/enums';
import { IndividualOnboardingInput, OrganizationOnboardingInput } from '../types/onboarding.types';

export class OnboardingService {
  constructor(private readonly userRepository: UserRepository) {}

  async selectAccountType(email: string, accountType: AccountType) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);
    }

    if (!user.isEmailVerified) {
      throw new AppError(
        'Email must be verified before selecting an account type',
        403,
        ErrorCode.UNAUTHORIZED
      );
    }

    return this.userRepository.updateById(user._id.toString(), {
      accountType,
      onboardingStatus: OnboardingStatus.ACCOUNT_TYPE_SELECTED,
      role: accountType === AccountType.ORGANIZATION ? UserRole.ORGANIZATION : UserRole.USER,
    });
  }

  async completeIndividualOnboarding(email: string, input: IndividualOnboardingInput) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);
    }

    if (user.onboardingStatus === OnboardingStatus.COMPLETED) {
      throw new AppError('Onboarding has already been completed', 409, ErrorCode.CONFLICT);
    }

    if (!user.isEmailVerified) {
      throw new AppError(
        'Email must be verified before completing onboarding',
        403,
        ErrorCode.UNAUTHORIZED
      );
    }

    if (user.accountType !== AccountType.INDIVIDUAL) {
      throw new AppError('User account type is not individual', 400, ErrorCode.VALIDATION_ERROR);
    }

    user.firstName = input.firstName;
    user.lastName = input.lastName;
    user.phoneNumber = input.phoneNumber;
    user.password = input.password;
    user.onboardingStatus = OnboardingStatus.COMPLETED;
    // Individuals don't need admin review — they're good to go immediately
    user.verificationStatus = VerificationStatus.VERIFIED;

    return this.userRepository.save(user);
  }

  async completeOrganizationOnboarding(email: string, input: OrganizationOnboardingInput) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);
    }

    if (user.onboardingStatus === OnboardingStatus.COMPLETED) {
      throw new AppError('Onboarding has already been completed', 409, ErrorCode.CONFLICT);
    }

    if (!user.isEmailVerified) {
      throw new AppError(
        'Email must be verified before completing onboarding',
        403,
        ErrorCode.UNAUTHORIZED
      );
    }

    if (user.accountType !== AccountType.ORGANIZATION) {
      throw new AppError('User account type is not organization', 400, ErrorCode.VALIDATION_ERROR);
    }

    user.organizationName = input.organizationName;
    user.organizationType = input.organizationType;
    user.phoneNumber = input.phoneNumber;
    user.password = input.password;
    user.onboardingStatus = OnboardingStatus.COMPLETED;
    // Orgs stay pending until admin approves submitted documents (future phase)
    user.verificationStatus = VerificationStatus.PENDING;

    return this.userRepository.save(user);
  }
}
