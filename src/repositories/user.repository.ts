import { IUser, UserModel } from '../models/user.model';

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

  async existsByEmail(email: string): Promise<boolean> {
    return UserModel.exists({
      email: email.toLowerCase().trim(),
    }).then(Boolean);
  }
}
