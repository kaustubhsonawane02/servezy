import { z } from 'zod';
import dotenv from 'dotenv';

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

// .parse() throws on error and guarantees `env` is never undefined in TypeScript
export const env = envSchema.parse(process.env);
export const allowedOrigins = env.CLIENT_URLS;