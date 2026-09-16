export interface UploadedFile {
  url: string;
  publicId: string;
}

export interface DocumentStorage {
  upload(
    fileBuffer: Buffer,
    options: { folder: string; resourceType: 'image' | 'raw' | 'auto' }
  ): Promise<UploadedFile>;
  // Best-effort cleanup of an asset that's no longer referenced (e.g. an old product image
  // replaced by a new one on update) — callers should treat a rejected promise as
  // non-fatal, same as any other cleanup-after-the-fact operation.
  delete(publicId: string, resourceType: 'image' | 'raw' | 'auto'): Promise<void>;
}
