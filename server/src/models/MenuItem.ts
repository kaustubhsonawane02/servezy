import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IMenuItem extends Document {
  restaurantId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number;       // whole rupees, no floats
  isVeg: boolean;
  inStock: boolean;    // toggled live; emits socket menu_updated
  isActive: boolean;   // soft-delete flag — never hard-delete items with order history
  imageUrl?: string;
  upsellTag?: string;  // "goes well with" — links to another MenuItem name
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 300 },
    price: { type: Number, required: true, min: 0 },
    isVeg: { type: Boolean, required: true },
    inStock: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    imageUrl: { type: String },
    upsellTag: { type: String },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ⚡ from schema doc
menuItemSchema.index({ restaurantId: 1, categoryId: 1 });
// Fast public menu: active + inStock items for a tenant
menuItemSchema.index({ restaurantId: 1, categoryId: 1, inStock: 1, isActive: 1 });

export const MenuItem: Model<IMenuItem> =
  mongoose.models.MenuItem ?? mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
