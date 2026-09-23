import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IMenuCategory extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

// ⚡ from schema doc
menuCategorySchema.index({ restaurantId: 1, sortOrder: 1 });
// Category names are unique per restaurant
menuCategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export const MenuCategory: Model<IMenuCategory> =
  mongoose.models.MenuCategory ??
  mongoose.model<IMenuCategory>('MenuCategory', menuCategorySchema);
