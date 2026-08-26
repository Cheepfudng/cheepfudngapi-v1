import { FilterQuery, Types } from 'mongoose';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { DocumentStorage } from '../integrations/contracts/document-storage.interface';
import { IProduct } from '../models/product.model';
import { ProductRepository } from '../repositories/product.repository';
import { UserRepository } from '../repositories/user.repository';
import { OrganizationType, ProductModerationStatus, UserRole, VerificationStatus } from '../types/enums';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export interface ListProductsQuery {
  category?: string;
  state?: string;
  lga?: string;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

export interface ProductLocationInput {
  state: string;
  lga: string;
}

export interface CreateProductInput {
  name: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  quantityAvailable: number;
  minimumOrder: number;
  location: ProductLocationInput;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  unit?: string;
  quantityAvailable?: number;
  minimumOrder?: number;
  location?: ProductLocationInput;
  isActive?: boolean;
}

const SORT_OPTIONS: Record<string, Record<string, 1 | -1>> = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  newest: { createdAt: -1 },
};

const SUPPLY_ORGANIZATION_TYPES: OrganizationType[] = [
  OrganizationType.FARMER,
  OrganizationType.VENDOR,
];

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly productImageStorage: DocumentStorage
  ) {}

  async listProducts(query: ListProductsQuery) {
    const filter: FilterQuery<IProduct> = {
      isActive: true,
      moderationStatus: ProductModerationStatus.APPROVED,
    };

    if (query.category) filter.category = query.category;
    if (query.state) filter['location.state'] = query.state;
    if (query.lga) filter['location.lga'] = query.lga;

    if (query.minPrice || query.maxPrice) {
      const price: { $gte?: number; $lte?: number } = {};
      if (query.minPrice) price.$gte = Number(query.minPrice);
      if (query.maxPrice) price.$lte = Number(query.maxPrice);
      filter.price = price;
    }

    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ name: regex }, { description: regex }];
    }

    const sort = SORT_OPTIONS[query.sort ?? 'newest'] ?? SORT_OPTIONS.newest;
    const { page, limit } = parsePagination(query);

    const { items, total } = await this.productRepository.findMany(filter, { page, limit, sort });

    return { products: items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getProductById(productId: string): Promise<IProduct> {
    const product = await this.productRepository.findById(productId);
    if (
      !product ||
      !product.isActive ||
      product.moderationStatus !== ProductModerationStatus.APPROVED
    ) {
      throw new AppError('Product not found', 404, ErrorCode.PRODUCT_NOT_FOUND);
    }

    await product.populate('seller');

    // A deactivated organization's listings must disappear from public view — indistinguishable
    // from the product itself not existing, same as the isActive/moderationStatus check above.
    const seller = product.seller as unknown as { isActive?: boolean };
    if (seller?.isActive === false) {
      throw new AppError('Product not found', 404, ErrorCode.PRODUCT_NOT_FOUND);
    }

    return product;
  }

  async createProduct(
    sellerId: string,
    input: CreateProductInput,
    files: Express.Multer.File[]
  ): Promise<IProduct> {
    await this.assertSupplyOrganization(sellerId);

    if (input.minimumOrder > input.quantityAvailable) {
      throw new AppError(
        'minimumOrder cannot exceed quantityAvailable',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const images = await Promise.all(
      (files ?? []).map(async (file) => {
        const result = await this.productImageStorage.upload(file.buffer, {
          folder: 'cheepfud/products',
          resourceType: 'image',
        });
        return { url: result.url, publicId: result.publicId };
      })
    );

    return this.productRepository.create({
      seller: new Types.ObjectId(sellerId),
      name: input.name,
      category: input.category,
      description: input.description,
      price: input.price,
      unit: input.unit,
      quantityAvailable: input.quantityAvailable,
      minimumOrder: input.minimumOrder,
      location: input.location,
      images,
    });
  }

  async updateProduct(
    productId: string,
    userId: string,
    updates: UpdateProductInput
  ): Promise<IProduct> {
    const product = await this.getOwnedProduct(productId, userId);

    const nextQuantity = updates.quantityAvailable ?? product.quantityAvailable;
    const nextMinimumOrder = updates.minimumOrder ?? product.minimumOrder;
    if (nextMinimumOrder > nextQuantity) {
      throw new AppError(
        'minimumOrder cannot exceed quantityAvailable',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // TODO: support replacing product images here, same upload pattern as createProduct.
    const updated = await this.productRepository.updateById(productId, updates);
    if (!updated) throw new AppError('Product not found', 404, ErrorCode.PRODUCT_NOT_FOUND);
    return updated;
  }

  async deleteProduct(productId: string, userId: string): Promise<void> {
    await this.getOwnedProduct(productId, userId);

    // TODO: once the Orders domain exists, block soft-delete while the product has active orders.
    await this.productRepository.updateById(productId, { isActive: false });
  }

  private async getOwnedProduct(productId: string, userId: string): Promise<IProduct> {
    const product = await this.productRepository.findById(productId);
    if (!product) throw new AppError('Product not found', 404, ErrorCode.PRODUCT_NOT_FOUND);

    if (product.seller.toString() !== userId) {
      throw new AppError(
        'You do not have permission to modify this product',
        403,
        ErrorCode.FORBIDDEN
      );
    }

    return product;
  }

  private async assertSupplyOrganization(sellerId: string): Promise<void> {
    const seller = await this.userRepository.findById(sellerId);
    if (!seller) throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);

    const isVerifiedSupplyOrg =
      seller.role === UserRole.ORGANIZATION &&
      seller.verificationStatus === VerificationStatus.VERIFIED &&
      !!seller.organizationType &&
      SUPPLY_ORGANIZATION_TYPES.includes(seller.organizationType);

    if (!isVerifiedSupplyOrg) {
      throw new AppError(
        'Only verified farmer or vendor organizations can list products',
        403,
        ErrorCode.SUPPLY_ORGANIZATION_REQUIRED
      );
    }
  }
}
