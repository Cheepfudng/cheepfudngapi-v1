import { Response } from 'express';

import { adminService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { AuthRequest } from '../types/auth.types';
import { CampaignStatus, VerificationStatus } from '../types/enums';

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

  listCampaigns = async (req: AuthRequest, res: Response): Promise<Response> => {
    const status = req.query.status as CampaignStatus | undefined;
    const campaigns = await adminService.listCampaigns(status);
    return sendSuccess(res, 200, 'Campaigns retrieved', campaigns);
  };

  reviewCampaign = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { decision, rejectionReason } = req.body;
    const campaign = await adminService.reviewCampaign(req.params.id, decision, rejectionReason);
    return sendSuccess(res, 200, `Campaign ${decision}`, campaign);
  };
}

export const adminController = new AdminController();
