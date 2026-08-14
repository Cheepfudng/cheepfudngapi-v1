import { Document, Schema, model, Types } from 'mongoose';

export const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
}

export interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// No display-field snapshot on the item (name/price/image): GET /cart always populates the
// live product anyway to compute subtotal and flag unavailable items, so a snapshot would only
// add write-time complexity and a staleness risk with nothing reading it.
const cartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
    // Absolute-expiry TTL: MongoDB removes the document once this date is in the past
    // (expireAfterSeconds: 0 on the index below). Reset to now + CART_TTL_MS on every
    // mutation (add/update/remove/clear) — not refreshed on reads.
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + CART_TTL_MS) },
  },
  { timestamps: true }
);

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CartModel = model<ICart>('Cart', cartSchema);
