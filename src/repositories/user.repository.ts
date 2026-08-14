import { IDeliveryAddress, IUser, UserModel } from '../models/user.model';
import { UserRole, VerificationStatus } from '../types';

export interface DeliveryAddressInput {
  label: string;
  street: string;
  city: string;
  state: string;
  phone: string;
}

export class UserRepository {
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
  async findOrganizations(status?: VerificationStatus): Promise<IUser[]> {
    const filter: Record<string, unknown> = { role: UserRole.ORGANIZATION };
    if (status) filter.verificationStatus = status;
    return UserModel.find(filter).sort({ createdAt: -1 });
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
