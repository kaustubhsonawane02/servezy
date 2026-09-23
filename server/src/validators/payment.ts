import { z } from 'zod';

export const paymentSchema = z.object({
  method: z.enum(['cash', 'card', 'upi']),
  amount: z.number().positive().multipleOf(0.01),
});
