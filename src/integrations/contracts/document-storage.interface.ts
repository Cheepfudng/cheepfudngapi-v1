export interface UploadedFile {
  url: string;
  publicId: string;
}

export interface DocumentStorage {
  upload(
    fileBuffer: Buffer,
    options: { folder: string; resourceType: 'image' | 'raw' | 'auto' }
  ): Promise<UploadedFile>;
}
