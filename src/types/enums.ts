export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  FSO = 'fso',
}

export enum AccountType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
}

export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  ACCOUNT_TYPE_SELECTED = 'account_type_selected',
  COMPLETED = 'completed',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
