import { app } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    const line = 'Servezy API running on :' + env.PORT + ' [' + env.NODE_ENV + ']';
    console.log(line);
  });

  const shutdown = (signal: string) => {
    console.log(signal + ' received. Shutting down gracefully...');
    server.close(() => {
 disconnectDB().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
