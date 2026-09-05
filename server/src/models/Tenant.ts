import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  isActive: boolean;
  trialEndsAt?: Date;
  trialStartedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
        slug: { type: String, required: true, lowercase: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    trialStartedAt: { type: Date },
    trialEndsAt: { type: Date },
  },
  { timestamps: true },
);

// Fast tenant lookup by slug (used in resolveTenant middleware)
tenantSchema.index({ slug: 1 }, { unique: true });

export const Tenant: Model<ITenant> =
  mongoose.models.Tenant ?? mongoose.model<ITenant>('Tenant', tenantSchema);
