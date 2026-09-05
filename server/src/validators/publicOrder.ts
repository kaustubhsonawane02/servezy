import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');

export const publicOrderSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: objectId,
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
  customerName: z.string().max(80).optional(),
  notes: z.string().max(300).optional(),
});
