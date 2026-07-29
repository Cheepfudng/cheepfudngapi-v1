import { AccountType, UserRole, VerificationStatus } from './enums';

export interface IndividualOnboardingInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface OrganizationOnboardingInput {
  organizationName: string;
  organizationType: string;
  phoneNumber: string;
}

export interface OnboardingUser {
  email: string;
  accountType?: AccountType;
  role: UserRole;
  verificationStatus: VerificationStatus;
}
