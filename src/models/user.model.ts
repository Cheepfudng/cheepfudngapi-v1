import { Document, Schema, model } from 'mongoose';

import { AccountType, OnboardingStatus, UserRole, VerificationStatus } from '../types/enums';

export interface IUser extends Document {
  email: string;

  firstName?: string;
  lastName?: string;
  phoneNumber?: string;

  organizationName?: string;
  organizationType?: string;

  accountType?: AccountType;
  role: UserRole;
  verificationStatus: VerificationStatus;
  onboardingStatus: OnboardingStatus;

  isEmailVerified: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    firstName: {
      type: String,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    accountType: {
      type: String,
      enum: Object.values(AccountType),
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },

    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
    },

    onboardingStatus: {
      type: String,
      enum: Object.values(OnboardingStatus),
      default: OnboardingStatus.NOT_STARTED,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    organizationName: {
      type: String,
      trim: true,
    },

    organizationType: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = model<IUser>('User', userSchema);
