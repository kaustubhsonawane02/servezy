import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1).max(60),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = categorySchema.partial();

export const itemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(300).optional(),
  price: z.number().int().min(0),         // whole rupees
  isVeg: z.boolean(),
  inStock: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
  upsellTag: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateItemSchema = itemSchema.partial().omit({ categoryId: true });
