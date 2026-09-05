import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');

export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = categorySchema.partial();

export const itemSchema = z.object({
  categoryId: objectId,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().nonnegative().max(1000000),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateItemSchema = itemSchema.partial();
