import { Response } from 'express';

import { donationService, userService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/auth.types';
import { PaymentStatus } from '../types/enums';

export class UserController {
  listAddresses = async (req: AuthRequest, res: Response): Promise<Response> => {
    const addresses = await userService.listAddresses(req.user!.id);
    return sendSuccess(res, 200, 'Delivery addresses retrieved', addresses);
  };

  addAddress = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { label, street, city, state, phone } = req.body;
    const addresses = await userService.addAddress(req.user!.id, {
      label,
      street,
      city,
      state,
      phone,
    });
    return sendSuccess(res, 201, 'Delivery address added', addresses);
  };

  updateAddress = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { label, street, city, state, phone } = req.body;
    const addresses = await userService.updateAddress(req.user!.id, req.params.addressId, {
      ...(label !== undefined && { label }),
      ...(street !== undefined && { street }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(phone !== undefined && { phone }),
    });
    return sendSuccess(res, 200, 'Delivery address updated', addresses);
  };

  removeAddress = async (req: AuthRequest, res: Response): Promise<Response> => {
    const addresses = await userService.removeAddress(req.user!.id, req.params.addressId);
    return sendSuccess(res, 200, 'Delivery address removed', addresses);
  };

  setDefaultAddress = async (req: AuthRequest, res: Response): Promise<Response> => {
    const addresses = await userService.setDefaultAddress(req.user!.id, req.params.addressId);
    return sendSuccess(res, 200, 'Default delivery address updated', addresses);
  };

  listDonations = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { page, limit } = parsePagination(req.query);
    const status = req.query.status as PaymentStatus | undefined;

    const { items, total } = await donationService.getDonationHistory(req.user!.id, status, {
      page,
      limit,
    });

    return sendSuccess(res, 200, 'Donation history retrieved', {
      donations: items,
      meta: buildPaginationMeta(page, limit, total),
    });
  };
}

export const userController = new UserController();
