import { Response } from 'express';

import { campaignService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/auth.types';

export class CampaignController {
  list = async (req: AuthRequest, res: Response): Promise<Response> => {
    const result = await campaignService.browse(req.query);
    return sendSuccess(res, 200, 'Campaigns retrieved', result);
  };

  getById = async (req: AuthRequest, res: Response): Promise<Response> => {
    const requester = req.user ? { id: req.user.id, role: req.user.role } : undefined;
    const campaign = await campaignService.getById(req.params.id, requester);
    return sendSuccess(res, 200, 'Campaign retrieved', campaign);
  };

  create = async (req: AuthRequest, res: Response): Promise<Response> => {
    const {
      title,
      description,
      urgencyLevel,
      fundingGoal,
      foodGoalDescription,
      foodGoalQuantity,
      foodGoalUnit,
      distributionPlan,
      state,
      lga,
      startDate,
      endDate,
    } = req.body;

    const files = (req.files as Express.Multer.File[]) ?? [];

    const campaign = await campaignService.create(
      req.user!.id,
      {
        title,
        description,
        urgencyLevel,
        fundingGoal: Number(fundingGoal),
        foodGoal: {
          description: foodGoalDescription,
          quantity: Number(foodGoalQuantity),
          unit: foodGoalUnit,
        },
        distributionPlan,
        location: { state, lga },
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      files
    );

    return sendSuccess(res, 201, 'Campaign created — pending admin approval', campaign);
  };

  update = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { description, distributionPlan, urgencyLevel, fundingGoal } = req.body;

    const campaign = await campaignService.update(req.params.id, req.user!.id, {
      ...(description !== undefined && { description }),
      ...(distributionPlan !== undefined && { distributionPlan }),
      ...(urgencyLevel !== undefined && { urgencyLevel }),
      ...(fundingGoal !== undefined && { fundingGoal: Number(fundingGoal) }),
    });

    return sendSuccess(res, 200, 'Campaign updated successfully', campaign);
  };

  postUpdate = async (req: AuthRequest, res: Response): Promise<Response> => {
    const campaign = await campaignService.postUpdate(req.params.id, req.user!.id, req.body.message);
    return sendSuccess(res, 201, 'Campaign update posted', campaign);
  };

  addDistributionRecord = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { date, quantity, beneficiaries, location } = req.body;
    const files = (req.files as Express.Multer.File[]) ?? [];

    const campaign = await campaignService.addDistributionRecord(
      req.params.id,
      req.user!.id,
      {
        date: new Date(date),
        quantity: Number(quantity),
        beneficiaries: Number(beneficiaries),
        location,
      },
      files
    );

    return sendSuccess(res, 201, 'Distribution record added', campaign);
  };

  getFundSummary = async (req: AuthRequest, res: Response): Promise<Response> => {
    const summary = await campaignService.getFundSummary(req.params.id, req.user!.id);
    return sendSuccess(res, 200, 'Fund summary retrieved', summary);
  };

  getDonations = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { page, limit } = parsePagination(req.query);
    const { items, total } = await campaignService.getDonations(req.params.id, req.user!.id, {
      page,
      limit,
    });
    return sendSuccess(res, 200, 'Donations retrieved', {
      donations: items,
      meta: buildPaginationMeta(page, limit, total),
    });
  };

  donate = async (req: AuthRequest, res: Response): Promise<Response> => {
    const result = await campaignService.donate(
      req.user!.id,
      req.params.id,
      Number(req.body.amount)
    );
    return sendSuccess(res, 201, 'Donation started — complete payment to confirm', result);
  };
}

export const campaignController = new CampaignController();
