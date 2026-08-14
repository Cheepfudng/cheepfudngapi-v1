import mongoose, { Types } from 'mongoose';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { RedisLock } from '../integrations/redis/redis.lock';
import { IOrder } from '../models/order.model';
import { IProduct } from '../models/product.model';
import { CartRepository } from '../repositories/cart.repository';
import { OrderPagination, OrderRepository } from '../repositories/order.repository';
import { ProductRepository } from '../repositories/product.repository';
import { UserRepository } from '../repositories/user.repository';
import { PaymentService } from './payment.service';
import { DeliveryMethod, OrderStatus, PaymentStatus, UserRole } from '../types/enums';
import { DELIVERY_FEE_NGN } from '../utils/constants';
import { logger } from '../utils/logger';
import { generateCheckoutReference, generateOrderNumber } from '../utils/reference-generator';

const CHECKOUT_LOCK_TTL_SECONDS = 60;

export interface CheckoutInput {
  addressId: string;
  deliveryMethod: DeliveryMethod;
}

export interface CheckoutResult {
  orders: IOrder[];
  paymentUrl: string;
  checkoutReference: string;
}

// Forward-only seller fulfillment sequence. `cancelled` is intentionally excluded — it's
// reached only via the buyer's cancel() and is always terminal, never re-entered here.
const FORWARD_SEQUENCE: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.IN_TRANSIT,
  OrderStatus.DELIVERED,
];

