import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { UserRepository } from '../repositories/user.repository';
import { VerificationDocumentRepository } from '../repositories/verification-document.repository';
import { DocumentStorage } from '../integrations/contracts/document-storage.interface';
import { UserRole, VerificationStatus } from '../types/enums';
import {
  getAllDocumentTypes,
  getMandatoryDocumentTypes,
  getOrgDocumentCategory,
} from '../config/document-catalog';

export class DocumentService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly documentRepository: VerificationDocumentRepository,
    private readonly documentStorage: DocumentStorage
  ) {}

  async uploadVerificationDocuments(
    userId: string,
    documentTypes: string[],
    files: Express.Multer.File[]
  ) {
    if (!files || files.length === 0) {
      throw new AppError('At least one document is required', 400, ErrorCode.VALIDATION_ERROR);
    }

    if (documentTypes.length !== files.length) {
      throw new AppError(
        'Each uploaded file must have a matching documentType, in the same order',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);

    if (user.role !== UserRole.ORGANIZATION) {
      throw new AppError(
        'Only organization accounts can upload verification documents',
        403,
        ErrorCode.FORBIDDEN
      );
    }

    if (user.verificationStatus === VerificationStatus.VERIFIED) {
      throw new AppError('Organization is already verified', 409, ErrorCode.CONFLICT);
    }

    if (!user.organizationType) {
      throw new AppError(
        'Organization type is not set — complete onboarding first',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const category = getOrgDocumentCategory(user.organizationType);
    const validTypes = getAllDocumentTypes(category);

    const invalidTypes = documentTypes.filter((t) => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      throw new AppError(
        `Invalid document type(s): ${invalidTypes.join(', ')}`,
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const missingMandatory = getMandatoryDocumentTypes(category).filter(
      (t) => !documentTypes.includes(t)
    );
    if (missingMandatory.length > 0) {
      throw new AppError(
        `Missing required document(s): ${missingMandatory.join(', ')}`,
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const uploaded = await Promise.all(
      files.map(async (file, i) => {
        const result = await this.documentStorage.upload(file.buffer, {
          folder: 'cheepfud/verification-documents',
          resourceType: file.mimetype === 'application/pdf' ? 'raw' : 'image',
        });
        return { ...result, documentType: documentTypes[i] };
      })
    );

    await this.documentRepository.createMany(
      uploaded.map((u) => ({
        user: user._id,
        documentType: u.documentType,
        fileUrl: u.url,
        publicId: u.publicId,
      }))
    );

    await this.userRepository.updateById(userId, {
      verificationStatus: VerificationStatus.UNDER_REVIEW,
    });

    return this.documentRepository.findByUser(userId);
  }

  async getVerificationStatus(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);

    const documents = await this.documentRepository.findByUser(userId);
    return { verificationStatus: user.verificationStatus, documents };
  }

  // Lets the frontend know exactly what to ask for, before the user starts uploading
  async getRequiredDocuments(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);
    if (!user.organizationType) {
      throw new AppError(
        'Organization type is not set — complete onboarding first',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const category = getOrgDocumentCategory(user.organizationType);
    const { DOCUMENT_CATALOG } = await import('../config/document-catalog');
    return DOCUMENT_CATALOG[category];
  }
}
