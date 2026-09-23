import mongoose from 'mongoose';
import { env } from './env';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export async function connectDB(retries = MAX_RETRIES): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.DATABASE_URL, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    if (retries <= 0) {
      console.error('MongoDB connection failed permanently. Exiting.');
      process.exit(1);
    }
    console.warn(
      `MongoDB connection failed (retriesretriesleft).Retryingin{retries} retries left). Retrying inretriesretriesleft).Retryingin{RETRY_DELAY_MS / 1000}s...`
    );

    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    await connectDB(retries - 1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}
