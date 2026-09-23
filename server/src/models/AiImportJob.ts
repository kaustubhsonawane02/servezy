import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IExtractedItem {
  name: string;
  price: number;
  description?: string;
  isVeg?: boolean;
}

export interface IAiImportJob extends Document {
  restaurantId: mongoose.Types.ObjectId;
  imageUrl: string;
  status: 'pending' | 'processing' | 'review' | 'completed' | 'failed';
  extractedItems: IExtractedItem[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const extractedItemSchema = new Schema<IExtractedItem>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    isVeg: { type: Boolean },
  },
  { _id: false },
);

const aiImportJobSchema = new Schema<IAiImportJob>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    imageUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'review', 'completed', 'failed'],
      default: 'pending',
    },
    extractedItems: { type: [extractedItemSchema], default: [] },
    error: { type: String },
  },
  { timestamps: true },
);

aiImportJobSchema.index({ restaurantId: 1 });

export const AiImportJob: Model<IAiImportJob> =
  mongoose.models.AiImportJob ??
  mongoose.model<IAiImportJob>('AiImportJob', aiImportJobSchema);
