import mongoose, { Types } from 'mongoose';

import { env } from '../config/env';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { IOrder } from '../models/order.model';
import { IProduct } from '../models/product.model';
import { CartRepository } from '../repositories/cart.repository';
import { OrderPagination, OrderRepository } from '../repositories/order.repository';
import { ProductRepository } from '../repositories/product.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { UserRepository } from '../repositories/user.repository';
import { CheckoutLockService } from './checkout-lock.service';
import { PaymentService } from './payment.service';
import {
  CancellationReason,
  DeliveryMethod,
  OrderStatus,
  PaymentStatus,
  ProductModerationStatus,
  UserRole,
} from '../types/enums';
import { DELIVERY_FEE_NGN } from '../utils/constants';
import { logger } from '../utils/logger';
import { generateCheckoutReference, generateOrderNumber } from '../utils/reference-generator';

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

// Order.buyer and items[].seller are now populated by OrderRepository (Phase 17) wherever
// an Order is returned to a client — a populated field is a different shape than the raw
// Types.ObjectId these ownership checks used to assume (`.toString()` on a populated
// Mongoose document does NOT return the id string, it falls back to
// Object.prototype.toString and silently breaks every comparison below). This extracts the
// underlying id regardless of whether the field arrived populated or raw, so ownership
// checks stay correct either way.
const refId = (ref: unknown): Types.ObjectId =>
  ref instanceof Types.ObjectId ? ref : (ref as { _id: Types.ObjectId })._id;

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly paymentService: PaymentService,
    private readonly checkoutLock: CheckoutLockService,
    private readonly transactionRepository: TransactionRepository
  ) {}

  async checkout(buyerId: string, input: CheckoutInput): Promise<CheckoutResult> {
    // One checkout per buyer at a time, held for the WHOLE payment attempt — not just for
    // the duration of this request. Releasing as soon as the paymentUrl was returned still
    // let a *sequential* retry (reach Paystack, back out, try again minutes later) create a
    // second real order against the same cart, since the cart deliberately isn't cleared
    // until payment confirms. See CheckoutLockService for who releases it and when.
    //
    // Generated up front rather than inside the transaction below because it doubles as
    // the lock token, and the lock has to exist before any order does.
    const checkoutReference = generateCheckoutReference();

    const acquired = await this.checkoutLock.acquire(buyerId, checkoutReference);
    if (!acquired) {
      throw new AppError('A checkout is already in progress', 409, ErrorCode.CONFLICT);
    }

    // Only a checkout that actually creates orders and returns a real paymentUrl keeps the
    // lock past this request. Every failure path below — empty cart, stock shortage,
    // Paystack init failure — falls through to the finally and releases immediately, so a
    // failed attempt never blocks the buyer's next legitimate one.
    let retainLockForPayment = false;

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
      const createdOrders: IOrder[] = [];
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // withTransaction may re-run this callback on a transient error, so anything
          // accumulated here has to be reset. checkoutReference is deliberately NOT reset
          // or regenerated — it identifies this checkout attempt (and holds its lock), and
          // a retried transaction is still the same attempt.
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
            if (
              !product ||
              !product.isActive ||
              product.moderationStatus !== ProductModerationStatus.APPROVED
            ) {
              throw new AppError(
                'One or more items in your cart are no longer available — please review your cart',
                400,
                ErrorCode.VALIDATION_ERROR
              );
            }
            // Cart is only guaranteed to enforce minimumOrder at the moment an item is
            // first added (CartService.addItem) — PUT /cart/update and PATCH
            // /cart/increment both intentionally allow reducing an existing line below it
            // afterward (a documented decision, see PROJECT_STATE.md), so a cart line below
            // its product's minimum can genuinely reach checkout. Re-checked here as the
            // final gate before it becomes a real, paid order.
            if (item.quantity < product.minimumOrder) {
              throw new AppError(
                `${product.name} has a minimum order of ${product.minimumOrder} — please update your cart`,
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
        //
        // That surviving cart is exactly why the lock now outlives this request: without
        // it, the buyer could check out the same still-populated cart again and create a
        // genuine second order.
        retainLockForPayment = true;
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
      // Held deliberately on the success path — released by the webhook, by cancel(), or
      // by its TTL. Everything else releases here so a failed attempt blocks nothing.
      if (!retainLockForPayment) {
        await this.checkoutLock.release(buyerId, checkoutReference);
      }
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
      cancellationReason: CancellationReason.BUYER_REQUESTED,
    });
    if (!updated) throw new AppError('Order not found', 404, ErrorCode.ORDER_NOT_FOUND);

    // A deliberate change of mind shouldn't cost the buyer a 15-minute wait before they can
    // check out again. Safe for a multi-seller checkout too: the whole group shares one
    // Paystack transaction, so cancelling any sibling ends that payment attempt anyway, and
    // the reference-as-token means this can only ever release THIS checkout's lock — never
    // a newer one the buyer has since started.
    await this.checkoutLock.release(refId(order.buyer).toString(), order.checkoutReference);

    return updated;
  }

  // Auto-expiry (Phase 14): sweeps checkouts still paymentStatus: pending past
  // ORDER_EXPIRY_MINUTES. Every sibling sharing a checkoutReference expires together, not
  // just whichever one the initial stale-query happened to touch — a multi-seller checkout
  // is one buyer-facing event, so it shouldn't half-expire. Grouped into one Mongo
  // transaction per checkoutReference (same session.withTransaction pattern as Phase
  // 11.5's checkout): every order in the group and the related Transaction commit or roll
  // back together. Multi-instance-safe without a distributed lock — expireIfPending only
  // claims an order still pending at write time, so an overlapping cron tick on another
  // instance simply finds nothing left to claim.
  async expireStaleOrders(): Promise<number> {
    const cutoffDate = new Date(Date.now() - env.ORDER_EXPIRY_MINUTES * 60 * 1000);
    const staleOrders = await this.orderRepository.findStalePendingOrders(cutoffDate);
    if (staleOrders.length === 0) return 0;

    const checkoutReferences = Array.from(new Set(staleOrders.map((o) => o.checkoutReference)));
    let expiredCount = 0;

    for (const checkoutReference of checkoutReferences) {
      const siblings = await this.orderRepository.findByCheckoutReference(checkoutReference);
      const candidates = siblings.filter(
        (order) =>
          order.paymentStatus === PaymentStatus.PENDING && order.orderStatus !== OrderStatus.CANCELLED
      );
      if (candidates.length === 0) continue;

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const order of candidates) {
            const claimed = await this.orderRepository.expireIfPending(
              order.orderNumber,
              CancellationReason.PAYMENT_EXPIRED,
              session
            );
            // null means it was already paid or cancelled concurrently between the read
            // above and this write (e.g. a webhook landed in between) — nothing to restore.
            if (!claimed) continue;

            await this.orderRepository.restoreStockForItems(claimed.items, session);
            expiredCount += 1;
          }

          await this.transactionRepository.markFailedIfPending(
            checkoutReference,
            { reason: 'payment_expired', expiredAt: new Date() },
            session
          );
        });
      } finally {
        await session.endSession();
      }
    }

    logger.info(
      `Order auto-expiry: expired ${expiredCount} order(s) across ${checkoutReferences.length} checkout reference(s) checked`
    );
    return expiredCount;
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

    const ownsItem = order.items.some((item) => refId(item.seller).equals(sellerId));
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

    const isOwner = refId(orders[0].buyer).equals(requester.id);
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

    const isBuyer = refId(order.buyer).equals(requester.id);
    const isSeller = order.items.some((item) => refId(item.seller).equals(requester.id));
    const isAdmin = requester.role === UserRole.ADMIN;

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new AppError('You do not have permission to view this order', 403, ErrorCode.FORBIDDEN);
    }

    return order;
  }

  private async getOwnedOrderForBuyer(orderNumber: string, buyerId: string): Promise<IOrder> {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);
    if (!order || !refId(order.buyer).equals(buyerId)) {
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