interface DecrementedItem {
  productId: string;
  quantity: number;
}

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly paymentService: PaymentService,
    private readonly checkoutLock: RedisLock
  ) {}

  async checkout(buyerId: string, input: CheckoutInput): Promise<CheckoutResult> {
    // One checkout in flight per buyer at a time — a rapid double-submit (slow network
    // retry, accidental double-tap) must never be able to create two order sets against
    // the same cart. Rejected immediately, never queued.
    const lockKey = `checkout:lock:${buyerId}`;
    const lockToken = await this.checkoutLock.acquire(lockKey, CHECKOUT_LOCK_TTL_SECONDS);
    if (!lockToken) {
      throw new AppError('A checkout is already in progress', 409, ErrorCode.CONFLICT);
    }

    try {
      const buyer = await this.userRepository.findById(buyerId);
      if (!buyer) throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);

      const address = buyer.deliveryAddresses.id(input.addressId);
      if (!address) throw new AppError('Address not found', 404, ErrorCode.NOT_FOUND);

      const deliveryFee = input.deliveryMethod === DeliveryMethod.DELIVERY ? DELIVERY_FEE_NGN : 0;
      const addressSnapshot = {
        label: address.label,
        street: address.street,
        city: address.city,
        state: address.state,
        phone: address.phone,
      };

      // Stage A (transactional): cart validation, per-item atomic stock decrement, and
      // per-seller Order creation all commit or roll back together via a real Mongo
      // transaction — no manual compensating rollback needed for this DB-only portion.
      let checkoutReference = '';
      const createdOrders: IOrder[] = [];
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          checkoutReference = '';
          createdOrders.length = 0;

          const cart = await this.cartRepository.findByUser(buyerId, session);
          if (!cart || cart.items.length === 0) {
            throw new AppError('Your cart is empty', 400, ErrorCode.VALIDATION_ERROR);
          }

          // Resolve every cart line to its live product. Cart quantities/prices are never
          // trusted directly — everything charged is recomputed from the live Product record.
          const resolvedItems: { product: IProduct; quantity: number }[] = [];
          for (const item of cart.items) {
            const product = await this.productRepository.findById(item.product.toString(), session);
            if (!product || !product.isActive || !product.isApproved) {
              throw new AppError(
                'One or more items in your cart are no longer available — please review your cart',
                400,
                ErrorCode.VALIDATION_ERROR
              );
            }
            resolvedItems.push({ product, quantity: item.quantity });
          }

          for (const { product, quantity } of resolvedItems) {
            const updated = await this.productRepository.decrementStock(
              product._id.toString(),
              quantity,
              session
            );
            if (!updated) {
              throw new AppError(
                `${product.name} is no longer available in the requested quantity`,
                400,
                ErrorCode.VALIDATION_ERROR
              );
            }
          }

          const bySeller = new Map<string, { product: IProduct; quantity: number }[]>();
          for (const resolved of resolvedItems) {
            const sellerId = resolved.product.seller.toString();
            if (!bySeller.has(sellerId)) bySeller.set(sellerId, []);
            bySeller.get(sellerId)!.push(resolved);
          }

          checkoutReference = generateCheckoutReference();
          for (const items of bySeller.values()) {
            const orderItems = items.map(({ product, quantity }) => ({
              product: product._id,
              seller: product.seller,
              productName: product.name,
              unitPrice: product.price,
              quantity,
              subtotal: product.price * quantity,
            }));
            const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

            const order = await this.orderRepository.create(
              {
                orderNumber: generateOrderNumber(),
                checkoutReference,
                buyer: new Types.ObjectId(buyerId),
                items: orderItems,
                deliveryAddress: addressSnapshot,
                deliveryMethod: input.deliveryMethod,
                subtotal,
                deliveryFee,
                total: subtotal + deliveryFee,
                paymentStatus: PaymentStatus.PENDING,
                orderStatus: OrderStatus.PENDING,
              },
              session
            );
            createdOrders.push(order);
          }
        });
      } finally {
        await session.endSession();
      }

      // Stage B (non-transactional, deliberately outside the session): stock + orders are
      // now durable in Mongo. Never hold a DB transaction open across an external network
      // call — if Paystack init fails here, fall back to the same compensating cleanup
      // Phase 11 used for this exact failure, since the transaction has already committed.
      try {
        const { authorizationUrl } = await this.paymentService.initializeCheckoutPayment(
          buyerId,
          buyer.email,
          createdOrders,
          checkoutReference
        );

        // Cart is deliberately NOT cleared here — only once processSuccessfulPayment
        // confirms payment actually went through. Clearing it now and having payment fail
        // would lose the buyer's cart for nothing.
        return { orders: createdOrders, paymentUrl: authorizationUrl, checkoutReference };
      } catch (error) {
        logger.error(`Checkout failed after stock reservation for buyer ${buyerId}: ${error}`);
        await Promise.all(
          createdOrders.map((order) => this.orderRepository.deleteById(order._id.toString()))
        );
        const decremented: DecrementedItem[] = createdOrders.flatMap((order) =>
          order.items.map((item) => ({
            productId: item.product.toString(),
            quantity: item.quantity,
          }))
        );
        await this.rollbackStock(decremented);
        throw new AppError(
          'Checkout could not be started, please try again',
          502,
          ErrorCode.CHECKOUT_FAILED
        );
      }
    } finally {
      await this.checkoutLock.release(lockKey, lockToken);
    }
  }

  async cancel(orderNumber: string, buyerId: string): Promise<IOrder> {
    const order = await this.getOwnedOrderForBuyer(orderNumber, buyerId);

    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      throw new AppError(
        'This order has already been paid for and can no longer be self-cancelled. Please contact support.',
        400,
        ErrorCode.ORDER_ALREADY_PAID
      );
    }

    await this.orderRepository.restoreStockForItems(order.items);

    const updated = await this.orderRepository.updateByOrderNumber(orderNumber, {
      orderStatus: OrderStatus.CANCELLED,
    });
    if (!updated) throw new AppError('Order not found', 404, ErrorCode.ORDER_NOT_FOUND);

    return updated;
  }

  async confirmDelivery(orderNumber: string, buyerId: string): Promise<IOrder> {
    const order = await this.getOwnedOrderForBuyer(orderNumber, buyerId);

    if (order.orderStatus !== OrderStatus.IN_TRANSIT) {
      throw new AppError(
        `Order must be in_transit to confirm delivery (currently ${order.orderStatus})`,
        400,
        ErrorCode.INVALID_STATUS_TRANSITION
      );
    }

    const updated = await this.orderRepository.updateByOrderNumber(orderNumber, {
      orderStatus: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
    });
    if (!updated) throw new AppError('Order not found', 404, ErrorCode.ORDER_NOT_FOUND);

    return updated;
  }

  // Sellers reach `delivered` via this same forward chain too (e.g. pickup orders, where
  // the seller hands the order over directly and there's no separate buyer-side courier
  // confirmation step) — confirmDelivery above is an additional path to the same terminal
  // state for the delivery-courier case, not the only one.
  async updateStatusAsSeller(
    orderNumber: string,
    sellerId: string,
    nextStatus: OrderStatus
  ): Promise<IOrder> {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404, ErrorCode.ORDER_NOT_FOUND);

    const ownsItem = order.items.some((item) => item.seller.toString() === sellerId);
    if (!ownsItem) {
      throw new AppError(
        'You do not have permission to update this order',
        403,
        ErrorCode.FORBIDDEN
      );
    }

    const currentIndex = FORWARD_SEQUENCE.indexOf(order.orderStatus);
    const nextIndex = FORWARD_SEQUENCE.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
      throw new AppError(
        `Cannot transition order from ${order.orderStatus} to ${nextStatus}`,
        400,
        ErrorCode.INVALID_STATUS_TRANSITION
      );
    }

    const updates: Partial<IOrder> =
      nextStatus === OrderStatus.DELIVERED
        ? { orderStatus: nextStatus, deliveredAt: new Date() }
        : { orderStatus: nextStatus };

    const updated = await this.orderRepository.updateByOrderNumber(orderNumber, updates);
    if (!updated) throw new AppError('Order not found', 404, ErrorCode.ORDER_NOT_FOUND);

    return updated;
  }

  async listForBuyer(
    buyerId: string,
    orderStatus: OrderStatus | undefined,
    pagination: OrderPagination
  ) {
    const filter = orderStatus ? { orderStatus } : {};
    return this.orderRepository.findByBuyer(buyerId, filter, pagination);
  }

  async listIncomingForSeller(
    sellerId: string,
    orderStatus: OrderStatus | undefined,
    pagination: OrderPagination
  ) {
    const filter: Record<string, unknown> = { paymentStatus: PaymentStatus.COMPLETED };
    if (orderStatus) filter.orderStatus = orderStatus;
    return this.orderRepository.findBySeller(sellerId, filter, pagination);
  }

  async getByCheckoutReference(
    checkoutReference: string,
    requester: { id: string; role: UserRole }
  ): Promise<IOrder[]> {
    const orders = await this.orderRepository.findByCheckoutReference(checkoutReference);
    if (orders.length === 0)
      throw new AppError('Checkout event not found', 404, ErrorCode.ORDER_NOT_FOUND);

    const isOwner = orders[0].buyer.toString() === requester.id;
    if (!isOwner && requester.role !== UserRole.ADMIN) {
      throw new AppError(
        'You do not have permission to view this checkout event',
        403,
        ErrorCode.FORBIDDEN
      );
    }

    return orders;
  }

  async getOrderDetail(
    orderNumber: string,
    requester: { id: string; role: UserRole }
  ): Promise<IOrder> {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404, ErrorCode.ORDER_NOT_FOUND);

    const isBuyer = order.buyer.toString() === requester.id;
    const isSeller = order.items.some((item) => item.seller.toString() === requester.id);
    const isAdmin = requester.role === UserRole.ADMIN;

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new AppError('You do not have permission to view this order', 403, ErrorCode.FORBIDDEN);
    }

    return order;
  }

  private async getOwnedOrderForBuyer(orderNumber: string, buyerId: string): Promise<IOrder> {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);
    if (!order || order.buyer.toString() !== buyerId) {
      throw new AppError('Order not found', 404, ErrorCode.ORDER_NOT_FOUND);
    }
    return order;
  }

  private async rollbackStock(decremented: DecrementedItem[]): Promise<void> {
    const results = await Promise.allSettled(
      decremented.map((item) => this.productRepository.restoreStock(item.productId, item.quantity))
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const item = decremented[index];
        logger.error(
          `CRITICAL: failed to roll back stock for product ${item.productId} (+${item.quantity}) during checkout rollback — manual reconciliation required: ${result.reason}`
        );
      }
    });
  }
}
