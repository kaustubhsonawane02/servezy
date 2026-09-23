import mongoose, { Schema, type Document, type Model } from 'mongoose';
import bcrypt from 'bcrypt';
import type { Role } from './types';

export interface IStaffUser extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  email?: string;        // owner/manager only; kitchen/billing staff may omit
  passwordHash?: string; // owner/manager email+password login
  pinHash?: string;      // 4-digit PIN hashed — tablet login for kitchen/billing
  role: Role;
  pushToken?: string;    // Expo push token for new_order notifications
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
  comparePin(pin: string): Promise<boolean>;
}

interface IStaffUserModel extends Model<IStaffUser> {
  hashPassword(plain: string): Promise<string>;
  hashPin(pin: string): Promise<string>;
}

const staffUserSchema = new Schema<IStaffUser, IStaffUserModel>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, lowercase: true, trim: true, sparse: true },
    passwordHash: { type: String },
    pinHash: { type: String },  // bcrypt-hashed 4-digit PIN
    role: { type: String, required: true, enum: ['owner', 'manager', 'billing', 'kitchen'] },
    pushToken: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// ⚡ from schema doc — email lookup per restaurant
staffUserSchema.index({ restaurantId: 1 });
staffUserSchema.index({ restaurantId: 1, email: 1 }, { unique: true, sparse: true });

staffUserSchema.statics.hashPassword = function (plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
};

staffUserSchema.statics.hashPin = function (pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
};

staffUserSchema.methods.comparePassword = function (plain: string): Promise<boolean> {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

staffUserSchema.methods.comparePin = function (pin: string): Promise<boolean> {
  if (!this.pinHash) return Promise.resolve(false);
  return bcrypt.compare(pin, this.pinHash);
};

// Never leak hashes in JSON responses
staffUserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.passwordHash;
    delete obj.pinHash;
    delete obj.__v;
    return ret;
  },
});

export const StaffUser: IStaffUserModel =
  (mongoose.models.StaffUser as IStaffUserModel) ??
  mongoose.model<IStaffUser, IStaffUserModel>('StaffUser', staffUserSchema);
