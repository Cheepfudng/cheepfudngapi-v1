import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { IDeliveryAddress, IUser } from '../models/user.model';
import { DeliveryAddressInput, UserRepository } from '../repositories/user.repository';

const MAX_DELIVERY_ADDRESSES = 5;

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async listAddresses(userId: string): Promise<IDeliveryAddress[]> {
    const user = await this.getUserOrThrow(userId);
    return user.deliveryAddresses;
  }

  async addAddress(userId: string, input: DeliveryAddressInput): Promise<IDeliveryAddress[]> {
    const user = await this.getUserOrThrow(userId);

    if (user.deliveryAddresses.length >= MAX_DELIVERY_ADDRESSES) {
      throw new AppError(
        `You can only save up to ${MAX_DELIVERY_ADDRESSES} delivery addresses`,
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // First address is always the default, regardless of anything the client sends —
    // the create endpoint doesn't even accept an isDefault field.
    const isDefault = user.deliveryAddresses.length === 0;

    const updated = await this.userRepository.addAddress(userId, { ...input, isDefault });
    if (!updated) throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);

    return updated.deliveryAddresses;
  }

  // isDefault is intentionally not an accepted field here — changing default status only
  // happens through setDefaultAddress, the sole place the "only one isDefault: true at a
  // time" invariant is enforced. Accepting it here too would risk ending up with two
  // addresses marked default.
  async updateAddress(
    userId: string,
    addressId: string,
    updates: Partial<DeliveryAddressInput>
  ): Promise<IDeliveryAddress[]> {
    const updated = await this.userRepository.updateAddress(userId, addressId, updates);
    if (!updated) throw new AppError('Address not found', 404, ErrorCode.NOT_FOUND);

    return updated.deliveryAddresses;
  }

  async removeAddress(userId: string, addressId: string): Promise<IDeliveryAddress[]> {
    const user = await this.getUserOrThrow(userId);
    const target = user.deliveryAddresses.id(addressId);
    if (!target) throw new AppError('Address not found', 404, ErrorCode.NOT_FOUND);

    const wasDefault = target.isDefault;

    const afterRemoval = await this.userRepository.removeAddress(userId, addressId);
    if (!afterRemoval) throw new AppError('Address not found', 404, ErrorCode.NOT_FOUND);

    if (!wasDefault || afterRemoval.deliveryAddresses.length === 0) {
      return afterRemoval.deliveryAddresses;
    }

    // Auto-promote the most recently added remaining address to default. Relies on
    // deliveryAddresses preserving push (insertion) order — nothing in this domain
    // ever reorders the array, so the last element is always the most recently added.
    const mostRecent = afterRemoval.deliveryAddresses[afterRemoval.deliveryAddresses.length - 1];
    const reassigned = await this.userRepository.setDefaultAddress(
      userId,
      mostRecent._id.toString()
    );

    return reassigned?.deliveryAddresses ?? afterRemoval.deliveryAddresses;
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<IDeliveryAddress[]> {
    const updated = await this.userRepository.setDefaultAddress(userId, addressId);
    if (!updated) throw new AppError('Address not found', 404, ErrorCode.NOT_FOUND);

    return updated.deliveryAddresses;
  }

  private async getUserOrThrow(userId: string): Promise<IUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);
    return user;
  }
}
