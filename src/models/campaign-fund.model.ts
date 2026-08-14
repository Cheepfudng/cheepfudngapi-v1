import { Document, Schema, Types, model } from 'mongoose';

// The most sensitive model in this phase — see BACKEND_RULES.md §20 (Cheepfud Restricted
// Funds Rule). canWithdrawCash/isRestricted are schema-level immutable: this is a
// non-negotiable business invariant, not a style preference, and must never be settable
// again once the document is created (not even by a future admin tool).

export interface ICampaignDonation {
  donor: Types.ObjectId;
  amount: number;
  transaction: Types.ObjectId;
  donatedAt: Date;
}

export interface ICampaignFundAuditEntry {
  action: string;
  amount: number;
  // Optional: system-driven entries (e.g. a webhook-triggered donation) have no human actor.
  actor?: Types.ObjectId;
  timestamp: Date;
}

export interface ICampaignFund extends Document {
  campaign: Types.ObjectId;
  canWithdrawCash: boolean;
  isRestricted: boolean;
  totalDonated: number;
  totalAllocatedToFood: number;
  totalDelivered: number;
  availableBalance: number;
  donations: Types.DocumentArray<ICampaignDonation>;
  auditTrail: ICampaignFundAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const campaignDonationSchema = new Schema<ICampaignDonation>({
  donor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0.01 },
  transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true },
  donatedAt: { type: Date, required: true, default: () => new Date() },
});

const campaignFundAuditEntrySchema = new Schema<ICampaignFundAuditEntry>(
  {
    action: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false }
);

const campaignFundSchema = new Schema<ICampaignFund>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, unique: true },
    canWithdrawCash: { type: Boolean, default: false, immutable: true },
    isRestricted: { type: Boolean, default: true, immutable: true },
    totalDonated: { type: Number, default: 0, min: 0 },
    // Both stay 0 until the future procurement-conversion phase exists — present now so
    // that phase doesn't need a migration.
    totalAllocatedToFood: { type: Number, default: 0, min: 0 },
    totalDelivered: { type: Number, default: 0, min: 0 },
    availableBalance: { type: Number, default: 0 },
    donations: { type: [campaignDonationSchema], default: [] },
    auditTrail: { type: [campaignFundAuditEntrySchema], default: [] },
  },
  { timestamps: true }
);

// availableBalance is always a derived value, never set directly by callers.
campaignFundSchema.pre('save', function (next) {
  this.availableBalance = this.totalDonated - this.totalAllocatedToFood;
  next();
});

export const CampaignFundModel = model<ICampaignFund>('CampaignFund', campaignFundSchema);
