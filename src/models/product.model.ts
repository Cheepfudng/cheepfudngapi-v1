import { Document, Schema, model, Types } from 'mongoose';

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
  // TODO: require admin approval in v1.1 — MVP auto-approves every product on creation
  isApproved: boolean;
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
    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ isActive: 1, isApproved: 1 });

export const ProductModel = model<IProduct>('Product', productSchema);
