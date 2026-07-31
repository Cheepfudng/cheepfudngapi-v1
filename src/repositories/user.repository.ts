import { IUser, UserModel } from '../models/user.model';
import { UserRole, VerificationStatus } from '../types';

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
}
