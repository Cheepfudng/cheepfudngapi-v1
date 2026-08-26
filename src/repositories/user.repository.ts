import { FilterQuery } from 'mongoose';

import { IDeliveryAddress, IUser, UserModel } from '../models/user.model';
import { UserRole, VerificationStatus } from '../types';

export interface DeliveryAddressInput {
  label: string;
  street: string;
  city: string;
  state: string;
  phone: string;
}

export interface AdminUserFilter {
  role?: UserRole;
  isActive?: boolean;
}

export interface UserPagination {
  page: number;
  limit: number;
}

export interface PaginatedUsers {
  items: IUser[];
  total: number;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class UserRepository {
  // Admin listing (Phase 15): role/isActive filters, free-text search across
  // email/firstName/lastName/organizationName. `password` stays excluded (select: false
  // at the schema level), so no risk of leaking hashes here.
  async findMany(
    filter: AdminUserFilter,
    search: string,
    pagination: UserPagination
  ): Promise<PaginatedUsers> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IUser> = {};
    if (filter.role) query.role = filter.role;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { email: regex },
        { firstName: regex },
        { lastName: regex },
        { organizationName: regex },
      ];
    }

    const [items, total] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(query),
    ]);

    return { items, total };
  }

  // Deactivating a user only blocks future login (AuthService.login's existing isActive
  // check) — never touches their historical orders/campaigns/products, which stay exactly
  // as they are. Purely a mechanical field flip; the "why"/"who can do this" business rule
  // lives in AdminService.
  async updateActiveStatus(userId: string, isActive: boolean): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(userId, { isActive }, { new: true });
  }

  // Dashboard stat: user count grouped by role, platform-wide.
  async countByRole(): Promise<Partial<Record<UserRole, number>>> {
    const results = await UserModel.aggregate<{ _id: UserRole; count: number }>([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const byRole: Partial<Record<UserRole, number>> = {};
    for (const result of results) byRole[result._id] = result.count;
    return byRole;
  }

  // Dashboard stat: orgs still awaiting a verification decision — pending or under_review,
  // same statuses AdminService.reviewOrganization treats as "not yet decided."
  async countPendingVerifications(): Promise<number> {
    return UserModel.countDocuments({
      role: UserRole.ORGANIZATION,
      verificationStatus: { $in: [VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW] },
    });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({
      email: email.toLowerCase().trim(),
    });
  }

  async findById(userId: string): Promise<IUser | null> {
    return UserModel.findById(userId);
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    return UserModel.create(data);
  }

  async createIfNotExists(email: string): Promise<IUser> {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await this.findByEmail(normalizedEmail);

    if (existingUser) {
      return existingUser;
    }

    return UserModel.create({
      email: normalizedEmail,
    });
  }

  async updateById(userId: string, data: Partial<IUser>): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(userId, data, {
      new: true,
      runValidators: true,
    });
  }

  async save(user: IUser): Promise<IUser> {
    return user.save();
  }

  async existsByEmail(email: string): Promise<boolean> {
    return UserModel.exists({
      email: email.toLowerCase().trim(),
    }).then(Boolean);
  }
  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() }).select('+password');
  }
  async findByIdWithPassword(userId: string): Promise<IUser | null> {
    return UserModel.findById(userId).select('+password');
  }
  // Phase 16: paginated, matching every other admin list endpoint — this predates
  // pagination.ts (Phase 5.5–5.8, before Phase 8) and was the known offender that
  // triggered the pagination-standardization audit.
  async findOrganizations(
    status: VerificationStatus | undefined,
    pagination: UserPagination
  ): Promise<PaginatedUsers> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { role: UserRole.ORGANIZATION };
    if (status) filter.verificationStatus = status;

    const [items, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  // Address methods use Mongoose's subdocument-array helpers (`.id()`, `.push()`,
  // `.deleteOne()`) rather than manual array filtering, then persist with a single
  // `.save()`. isDefault/max-count business rules live in UserService — these are
  // deliberately mechanical.

  async addAddress(
    userId: string,
    address: DeliveryAddressInput & { isDefault: boolean }
  ): Promise<IUser | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    user.deliveryAddresses.push(address);
    await user.save();
    return user;
  }

  async updateAddress(
    userId: string,
    addressId: string,
    updates: Partial<DeliveryAddressInput>
  ): Promise<IUser | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    const address = user.deliveryAddresses.id(addressId);
    if (!address) return null;

    Object.assign(address, updates);
    await user.save();
    return user;
  }

  async removeAddress(userId: string, addressId: string): Promise<IUser | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    const address = user.deliveryAddresses.id(addressId);
    if (!address) return null;

    address.deleteOne();
    await user.save();
    return user;
  }

  // Sets exactly one address's isDefault to true and every other one to false —
  // the mechanical half of the "only one default at a time" invariant. The decision
  // of *when* to call this (first add, explicit PATCH .../default, auto-promotion on
  // removal) belongs to UserService.
  async setDefaultAddress(userId: string, addressId: string): Promise<IUser | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    const target = user.deliveryAddresses.id(addressId);
    if (!target) return null;

    user.deliveryAddresses.forEach((address) => {
      address.isDefault = address._id.equals(target._id);
    });
    await user.save();
    return user;
  }

  async findAddresses(userId: string): Promise<IDeliveryAddress[] | null> {
    const user = await UserModel.findById(userId).select('deliveryAddresses');
    if (!user) return null;
    return user.deliveryAddresses;
  }
}
