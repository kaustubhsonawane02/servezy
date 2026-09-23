import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type OrderStatus = 'placed' | 'preparing' | 'ready' | 'served' | 'completed';
export type PaymentStatus = 'pending' | 'paid_via_upi' | 'cash' | 'confirmed_by_staff';
export type OrderSource = 'qr' | 'waiter';

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  name: string;           // snapshot at order time — never changes with menu edits
  quantity: number;       // 1–20
  price: number;          // snapshot price in whole rupees
  specialInstructions?: string; // max 200 chars
}

export interface IOrder extends Document {
  restaurantId: mongoose.Types.ObjectId;
  tableNumber: string;
  items: IOrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  source: OrderSource;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    price: { type: Number, required: true, min: 0 },
    specialInstructions: { type: String, maxlength: 200 },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    tableNumber: { type: String, required: true, trim: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: { validator: (v: unknown[]) => v.length > 0, message: 'Order must have at least one item' },
    },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ['placed', 'preparing', 'ready', 'served', 'completed'],
      default: 'placed',
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'paid_via_upi', 'cash', 'confirmed_by_staff'],
      default: 'pending',
    },
    source: { type: String, required: true, enum: ['qr', 'waiter'], default: 'qr' },
    customerName: { type: String, trim: true, maxlength: 80 },
    customerPhone: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true },
);

// ⚡ mandatory indexes from schema doc
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 }); // KDS + active orders
orderSchema.index({ restaurantId: 1, createdAt: -1 });             // daily reports

export const Order: Model<IOrder> =
  mongoose.models.Order ?? mongoose.model<IOrder>('Order', orderSchema);
