import { Response } from 'express';

import { productService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { AuthRequest } from '../types/auth.types';

export class ProductController {
  list = async (req: AuthRequest, res: Response): Promise<Response> => {
    const result = await productService.listProducts(req.query);
    return sendSuccess(res, 200, 'Products retrieved', result);
  };

  listMine = async (req: AuthRequest, res: Response): Promise<Response> => {
    const result = await productService.listMyProducts(req.user!.id, req.query);
    return sendSuccess(res, 200, 'Your products retrieved', result);
  };

  getById = async (req: AuthRequest, res: Response): Promise<Response> => {
    const product = await productService.getProductById(req.params.id);
    return sendSuccess(res, 200, 'Product retrieved', product);
  };

  // Unlike getById above (public, approved+active only), this returns the caller's own
  // product regardless of moderationStatus/isActive -- the same "no restriction, it's
  // theirs" rule listMine already applies to the list version.
  getMine = async (req: AuthRequest, res: Response): Promise<Response> => {
    const product = await productService.getMyProductById(req.params.id, req.user!.id);
    return sendSuccess(res, 200, 'Product retrieved', product);
  };

  create = async (req: AuthRequest, res: Response): Promise<Response> => {
    const {
      name,
      category,
      description,
      price,
      unit,
      quantityAvailable,
      minimumOrder,
      state,
      lga,
    } = req.body;

    const files = (req.files as Express.Multer.File[]) ?? [];

    const product = await productService.createProduct(
      req.user!.id,
      {
        name,
        category,
        description,
        price: Number(price),
        unit,
        quantityAvailable: Number(quantityAvailable),
        minimumOrder: Number(minimumOrder),
        location: { state, lga },
      },
      files
    );

    return sendSuccess(res, 201, 'Product created successfully', product);
  };

  update = async (req: AuthRequest, res: Response): Promise<Response> => {
    const {
      name,
      category,
      description,
      price,
      unit,
      quantityAvailable,
      minimumOrder,
      location,
      isActive,
    } = req.body;
    const files = (req.files as Express.Multer.File[]) ?? [];

    const product = await productService.updateProduct(
      req.params.id,
      req.user!.id,
      {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(unit !== undefined && { unit }),
        ...(quantityAvailable !== undefined && { quantityAvailable: Number(quantityAvailable) }),
        ...(minimumOrder !== undefined && { minimumOrder: Number(minimumOrder) }),
        ...(location !== undefined && { location }),
        ...(isActive !== undefined && { isActive }),
      },
      files
    );

    return sendSuccess(res, 200, 'Product updated successfully', product);
  };

  remove = async (req: AuthRequest, res: Response): Promise<Response> => {
    await productService.deleteProduct(req.params.id, req.user!.id);
    return sendSuccess(res, 200, 'Product deleted successfully', null);
  };
}

export const productController = new ProductController();
