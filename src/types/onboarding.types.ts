import { AccountType, OrganizationType, UserRole, VerificationStatus } from './enums';

export interface IndividualOnboardingInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

export interface OrganizationOnboardingInput {
  organizationName: string;
  organizationType: OrganizationType;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

export interface OnboardingUser {
  email: string;
  accountType?: AccountType;
  role: UserRole;
  verificationStatus: VerificationStatus;
}
