import { ClientSession, FilterQuery, Types } from 'mongoose';

import { IOrder, IOrderItem, OrderModel } from '../models/order.model';
import { ProductModel } from '../models/product.model';
import { CancellationReason, OrderStatus, PaymentStatus } from '../types/enums';

export interface OrderPagination {
  page: number;
  limit: number;
  sort: Record<string, 1 | -1>;
}

export interface PaginatedOrders {
  items: IOrder[];
  total: number;
}

export interface AdminOrderFilter {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

// Phase 17: every method that returns an Order to a client populates these two paths —
// one pattern, applied consistently, not a special admin-only version. Mongoose supports
// dot-notation population of a path nested inside an array of subdocuments directly
// ('items.seller'), same as a top-level ref. Deliberately NOT applied to findByIds
// (PaymentService's internal webhook/email flow groups orders by `item.seller.toString()`
// against a raw ObjectId — populating there would silently break that grouping for no
// benefit, since order-confirmation emails never display buyer/seller objects) or to
// create/findStalePendingOrders/findRecent/expireIfPending (checkout's own response,
// dashboard's activity feed, and the auto-expiry job never read these fields at all).
const ORDER_POPULATE = [
  { path: 'buyer', select: 'firstName lastName email' },
  { path: 'items.seller', select: 'organizationName' },
];

export class OrderRepository {
  async create(data: Partial<IOrder>, session?: ClientSession): Promise<IOrder> {
    const [order] = await OrderModel.create([data], session ? { session } : undefined);
    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    return OrderModel.findOne({ orderNumber }).populate(ORDER_POPULATE);
  }

  async findByCheckoutReference(checkoutReference: string): Promise<IOrder[]> {
    return OrderModel.find({ checkoutReference }).sort({ createdAt: 1 }).populate(ORDER_POPULATE);
  }

  async findByIds(orderIds: string[]): Promise<IOrder[]> {
    return OrderModel.find({ _id: { $in: orderIds } });
  }

  async findByBuyer(
    buyerId: string,
    filter: FilterQuery<IOrder>,
    pagination: OrderPagination
  ): Promise<PaginatedOrders> {
    const query: FilterQuery<IOrder> = { ...filter, buyer: buyerId };
    return this.paginate(query, pagination);
  }

  async findBySeller(
    sellerId: string,
    filter: FilterQuery<IOrder>,
    pagination: OrderPagination
  ): Promise<PaginatedOrders> {
    const query: FilterQuery<IOrder> = { ...filter, 'items.seller': sellerId };
    return this.paginate(query, pagination);
  }

  // Admin listing (Phase 15): no buyer/seller restriction, unlike findByBuyer/findBySeller
  // above — admin needs to see orders across every buyer. Builds the query conditionally
  // rather than spreading `filter` as-is — an unset filter key arrives here as
  // `undefined`, and passing `{ orderStatus: undefined }` straight to Mongo doesn't get
  // dropped, it BSON-serializes to `{ orderStatus: null }`, which matches nothing.
  async findAllAdmin(
    filter: AdminOrderFilter,
    pagination: OrderPagination
  ): Promise<PaginatedOrders> {
    const query: FilterQuery<IOrder> = {};
    if (filter.orderStatus) query.orderStatus = filter.orderStatus;
    if (filter.paymentStatus) query.paymentStatus = filter.paymentStatus;
    return this.paginate(query, pagination);
  }

  // Dashboard widget: last N orders across the whole platform, any status — merged with
  // CampaignRepository.findRecent in AdminService to build the combined activity feed.
  async findRecent(limit: number): Promise<IOrder[]> {
    return OrderModel.find().sort({ createdAt: -1 }).limit(limit);
  }

  async updateByOrderNumber(orderNumber: string, data: Partial<IOrder>): Promise<IOrder | null> {
    return OrderModel.findOneAndUpdate({ orderNumber }, data, {
      new: true,
      runValidators: true,
    }).populate(ORDER_POPULATE);
  }

  async updatePaymentStatusForOrders(
    orderIds: (Types.ObjectId | string)[],
    paymentStatus: PaymentStatus,
    orderStatus?: OrderStatus
  ): Promise<void> {
    const update: Record<string, unknown> = { paymentStatus };
    if (orderStatus) update.orderStatus = orderStatus;
    await OrderModel.updateMany({ _id: { $in: orderIds } }, { $set: update });
  }

  // Used only to unwind a checkout attempt that failed after orders were already created
  // (e.g. Paystack init failed) — a real, submitted-for-payment order is cancelled via
  // orderStatus, never deleted.
  async deleteById(orderId: string): Promise<void> {
    await OrderModel.deleteOne({ _id: orderId });
  }

