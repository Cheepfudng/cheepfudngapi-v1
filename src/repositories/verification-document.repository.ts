import { Types } from 'mongoose';
import {
  IVerificationDocument,
  VerificationDocumentModel,
} from '../models/verification-document.model';

export interface CreateVerificationDocumentInput {
  user: Types.ObjectId;
  documentType: string;
  fileUrl: string;
  publicId: string;
}

export class VerificationDocumentRepository {
  async createMany(docs: CreateVerificationDocumentInput[]): Promise<IVerificationDocument[]> {
    const created = await VerificationDocumentModel.insertMany(docs);
    return created as unknown as IVerificationDocument[];
  }

  async findByUser(userId: string): Promise<IVerificationDocument[]> {
    return VerificationDocumentModel.find({ user: userId }).sort({ createdAt: -1 });
  }
}
