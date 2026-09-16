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

// Reuses OrderStatus.CANCELLED as the single source of truth for order state — this is
// metadata about WHY, not a second status field that could drift from orderStatus.
export enum CancellationReason {
  BUYER_REQUESTED = 'buyer_requested',
  PAYMENT_EXPIRED = 'payment_expired',
}

// Single source of truth for a product's review state (Phase 19) — replaces the old
// isApproved boolean, which couldn't distinguish "never reviewed" from "explicitly
// rejected." No separate isApproved field kept alongside this one.
export enum ProductModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Flags a Transaction whose payment resolved successfully (webhook success) after its
// related order(s) had already reached a terminal cancelled state — Paystack has no way to
// void/expire a checkout reference early, so a stale but still-live payment link can be
// paid for real after the order it was for is already gone. Purely a "needs manual review"
// marker; no automatic refund/reconciliation happens from this alone.
export enum TransactionAnomalyType {
  PAID_AFTER_ORDER_CANCELLED = 'paid_after_order_cancelled',
}
