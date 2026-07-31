import { Response } from 'express';

import { documentService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { AuthRequest } from '../types/auth.types';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';

export class OrganizationController {
  uploadDocuments = async (req: AuthRequest, res: Response): Promise<Response> => {
    const raw = req.body.documentTypes;
    const documentTypes = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const files = req.files as Express.Multer.File[];
    const documents = await documentService.uploadVerificationDocuments(
      req.user!.id,
      documentTypes,
      files
    );

    return sendSuccess(
      res,
      201,
      'Documents uploaded successfully, submitted for review',
      documents
    );
  };

  documentCatalog = async (req: AuthRequest, res: Response): Promise<Response> => {
    const catalog = await documentService.getRequiredDocuments(req.user!.id);
    return sendSuccess(res, 200, 'Required documents retrieved', catalog);
  };

  verificationStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
    const result = await documentService.getVerificationStatus(req.user!.id);
    return sendSuccess(res, 200, 'Verification status retrieved', result);
  };
}

export const organizationController = new OrganizationController();
