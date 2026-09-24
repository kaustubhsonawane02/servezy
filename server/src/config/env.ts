import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env if not in production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url("Must be a valid MongoDB connection string"),
  JWT_SECRET: z.string().min(64, "JWT_SECRET must be at least 64 characters long for production"),
  CLIENT_URLS: z.string().transform((str) => str.split(',')),
  TRIAL_DAYS: z.coerce.number().default(14),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
export const allowedOrigins = env.CLIENT_URLS;