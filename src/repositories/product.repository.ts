import { ClientSession, FilterQuery } from 'mongoose';

import { IProduct, ProductModel } from '../models/product.model';
import { UserModel } from '../models/user.model';
import { ProductModerationStatus } from '../types/enums';

export interface ProductPagination {
  page: number;
  limit: number;
  sort: Record<string, 1 | -1>;
}

export interface PaginatedProducts {
  items: IProduct[];
  total: number;
}

export interface AdminProductFilter {
  isActive?: boolean;
  moderationStatus?: ProductModerationStatus;
  category?: string;
  sellerId?: string;
}

const PUBLIC_SELLER_FIELDS = 'organizationName organizationType verificationStatus';

export class ProductRepository {
  async create(data: Partial<IProduct>): Promise<IProduct> {
    return ProductModel.create(data);
  }

  async findById(productId: string, session?: ClientSession): Promise<IProduct | null> {
    return ProductModel.findById(productId, undefined, session ? { session } : undefined);
  }

  async findMany(
    filter: FilterQuery<IProduct>,
    pagination: ProductPagination
  ): Promise<PaginatedProducts> {
    const { page, limit, sort } = pagination;
    const skip = (page - 1) * limit;

    // A deactivated organization's listings must disappear from public browsing, not just
    // from admin/verification views — excluded up front so pagination/total stay accurate
    // (filtering after populate would desync skip/limit/countDocuments from what's returned).
    const inactiveSellerIds = await UserModel.find({ isActive: false }).distinct('_id');
    const scopedFilter: FilterQuery<IProduct> =
      inactiveSellerIds.length > 0 ? { ...filter, seller: { $nin: inactiveSellerIds } } : filter;

    const [items, total] = await Promise.all([
      ProductModel.find(scopedFilter)
        .populate('seller', PUBLIC_SELLER_FIELDS)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      ProductModel.countDocuments(scopedFilter),
    ]);

    return { items, total };
  }

  // Admin listing (Phase 15): deliberately does NOT run the deactivated-seller/isActive
  // exclusion that findMany applies for public browsing — admin needs to see everything,
  // including inactive products and products belonging to deactivated organizations.
  async findManyAdmin(
    filter: AdminProductFilter,
    pagination: ProductPagination
  ): Promise<PaginatedProducts> {
    const { page, limit, sort } = pagination;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IProduct> = {};
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.moderationStatus) query.moderationStatus = filter.moderationStatus;
    if (filter.category) query.category = filter.category;
    if (filter.sellerId) query.seller = filter.sellerId;

    const [items, total] = await Promise.all([
      ProductModel.find(query).populate('seller', PUBLIC_SELLER_FIELDS).sort(sort).skip(skip).limit(limit),
      ProductModel.countDocuments(query),
    ]);

    return { items, total };
  }

  async updateById(productId: string, data: Partial<IProduct>): Promise<IProduct | null> {
    return ProductModel.findByIdAndUpdate(productId, data, { new: true, runValidators: true });
  }

  async existsById(productId: string): Promise<boolean> {
    return ProductModel.exists({ _id: productId }).then(Boolean);
  }

  // Dashboard stat: counts only the seller's currently-active listings, not soft-deleted
  // ones — matches what an org would consider "my current product count," same isActive
  // sense as the public listing filter.
  async countBySeller(sellerId: string): Promise<number> {
    return ProductModel.countDocuments({ seller: sellerId, isActive: true });
  }

  // Atomic overselling guard: the $gte condition and the decrement happen in one Mongo
  // operation, so two concurrent checkouts racing for the last units can never both
  // succeed. Returns null if there isn't enough stock — the caller (OrderService.checkout)
  // treats that as "reject this checkout attempt."
  async decrementStock(
    productId: string,
    quantity: number,
    session?: ClientSession
  ): Promise<IProduct | null> {
    return ProductModel.findOneAndUpdate(
      { _id: productId, quantityAvailable: { $gte: quantity } },
      { $inc: { quantityAvailable: -quantity } },
      { new: true, session }
    );
  }

  // Inverse of decrementStock — used to roll back a checkout attempt (partial failure,
  // payment init failure, or a later charge.failed webhook) and by buyer-initiated cancel.
  async restoreStock(productId: string, quantity: number): Promise<IProduct | null> {
    return ProductModel.findOneAndUpdate(
      { _id: productId },
      { $inc: { quantityAvailable: quantity } },
      { new: true }
    );
  }
}