  // Compensating action tied to the order/checkout lifecycle (used by both
  // PaymentService.processFailedPayment and OrderService.cancel) — restores
  // Product.quantityAvailable for every item on an order. Lives here rather than
  // ProductRepository per the Phase 11 spec: it's "undo this order's effect on stock,"
  // not a general product-catalog operation. This does duplicate the one-line $inc that
  // ProductRepository.restoreStock also does — deliberate, since repositories in this
  // codebase don't depend on each other, and the alternative (OrderRepository importing
  // ProductRepository) would be a bigger layering smell than one duplicated line.
  async restoreStockForItems(items: IOrderItem[], session?: ClientSession): Promise<void> {
    await Promise.all(
      items.map((item) =>
        ProductModel.updateOne(
          { _id: item.product },
          { $inc: { quantityAvailable: item.quantity } },
          { session }
        )
      )
    );
  }

  // Stale-checkout auto-expiry (Phase 14): finds orders still unpaid past the expiry
  // window, excluding ones already cancelled (idempotent — a second cron tick or manual
  // trigger with nothing new to expire finds zero rows here, no distributed lock needed).
  async findStalePendingOrders(cutoffDate: Date): Promise<IOrder[]> {
    return OrderModel.find({
      paymentStatus: PaymentStatus.PENDING,
      createdAt: { $lt: cutoffDate },
      orderStatus: { $ne: OrderStatus.CANCELLED },
    });
  }

  // Atomic claim, same shape as TransactionRepository.markCompletedIfPending/
  // markFailedIfPending: only transitions an order that's STILL pending at the moment of
  // the write, guarding against a race with a webhook that pays the order out from under
  // the expiry job between the initial read and this write. Returns the PRE-update
  // document (so the caller has .items for stock restoration) if this call performed the
  // transition, or null if the order had already moved on (paid or cancelled elsewhere).
  async expireIfPending(
    orderNumber: string,
    cancellationReason: CancellationReason,
    session: ClientSession
  ): Promise<IOrder | null> {
    return OrderModel.findOneAndUpdate(
      { orderNumber, paymentStatus: PaymentStatus.PENDING, orderStatus: { $ne: OrderStatus.CANCELLED } },
      { $set: { orderStatus: OrderStatus.CANCELLED, cancellationReason } },
      { new: false, session }
    );
  }

  // Dashboard stat: revenue = sum of subtotal (NOT total) across the seller's completed
  // orders — deliberately excludes deliveryFee, which isn't product revenue and has no
  // payout/logistics-split system to justify including it. Each Order already belongs to
  // exactly one seller (Phase 11's per-seller split), so this is a plain match+group, no
  // per-item unwind needed. Aggregate pipelines don't auto-cast query values against the
  // schema the way find()/findOne() do, hence the explicit ObjectId cast.
  async getSellerStats(sellerId: string): Promise<{ totalOrders: number; revenue: number }> {
    const [result] = await OrderModel.aggregate<{ totalOrders: number; revenue: number }>([
      {
        $match: {
          'items.seller': new Types.ObjectId(sellerId),
          paymentStatus: PaymentStatus.COMPLETED,
        },
      },
      { $group: { _id: null, totalOrders: { $sum: 1 }, revenue: { $sum: '$subtotal' } } },
    ]);

    return { totalOrders: result?.totalOrders ?? 0, revenue: result?.revenue ?? 0 };
  }

  // Platform-wide dashboard stat (Phase 15, distinct from the per-seller getSellerStats
  // above): total = count of every Order regardless of status; revenue = same definition
  // as Phase 13 (sum of subtotal, never total, across paymentStatus: completed orders) —
  // don't redefine it differently here. Single aggregation via $facet so the two
  // independent counts don't require two round trips.
  async getOrderStats(): Promise<{ total: number; revenue: number }> {
    const [result] = await OrderModel.aggregate<{ total: number; revenue: number }>([
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          revenue: [
            { $match: { paymentStatus: PaymentStatus.COMPLETED } },
            { $group: { _id: null, revenue: { $sum: '$subtotal' } } },
          ],
        },
      },
      {
        $project: {
          total: { $ifNull: [{ $arrayElemAt: ['$totalCount.count', 0] }, 0] },
          revenue: { $ifNull: [{ $arrayElemAt: ['$revenue.revenue', 0] }, 0] },
        },
      },
    ]);

    return { total: result?.total ?? 0, revenue: result?.revenue ?? 0 };
  }

  private async paginate(
    query: FilterQuery<IOrder>,
    pagination: OrderPagination
  ): Promise<PaginatedOrders> {
    const { page, limit, sort } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      OrderModel.find(query).sort(sort).skip(skip).limit(limit).populate(ORDER_POPULATE),
      OrderModel.countDocuments(query),
    ]);

    return { items, total };
  }
}
