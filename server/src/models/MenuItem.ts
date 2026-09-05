import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IMenuItem extends Document {
  tenantId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    price: { type: Number, required: true, min: 0 },
    isVeg: { type: Boolean, required: true },
    isAvailable: { type: Boolean, default: true },
    imageUrl: { type: String },
  },
  { timestamps: true },
);

// Item names unique within a restaurant
menuItemSchema.index({ tenantId: 1, name: 1 }, { unique: true });
// The hot path: full menu fetch for a tenant grouped by category
menuItemSchema.index({ tenantId: 1, categoryId: 1, isAvailable: 1 });

export const MenuItem: Model<IMenuItem> =
  mongoose.models.MenuItem ?? mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
