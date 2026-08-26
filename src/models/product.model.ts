import { Document, Schema, model, Types } from 'mongoose';

import { ProductModerationStatus } from '../types/enums';

export interface IProductImage {
  url: string;
  publicId: string;
}

export interface IProductLocation {
  state: string;
  lga: string;
}

export interface IProduct extends Document {
  seller: Types.ObjectId;
  name: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  quantityAvailable: number;
  minimumOrder: number;
  images: IProductImage[];
  location: IProductLocation;
  isActive: boolean;
  // Single source of truth for review state (Phase 19) — new products default to
  // pending, not auto-approved. No separate isApproved boolean kept alongside this.
  moderationStatus: ProductModerationStatus;
  // Set only when moderationStatus is rejected — same pattern as Organizations/Campaigns.
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const productLocationSchema = new Schema<IProductLocation>(
  {
    state: { type: String, required: true, trim: true },
    lga: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0.01 },
    unit: { type: String, required: true, trim: true },
    quantityAvailable: { type: Number, required: true, min: 0 },
    minimumOrder: { type: Number, required: true, min: 1 },
    images: { type: [productImageSchema], default: [] },
    location: { type: productLocationSchema, required: true },
    isActive: { type: Boolean, default: true },
    moderationStatus: {
      type: String,
      enum: Object.values(ProductModerationStatus),
      default: ProductModerationStatus.PENDING,
    },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

productSchema.index({ isActive: 1, moderationStatus: 1 });

export const ProductModel = model<IProduct>('Product', productSchema);
