import mongoose from 'mongoose';
import { app } from './app';
import { env } from './config/env';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB using the validated URL
    await mongoose.connect(env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    // 2. Start the Express server
    app.listen(env.PORT, () => {
      console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();