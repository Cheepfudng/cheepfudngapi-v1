export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  ORGANIZATION = 'organization',
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
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum DeliveryMethod {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
}

export enum TransactionType {
  PRODUCT_PURCHASE = 'product_purchase',
  CAMPAIGN_DONATION = 'campaign_donation',
}

export enum OrganizationType {
  FARMER = 'farmer',
  VENDOR = 'vendor',
  NGO = 'ngo',
  FOUNDATION = 'foundation',
  RELIGIOUS_BODY = 'religious_body',
  AGENCY = 'agency',
}

export enum UrgencyLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum CampaignStatus {
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
