import { cloudinary } from '../../config/cloudinary';
import { DocumentStorage, UploadedFile } from '../contracts/document-storage.interface';

export class CloudinaryDocumentStorage implements DocumentStorage {
  upload(
    fileBuffer: Buffer,
    options: { folder: string; resourceType: 'image' | 'raw' | 'auto' }
  ): Promise<UploadedFile> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: options.folder, resource_type: options.resourceType },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(fileBuffer);
    });
  }
}
