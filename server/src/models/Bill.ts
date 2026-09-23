import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IBill extends Document {
  restaurantId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;       // unique — one bill per order
  tableNumber?: string;
  billNumber?: number;
  subtotal: number;
  taxAmount?: number;
  cgst?: number;
  sgst?: number;
  discountAmount?: number;
  totalAmount?: number;
  total?: number;
  paymentStatus?: 'pending' | 'paid';
  paymentMethod?: string;
  method?: string;
  paidAmount?: number;
  paidAt?: Date;
  customerPhone?: string;                  // for repeat-customer engine v2
  generatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const billSchema = new Schema<IBill>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    tableNumber: { type: String },
    billNumber: { type: Number },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    cgst: { type: Number, min: 0, default: 0 },
    sgst: { type: Number, min: 0, default: 0 },
    discountAmount: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, min: 0 },
    total: { type: Number, min: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paymentMethod: { type: String },
    method: { type: String },
    paidAmount: { type: Number, min: 0 },
    paidAt: { type: Date },
    customerPhone: { type: String },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// ⚡ from schema doc
billSchema.index({ restaurantId: 1, orderId: 1 }, { unique: true });
billSchema.index({ restaurantId: 1, paidAt: 1, paymentStatus: 1 });

export const Bill: Model<IBill> =
  mongoose.models.Bill ?? mongoose.model<IBill>('Bill', billSchema);
