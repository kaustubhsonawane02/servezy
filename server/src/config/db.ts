import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async () => {
  try {
    await mongoose.connect(env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};