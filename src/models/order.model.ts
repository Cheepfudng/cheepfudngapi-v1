import { Document, Schema, Types, model } from 'mongoose';

import { CancellationReason, DeliveryMethod, OrderStatus, PaymentStatus } from '../types/enums';

// Deliberately the opposite snapshot rule from Cart (which stays live): an Order is a
// historical receipt, so productName/unitPrice are frozen at checkout time. If the seller
// later renames or reprices the product, past orders must keep showing what the buyer
// actually agreed to pay.
export interface IOrderItem {
  product: Types.ObjectId;
  seller: Types.ObjectId;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

// Snapshot of the chosen saved address (Phase 10) at checkout time — copied, not a live
// reference, so editing/deleting the saved address later never changes historical orders.
export interface IOrderDeliveryAddress {
  label: string;
  street: string;
  city: string;
  state: string;
  phone: string;
}

export interface IOrderProofImage {
  url: string;
  publicId: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  checkoutReference: string;
  buyer: Types.ObjectId;
  items: IOrderItem[];
  deliveryAddress: IOrderDeliveryAddress;
  deliveryMethod: DeliveryMethod;
  // subtotal/deliveryFee/total are all scoped to THIS seller's items only — never the
  // combined multi-seller checkout total (that lives on Transaction.amount instead).
  subtotal: number;
  deliveryFee: number;
  total: number;
  // Denormalized from Transaction for fast reads without a join.
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  // Only ever set when orderStatus becomes cancelled — metadata about why, not a second
  // status field (see CancellationReason).
  cancellationReason?: CancellationReason;
  deliveredAt?: Date;
  proofOfDeliveryImages: IOrderProofImage[];
  createdAt: Date;
  updatedAt: Date;
  // Virtual, not a stored field — a single human-readable label derived server-side from
  // (paymentStatus, orderStatus) so every client (mobile, admin) shows the same wording
  // without independently re-deriving it. See getOrderDisplayStatus below.
  readonly displayStatus?: string;
}

// (paymentStatus, orderStatus) -> one label every client renders identically. Keyed on both
// fields together, not orderStatus alone, specifically so the completed+cancelled
// combination — payment received for an order the system has already discarded (see the
// payment-anomaly guard in PaymentService.processSuccessfulPayment) — can be shown
// distinctly from a normal cancellation instead of looking identical to one.
const DISPLAY_STATUS_MAP: Record<string, string> = {
  [`${PaymentStatus.PENDING}:${OrderStatus.PENDING}`]: 'Awaiting Payment',
  [`${PaymentStatus.COMPLETED}:${OrderStatus.PENDING}`]:
    'Payment Received — Awaiting Seller Confirmation',
  [`${PaymentStatus.COMPLETED}:${OrderStatus.CONFIRMED}`]: 'Order Confirmed',
  [`${PaymentStatus.COMPLETED}:${OrderStatus.PREPARING}`]: 'Preparing',
  [`${PaymentStatus.COMPLETED}:${OrderStatus.IN_TRANSIT}`]: 'On the Way',
  [`${PaymentStatus.COMPLETED}:${OrderStatus.DELIVERED}`]: 'Delivered',
  [`${PaymentStatus.PENDING}:${OrderStatus.CANCELLED}`]: 'Cancelled',
  [`${PaymentStatus.FAILED}:${OrderStatus.CANCELLED}`]: 'Cancelled',
  // Anomalous — should only ever occur via the race the payment-anomaly guard flags for
  // manual review. Deliberately worded and styled differently from a normal "Cancelled" so
  // it never reads as an ordinary, already-resolved cancellation.
  [`${PaymentStatus.COMPLETED}:${OrderStatus.CANCELLED}`]: 'Payment Issue — Contact Support',
};

export const getOrderDisplayStatus = (
  paymentStatus: PaymentStatus,
  orderStatus: OrderStatus
): string =>
  DISPLAY_STATUS_MAP[`${paymentStatus}:${orderStatus}`] ??
  // Fallback for a combination not in the table above — e.g. paymentStatus not yet caught
  // up with an orderStatus a seller advanced early. Not expected in normal operation, but
  // never silently returns undefined for an unanticipated pairing.
  `${orderStatus} (payment ${paymentStatus})`;

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productName: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderDeliveryAddressSchema = new Schema<IOrderDeliveryAddress>(
  {
    label: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderProofImageSchema = new Schema<IOrderProofImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    checkoutReference: { type: String, required: true, trim: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: 'An order must have at least one item',
      },
    },
    deliveryAddress: { type: orderDeliveryAddressSchema, required: true },
    deliveryMethod: { type: String, enum: Object.values(DeliveryMethod), required: true },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    cancellationReason: { type: String, enum: Object.values(CancellationReason) },
    deliveredAt: { type: Date },
    // Not yet populated by any endpoint in Phase 11 — the field/shape exists so the
    // fulfillment-photo upload endpoint has somewhere to write to when it's built.
    proofOfDeliveryImages: { type: [orderProofImageSchema], default: [] },
  },
  { timestamps: true }
);

orderSchema.index({ buyer: 1 });
orderSchema.index({ 'items.seller': 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ checkoutReference: 1 });

// Computed once here rather than by every endpoint that returns an Order (checkout,
// buyer/seller/admin lists, detail, cancel, confirm-delivery, status-update) — `virtuals:
// true` is what makes it actually appear in the JSON every one of those sends back, since
// res.json() invokes .toJSON() on any Mongoose document it serializes.
orderSchema.virtual('displayStatus').get(function (this: IOrder) {
  return getOrderDisplayStatus(this.paymentStatus, this.orderStatus);
});
orderSchema.set('toJSON', { virtuals: true });

export const OrderModel = model<IOrder>('Order', orderSchema);
