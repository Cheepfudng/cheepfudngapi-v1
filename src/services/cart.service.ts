import { Types } from 'mongoose';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { ICart } from '../models/cart.model';
import { IProduct } from '../models/product.model';
import { IUser } from '../models/user.model';
import { CartRepository } from '../repositories/cart.repository';
import { ProductRepository } from '../repositories/product.repository';

export interface CartItemView {
  product: {
    _id: string;
    name: string;
    price: number;
    unit: string;
    image: string | null;
    seller: { organizationName?: string } | null;
  } | null;
  quantity: number;
  unavailable: boolean;
  lineTotal: number;
}

export interface CartView {
  items: CartItemView[];
  subtotal: number;
  totalItems: number;
}

const EMPTY_CART_VIEW: CartView = { items: [], subtotal: 0, totalItems: 0 };

const CART_PRODUCT_POPULATE = {
  path: 'items.product',
  select: 'name price unit images isActive isApproved seller',
  populate: { path: 'seller', select: 'organizationName' },
};

interface PopulatedCartItem {
  product:
    | (Pick<IProduct, 'name' | 'price' | 'unit' | 'images' | 'isActive' | 'isApproved'> & {
        _id: Types.ObjectId;
        seller?: Pick<IUser, 'organizationName'>;
      })
    | null;
  quantity: number;
}

export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository
  ) {}

  async getCart(userId: string): Promise<CartView> {
    const cart = await this.cartRepository.findByUser(userId);
    if (!cart) return EMPTY_CART_VIEW;

    return this.populateAndBuildView(cart);
  }

  async addItem(userId: string, productId: string, quantity: number): Promise<CartView> {
    if (quantity < 1) {
      throw new AppError('quantity must be at least 1', 400, ErrorCode.VALIDATION_ERROR);
    }

    const product = await this.getPurchasableProduct(productId);
    const cart = await this.cartRepository.findByUser(userId);
    const existing = cart?.items.find((item) => item.product.toString() === productId);

    if (!existing && quantity < product.minimumOrder) {
      throw new AppError(
        `Minimum order for this product is ${product.minimumOrder}`,
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > product.quantityAvailable) {
      throw new AppError(
        `Only ${product.quantityAvailable} ${product.unit}(s) available`,
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const updated = await this.cartRepository.upsertItem(userId, productId, nextQuantity);
    return this.populateAndBuildView(updated);
  }

  // quantity: 0 removes the item, same as removeItem(). Only enforces the quantityAvailable
  // ceiling ("same stock-cap validation as 9.3") — minimumOrder is a first-add floor, not
  // re-enforced here, so a buyer can freely reduce an existing line without hitting it.
  async setItemQuantity(userId: string, productId: string, quantity: number): Promise<CartView> {
    if (quantity < 0) {
      throw new AppError('quantity cannot be negative', 400, ErrorCode.VALIDATION_ERROR);
    }

    return this.applyQuantity(userId, productId, quantity);
  }

  // delta must be exactly 1 or -1 (stepper use case — POST /cart/add is the entry point for
  // adding a new/larger quantity). Uses an atomic $inc rather than setItemQuantity's
  // read-then-$set, specifically so two rapid-fire increments on the same item can never
  // lose an update (MongoDB serializes concurrent $inc's on one document; a naive
  // read-current-then-write would let both requests read the same starting value and
  // collapse two +1's into one). The stock ceiling still depends on the live Product
  // document in a different collection, so it can't be checked as part of that same atomic
  // op — instead the increment is applied optimistically and rolled back with a
  // compensating -delta $inc if it turns out to be invalid.
  async adjustQuantity(userId: string, productId: string, delta: 1 | -1): Promise<CartView> {
    if (delta !== 1 && delta !== -1) {
      throw new AppError('delta must be exactly 1 or -1', 400, ErrorCode.VALIDATION_ERROR);
    }

    const incremented = await this.cartRepository.incrementItemQuantity(userId, productId, delta);
    if (!incremented) {
      throw new AppError('Product not in cart', 404, ErrorCode.NOT_FOUND);
    }

    const newQuantity =
      incremented.items.find((item) => item.product.toString() === productId)?.quantity ?? 0;

    // Same "newQuantity <= 0 -> removal" treatment as applyQuantity/setItemQuantity.
    if (newQuantity <= 0) {
      const updated = await this.cartRepository.removeItem(userId, productId);
      return this.populateAndBuildView(updated ?? incremented);
    }

    try {
      const product = await this.getPurchasableProduct(productId);
      if (newQuantity > product.quantityAvailable) {
        throw new AppError(
          `Only ${product.quantityAvailable} ${product.unit}(s) available`,
          400,
          ErrorCode.VALIDATION_ERROR
        );
      }
    } catch (error) {
      // The $inc already landed — undo it since the resulting quantity turned out invalid.
      await this.cartRepository.incrementItemQuantity(userId, productId, -delta);
      throw error;
    }

    return this.populateAndBuildView(incremented);
  }

  // Shared by setItemQuantity (PUT /cart/update) and adjustQuantity (PATCH /cart/increment,
  // via the atomic-increment path above): same ceiling check, same <= 0 -> removal rule.
  private async applyQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<CartView> {
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    const product = await this.getPurchasableProduct(productId);
    if (quantity > product.quantityAvailable) {
      throw new AppError(
        `Only ${product.quantityAvailable} ${product.unit}(s) available`,
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const updated = await this.cartRepository.updateItemQuantity(userId, productId, quantity);
    if (!updated) throw new AppError('Product not in cart', 404, ErrorCode.NOT_FOUND);

    return this.populateAndBuildView(updated);
  }

  async removeItem(userId: string, productId: string): Promise<CartView> {
    const updated = await this.cartRepository.removeItem(userId, productId);
    if (!updated) throw new AppError('Product not in cart', 404, ErrorCode.NOT_FOUND);

    return this.populateAndBuildView(updated);
  }

  async clearCart(userId: string): Promise<CartView> {
    await this.cartRepository.deleteByUser(userId);
    return EMPTY_CART_VIEW;
  }

  private async getPurchasableProduct(productId: string): Promise<IProduct> {
    const product = await this.productRepository.findById(productId);
    if (!product || !product.isActive || !product.isApproved) {
      throw new AppError('Product not found', 404, ErrorCode.PRODUCT_NOT_FOUND);
    }
    return product;
  }

  private async populateAndBuildView(cart: ICart): Promise<CartView> {
    await cart.populate(CART_PRODUCT_POPULATE);
    return this.buildCartView(cart);
  }

  private buildCartView(cart: ICart): CartView {
    const plainItems = cart.toObject().items as unknown as PopulatedCartItem[];

    let subtotal = 0;
    let totalItems = 0;

    const items = plainItems.map((item): CartItemView => {
      const { product, quantity } = item;
      const available = !!product && product.isActive && product.isApproved;

      if (available && product) {
        subtotal += product.price * quantity;
        totalItems += quantity;
      }

      return {
        product: product
          ? {
              _id: product._id.toString(),
              name: product.name,
              price: product.price,
              unit: product.unit,
              image: product.images?.[0]?.url ?? null,
              seller: product.seller ?? null,
            }
          : null,
        quantity,
        unavailable: !available,
        lineTotal: available && product ? product.price * quantity : 0,
      };
    });

    return { items, subtotal, totalItems };
  }
}
