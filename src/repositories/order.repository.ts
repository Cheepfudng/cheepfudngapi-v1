import { ClientSession, FilterQuery, Types } from 'mongoose';

import { IOrder, IOrderItem, OrderModel } from '../models/order.model';
import { ProductModel } from '../models/product.model';
import { OrderStatus, PaymentStatus } from '../types/enums';

export interface OrderPagination {
  page: number;
  limit: number;
  sort: Record<string, 1 | -1>;
}

export interface PaginatedOrders {
  items: IOrder[];
  total: number;
}

export class OrderRepository {
  async create(data: Partial<IOrder>, session?: ClientSession): Promise<IOrder> {
    const [order] = await OrderModel.create([data], session ? { session } : undefined);
    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    return OrderModel.findOne({ orderNumber });
  }

  async findByCheckoutReference(checkoutReference: string): Promise<IOrder[]> {
    return OrderModel.find({ checkoutReference }).sort({ createdAt: 1 });
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

  async updateByOrderNumber(orderNumber: string, data: Partial<IOrder>): Promise<IOrder | null> {
    return OrderModel.findOneAndUpdate({ orderNumber }, data, { new: true, runValidators: true });
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
  async restoreStockForItems(items: IOrderItem[]): Promise<void> {
    await Promise.all(
      items.map((item) =>
        ProductModel.updateOne(
          { _id: item.product },
          { $inc: { quantityAvailable: item.quantity } }
        )
      )
    );
  }

  private async paginate(
    query: FilterQuery<IOrder>,
    pagination: OrderPagination
  ): Promise<PaginatedOrders> {
    const { page, limit, sort } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      OrderModel.find(query).sort(sort).skip(skip).limit(limit),
      OrderModel.countDocuments(query),
    ]);

    return { items, total };
  }
}
