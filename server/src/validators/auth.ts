import { z } from 'zod';

export const signupSchema = z.object({
  restaurantName: z.string().min(2).max(100),
  ownerName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Kitchen/billing staff log in by restaurant slug + name + 4-digit PIN
export const staffLoginSchema = z.object({
  restaurantSlug: z.string().min(1),
  staffName: z.string().min(2),
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN must be 4 digits'),
});
