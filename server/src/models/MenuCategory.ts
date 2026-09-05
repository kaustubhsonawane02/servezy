import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IMenuCategory extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  displayOrder: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
    displayOrder: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Category names are unique per restaurant, not globally
menuCategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });
// Menu page loads: fetch all categories for a tenant, sorted
menuCategorySchema.index({ tenantId: 1, displayOrder: 1 });

export const MenuCategory: Model<IMenuCategory> =
  mongoose.models.MenuCategory ?? mongoose.model<IMenuCategory>('MenuCategory', menuCategorySchema);
