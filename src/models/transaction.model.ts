import { Document, Schema, Types, model } from 'mongoose';

import { PaymentStatus, TransactionAnomalyType, TransactionType } from '../types/enums';

export interface ITransaction extends Document {
  transactionReference: string;
  payer: Types.ObjectId;
  // Combined Naira total across every sibling Order this transaction covers.
  amount: number;
  transactionType: TransactionType;
  status: PaymentStatus;
  // Exactly one of relatedOrders/relatedCampaign is ever populated, never both — enforced
  // in PaymentService, not the schema (schemas can't easily express "exactly one of A or B").
  relatedOrders: Types.ObjectId[];
  relatedCampaign?: Types.ObjectId;
  // Raw Paystack payload (init response and/or webhook event) — kept for debugging,
  // never used as the source of truth for anything beyond that.
  gatewayResponse?: unknown;
  // Set only when PaymentService.processSuccessfulPayment detects payment completed against
  // an order already cancelled (see TransactionAnomalyType) — a visible "needs manual
  // review" marker, not a second status field competing with `status` above.
  anomalyType?: TransactionAnomalyType;
  anomalyDetectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    transactionReference: { type: String, required: true, unique: true, trim: true },
    payer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    transactionType: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    relatedOrders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    relatedCampaign: { type: Schema.Types.ObjectId, ref: 'Campaign' },
    gatewayResponse: { type: Schema.Types.Mixed },
    anomalyType: { type: String, enum: Object.values(TransactionAnomalyType) },
    anomalyDetectedAt: { type: Date },
  },
  { timestamps: true }
);

export const TransactionModel = model<ITransaction>('Transaction', transactionSchema);
