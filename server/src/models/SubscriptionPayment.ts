import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ISubscriptionPayment extends Document {
  restaurantId: mongoose.Types.ObjectId;
  plan: 'monthly' | 'halfyear' | 'yearly';
  amount: number;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

const subscriptionPaymentSchema = new Schema<ISubscriptionPayment>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    plan: { type: String, required: true, enum: ['monthly', 'halfyear', 'yearly'] },
    amount: { type: Number, required: true, min: 0 },
    razorpayPaymentId: { type: String, required: true },
    razorpayOrderId: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
  },
  { timestamps: true },
);

subscriptionPaymentSchema.index({ restaurantId: 1 });

export const SubscriptionPayment: Model<ISubscriptionPayment> =
  mongoose.models.SubscriptionPayment ??
  mongoose.model<ISubscriptionPayment>('SubscriptionPayment', subscriptionPaymentSchema);
