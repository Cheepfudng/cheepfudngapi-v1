import { Request } from 'express';
import { UserRole, VerificationStatus } from './enums';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  token?: string;
}
