import { Response } from 'express';

import { cartService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { AuthRequest } from '../types/auth.types';

export class CartController {
  addItem = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { productId, quantity } = req.body;
    const cart = await cartService.addItem(req.user!.id, productId, Number(quantity));
    return sendSuccess(res, 200, 'Item added to cart', cart);
  };

  getCart = async (req: AuthRequest, res: Response): Promise<Response> => {
    const cart = await cartService.getCart(req.user!.id);
    return sendSuccess(res, 200, 'Cart retrieved', cart);
  };

  updateItem = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { productId, quantity } = req.body;
    const cart = await cartService.setItemQuantity(req.user!.id, productId, Number(quantity));
    return sendSuccess(res, 200, 'Cart updated', cart);
  };

  adjustQuantity = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { productId, delta } = req.body;
    const cart = await cartService.adjustQuantity(req.user!.id, productId, delta);
    return sendSuccess(res, 200, 'Cart updated', cart);
  };

  removeItem = async (req: AuthRequest, res: Response): Promise<Response> => {
    const cart = await cartService.removeItem(req.user!.id, req.params.productId);
    return sendSuccess(res, 200, 'Item removed from cart', cart);
  };

  clearCart = async (req: AuthRequest, res: Response): Promise<Response> => {
    const cart = await cartService.clearCart(req.user!.id);
    return sendSuccess(res, 200, 'Cart cleared', cart);
  };
}

export const cartController = new CartController();
