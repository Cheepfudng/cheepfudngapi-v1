import { Document, Schema, model, Types } from 'mongoose';

export interface IVerificationDocument extends Document {
  user: Types.ObjectId;
  documentType: string;
  fileUrl: string;
  publicId: string;
  createdAt: Date;
}

const verificationDocumentSchema = new Schema<IVerificationDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentType: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { timestamps: true }
);

export const VerificationDocumentModel = model<IVerificationDocument>(
  'VerificationDocument',
  verificationDocumentSchema
);
