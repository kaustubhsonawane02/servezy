import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { OrderStatus } from './types';

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

export interface IOrder extends Document {
  tenantId: mongoose.Types.ObjectId;
  orderNumber: number;
  status: OrderStatus;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  placedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    orderNumber: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'],
      default: 'pending',
    },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    tableNumber: { type: String, trim: true },
    customerName: { type: String, trim: true, maxlength: 80 },
    customerPhone: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 300 },
    placedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Kitchen screen: live orders for one tenant, newest first
orderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
// Prevents duplicate order numbers per tenant (ORD-1, ORD-2, ...)
orderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
// Daily sales reports
orderSchema.index({ tenantId: 1, createdAt: -1 });

export const Order: Model<IOrder> =
  mongoose.models.Order ?? mongoose.model<IOrder>('Order', orderSchema);
