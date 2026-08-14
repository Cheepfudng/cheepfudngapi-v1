import { Request } from 'express';
import { OrganizationType, UserRole, VerificationStatus } from './enums';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  organizationType?: OrganizationType;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  token?: string;
}
