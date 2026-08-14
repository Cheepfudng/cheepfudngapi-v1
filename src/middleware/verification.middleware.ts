import { Response, NextFunction } from 'express';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { OrganizationType, UserRole, VerificationStatus } from '../types/enums';
import { AuthRequest } from '../types/auth.types';

const SUPPLY_ORGANIZATION_TYPES: OrganizationType[] = [
  OrganizationType.FARMER,
  OrganizationType.VENDOR,
];

const CAMPAIGN_ORGANIZATION_TYPES: OrganizationType[] = [
  OrganizationType.NGO,
  OrganizationType.FOUNDATION,
  OrganizationType.RELIGIOUS_BODY,
  OrganizationType.AGENCY,
];

export const requireVerifiedOrganization = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, ErrorCode.UNAUTHORIZED);
  }

  if (req.user.role !== UserRole.ORGANIZATION) {
    return next();
  }

  if (req.user.verificationStatus !== VerificationStatus.VERIFIED) {
    throw new AppError(
      'Your organization is pending verification. Please complete document submission and wait for admin approval.',
      403,
      ErrorCode.ORGANIZATION_NOT_VERIFIED
    );
  }

  next();
};

// Gates routes to farmer/vendor organizations only (supply-side). Must run after
// protect + requireVerifiedOrganization, since it assumes the org is already verified.
export const requireSupplyOrganization = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, ErrorCode.UNAUTHORIZED);
  }

  if (
    req.user.role !== UserRole.ORGANIZATION ||
    !req.user.organizationType ||
    !SUPPLY_ORGANIZATION_TYPES.includes(req.user.organizationType)
  ) {
    throw new AppError(
      'Only farmer or vendor organizations can perform this action',
      403,
      ErrorCode.SUPPLY_ORGANIZATION_REQUIRED
    );
  }

  next();
};

// Gates routes to campaign-side organizations only (ngo/foundation/religious_body/agency).
// Mirrors requireSupplyOrganization exactly — must run after protect + requireVerifiedOrganization.
export const requireCampaignOrganization = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, ErrorCode.UNAUTHORIZED);
  }

  if (
    req.user.role !== UserRole.ORGANIZATION ||
    !req.user.organizationType ||
    !CAMPAIGN_ORGANIZATION_TYPES.includes(req.user.organizationType)
  ) {
    throw new AppError(
      'Only NGO, foundation, religious body, or agency organizations can perform this action',
      403,
      ErrorCode.CAMPAIGN_ORGANIZATION_REQUIRED
    );
  }

  next();
};
