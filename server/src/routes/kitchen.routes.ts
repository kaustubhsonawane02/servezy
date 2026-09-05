import { Router, type Request, type Response, type NextFunction } from 'express';
import { Order } from '../models/Order';
import { requireAuth, requireRole, subscriptionGuard } from '../middleware/auth';

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

const ACTIVE: string[] = ['pending', 'confirmed', 'preparing', 'ready'];

// GET /api/v1/kitchen/orders - live board, longest-waiting first
router.get(
  '/orders',
  requireAuth,
  subscriptionGuard,
  requireRole('owner', 'manager', 'kitchen'),
  asyncHandler(async (req, res) => {
    const orders = await Order.find({
      tenantId: req.auth!.tenantId,
      status: { $in: ACTIVE },
    })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json({ success: true, data: orders });
  }),
);

export default router;
