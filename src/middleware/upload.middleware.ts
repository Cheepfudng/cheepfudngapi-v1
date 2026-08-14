import multer from 'multer';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export const uploadDocuments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new AppError('Only PDF, JPG, and PNG files are allowed', 400, ErrorCode.VALIDATION_ERROR)
      );
    }
    cb(null, true);
  },
}).array('documents', 5);

export const uploadProductImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new AppError('Only JPG and PNG images are allowed', 400, ErrorCode.VALIDATION_ERROR)
      );
    }
    cb(null, true);
  },
}).array('images', 5);

export const uploadCampaignImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new AppError('Only JPG and PNG images are allowed', 400, ErrorCode.VALIDATION_ERROR)
      );
    }
    cb(null, true);
  },
}).array('images', 5);

export const uploadDistributionMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new AppError('Only JPG and PNG images are allowed', 400, ErrorCode.VALIDATION_ERROR)
      );
    }
    cb(null, true);
  },
}).array('media', 5);
