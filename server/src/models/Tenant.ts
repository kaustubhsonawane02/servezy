import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  ownerEmail: string;
  passwordHash: string; // bcrypt — owner's password
  upiId?: string;
  logoUrl?: string;
  themeConfig: { primaryColor: string };
  subscription: {
    plan: 'trial' | 'monthly' | 'halfyear' | 'yearly';
    status: 'trial' | 'active' | 'expired' | 'suspended';
    startedAt: Date;
    expiresAt: Date;
    razorpaySubscriptionId?: string;
  };
  settings: {
    upsellEnabled: boolean;
    acceptOrders: boolean;
  };
  isActive: boolean; // false = suspended / hard-deleted
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    upiId: { type: String, trim: true },
    logoUrl: { type: String },
    themeConfig: {
      primaryColor: { type: String, default: '#ea580c' },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['trial', 'monthly', 'halfyear', 'yearly'],
        default: 'trial',
      },
      status: {
        type: String,
        enum: ['trial', 'active', 'expired', 'suspended'],
        default: 'trial',
      },
      startedAt: { type: Date, required: true },
      expiresAt: { type: Date, required: true }, // ⚡ indexed below
      razorpaySubscriptionId: { type: String },
    },
    settings: {
      upsellEnabled: { type: Boolean, default: true },
      acceptOrders: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ⚡ mandatory indexes from schema doc
tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ ownerEmail: 1 }, { unique: true });
tenantSchema.index({ 'subscription.expiresAt': 1 }); // daily cron uses this

export const Tenant: Model<ITenant> =
  mongoose.models.Tenant ?? mongoose.model<ITenant>('Tenant', tenantSchema);
