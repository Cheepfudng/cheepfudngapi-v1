import { Response } from 'express';

import { adminService, orderService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/auth.types';
import {
  CampaignStatus,
  OrderStatus,
  PaymentStatus,
  ProductModerationStatus,
  UserRole,
  VerificationStatus,
} from '../types/enums';

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === 'true' || value === true;
};

export class AdminController {
  listOrganizations = async (req: AuthRequest, res: Response): Promise<Response> => {
    const status = req.query.status as VerificationStatus | undefined;
    const { page, limit } = parsePagination(req.query);
    const { items, total } = await adminService.listOrganizations(status, { page, limit });
    return sendSuccess(res, 200, 'Organizations retrieved', {
      data: items,
      meta: buildPaginationMeta(page, limit, total),
    });
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
    const { page, limit } = parsePagination(req.query);
    const { items, total } = await adminService.listCampaigns(status, { page, limit });
    return sendSuccess(res, 200, 'Campaigns retrieved', {
      campaigns: items,
      meta: buildPaginationMeta(page, limit, total),
    });
  };

  reviewCampaign = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { decision, rejectionReason } = req.body;
    const campaign = await adminService.reviewCampaign(req.params.id, decision, rejectionReason);
    return sendSuccess(res, 200, `Campaign ${decision}`, campaign);
  };

  // Calls OrderService directly (not AdminService) — this is the exact same method the
  // order-expiry cron job calls, reused verbatim for ops/testing rather than duplicating
  // the expiry logic behind an admin-specific wrapper.
  expireStaleOrders = async (_req: AuthRequest, res: Response): Promise<Response> => {
    const expiredCount = await orderService.expireStaleOrders();
    return sendSuccess(res, 200, 'Stale orders expired', { expiredCount });
  };

  listUsers = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { page, limit } = parsePagination(req.query);
    const filter = {
      role: req.query.role as UserRole | undefined,
      isActive: parseOptionalBoolean(req.query.isActive),
    };
    const search = (req.query.search as string | undefined) ?? '';

    const { items, total } = await adminService.listUsers(filter, search, { page, limit });
    return sendSuccess(res, 200, 'Users retrieved', {
      users: items,
      meta: buildPaginationMeta(page, limit, total),
    });
  };

  updateUserStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
    const user = await adminService.updateUserStatus(req.params.id, req.body.isActive);
    return sendSuccess(res, 200, 'User status updated', user);
  };

  listOrders = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { page, limit } = parsePagination(req.query);
    const filter = {
      orderStatus: req.query.orderStatus as OrderStatus | undefined,
      paymentStatus: req.query.paymentStatus as PaymentStatus | undefined,
    };

    const { items, total } = await adminService.listOrders(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
    });
    return sendSuccess(res, 200, 'Orders retrieved', {
      orders: items,
      meta: buildPaginationMeta(page, limit, total),
    });
  };

  listProducts = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { page, limit } = parsePagination(req.query);
    const filter = {
      isActive: parseOptionalBoolean(req.query.isActive),
      moderationStatus: req.query.moderationStatus as ProductModerationStatus | undefined,
      category: req.query.category as string | undefined,
      sellerId: req.query.sellerId as string | undefined,
    };

    const { items, total } = await adminService.listProducts(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
    });
    return sendSuccess(res, 200, 'Products retrieved', {
      products: items,
      meta: buildPaginationMeta(page, limit, total),
    });
  };

  moderateProduct = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { decision, rejectionReason } = req.body;
    const product = await adminService.moderateProduct(req.params.id, decision, rejectionReason);
    return sendSuccess(res, 200, `Product ${decision}`, product);
  };

  dashboard = async (_req: AuthRequest, res: Response): Promise<Response> => {
    const stats = await adminService.getDashboard();
    return sendSuccess(res, 200, 'Dashboard stats retrieved', stats);
  };
}

export const adminController = new AdminController();
