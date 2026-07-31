import { Document, Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

import {
  AccountType,
  OnboardingStatus,
  OrganizationType,
  UserRole,
  VerificationStatus,
} from '../types/enums';

export interface IUser extends Document {
  email: string;

  firstName?: string;
  lastName?: string;
  phoneNumber?: string;

  organizationName?: string;
  organizationType?: OrganizationType;

  password: string;
  passwordChangedAt?: Date;

  accountType?: AccountType;
  role: UserRole;
  verificationStatus: VerificationStatus;
  onboardingStatus: OnboardingStatus;

  isEmailVerified: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  changedPasswordAfter(jwtTimestamp: number): boolean;
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

    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },

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

    // Not required at the schema level — the user document exists (email only)
    // from the moment OTP is requested, before a password is ever set.
    // Presence is enforced by the onboarding validators/service instead.
    password: {
      type: String,
      minlength: 8,
      select: false,
    },

    passwordChangedAt: {
      type: Date,
      select: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    organizationName: { type: String, trim: true },
    organizationType: {
      type: String,
      enum: Object.values(OrganizationType),
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password whenever it's set or changed
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Track when the password last changed — lets protect() invalidate access
// tokens issued before a password change, even if they haven't expired yet
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// Exclude deactivated accounts from every find query by default
// userSchema.pre(/^find/, function (next) {
//   this.find({ isActive: { $ne: false } });
//   next();
// });

// Never leak password/passwordChangedAt in any JSON response, regardless
// of how the document was fetched or which controller returns it
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const result = ret as { password?: unknown; passwordChangedAt?: unknown };
    delete result.password;
    delete result.passwordChangedAt;
    return result;
  },
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp: number): boolean {
  if (!this.passwordChangedAt) return false;

  const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return jwtTimestamp < changedTimestamp;
};

export const UserModel = model<IUser>('User', userSchema);
