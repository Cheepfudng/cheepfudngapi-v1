import { Response } from 'express';

import { userService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { AuthRequest } from '../types/auth.types';

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
}

export const userController = new UserController();
