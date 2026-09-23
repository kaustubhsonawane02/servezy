import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: objectId,
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
  tableNumber: z.string().max(20).optional(),
  customerName: z.string().max(80).optional(),
  customerPhone: z.string().max(15).optional(),
  notes: z.string().max(300).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['placed', 'preparing', 'ready', 'served', 'completed']),
});
