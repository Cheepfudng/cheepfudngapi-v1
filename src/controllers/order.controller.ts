import { Response } from 'express';

import { orderService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/auth.types';
import { OrderStatus } from '../types/enums';

const ORDER_SORT = { createdAt: -1 as const };

export class OrderController {
  checkout = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { addressId, deliveryMethod } = req.body;
    const result = await orderService.checkout(req.user!.id, { addressId, deliveryMethod });
    return sendSuccess(
      res,
      201,
      'Checkout started — complete payment to confirm your order',
      result
    );
  };

  listMine = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { page, limit } = parsePagination(req.query);
    const orderStatus = req.query.orderStatus as OrderStatus | undefined;

    const { items, total } = await orderService.listForBuyer(req.user!.id, orderStatus, {
      page,
      limit,
      sort: ORDER_SORT,
    });

    return sendSuccess(res, 200, 'Orders retrieved', {
      orders: items,
      meta: buildPaginationMeta(page, limit, total),
    });
  };

  getByCheckoutReference = async (req: AuthRequest, res: Response): Promise<Response> => {
    const orders = await orderService.getByCheckoutReference(req.params.checkoutReference, {
      id: req.user!.id,
      role: req.user!.role,
    });
    return sendSuccess(res, 200, 'Checkout event orders retrieved', orders);
  };

  getDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
    const order = await orderService.getOrderDetail(req.params.orderNumber, {
      id: req.user!.id,
      role: req.user!.role,
    });
    return sendSuccess(res, 200, 'Order retrieved', order);
  };

  cancel = async (req: AuthRequest, res: Response): Promise<Response> => {
    const order = await orderService.cancel(req.params.orderNumber, req.user!.id);
    return sendSuccess(res, 200, 'Order cancelled', order);
  };

  confirmDelivery = async (req: AuthRequest, res: Response): Promise<Response> => {
    const order = await orderService.confirmDelivery(req.params.orderNumber, req.user!.id);
    return sendSuccess(res, 200, 'Delivery confirmed', order);
  };

  listIncoming = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { page, limit } = parsePagination(req.query);
    const orderStatus = req.query.orderStatus as OrderStatus | undefined;

    const { items, total } = await orderService.listIncomingForSeller(req.user!.id, orderStatus, {
      page,
      limit,
      sort: ORDER_SORT,
    });

    return sendSuccess(res, 200, 'Incoming orders retrieved', {
      orders: items,
      meta: buildPaginationMeta(page, limit, total),
    });
  };

  updateStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
    const order = await orderService.updateStatusAsSeller(
      req.params.orderNumber,
      req.user!.id,
      req.body.status
    );
    return sendSuccess(res, 200, 'Order status updated', order);
  };
}

export const orderController = new OrderController();
