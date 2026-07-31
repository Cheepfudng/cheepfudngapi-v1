import { Response } from 'express';

import { adminService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { AuthRequest } from '../types/auth.types';
import { VerificationStatus } from '../types/enums';

export class AdminController {
  listOrganizations = async (req: AuthRequest, res: Response): Promise<Response> => {
    const status = req.query.status as VerificationStatus | undefined;
    const organizations = await adminService.listOrganizations(status);
    return sendSuccess(res, 200, 'Organizations retrieved', organizations);
  };

  getOrganization = async (req: AuthRequest, res: Response): Promise<Response> => {
    const result = await adminService.getOrganizationDetail(req.params.id);
    return sendSuccess(res, 200, 'Organization detail retrieved', result);
  };

  reviewOrganization = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { decision, rejectionReason } = req.body;
    const organization = await adminService.reviewOrganization(
      req.params.id,
      decision,
      rejectionReason
    );
    return sendSuccess(res, 200, `Organization ${decision}`, organization);
  };
}

export const adminController = new AdminController();
