import { Router, type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Bill } from '../models/Bill';
import { requireAuth, requireRole, subscriptionGuard } from '../middleware/auth';

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

router.get(
  '/daily',
  requireAuth,
  subscriptionGuard,
  requireRole('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const dateStr = typeof req.query.date === 'string' ? req.query.date : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      res.status(400).json({ success: false, error: 'date query param required as YYYY-MM-DD' });
      return;
    }

    const start = new Date(dateStr + 'T00:00:00.000');
    const end = new Date(dateStr + 'T23:59:59.999');

    const restaurantObjectId = new mongoose.Types.ObjectId(req.auth!.restaurantId);

    const orders = await Order.aggregate([
      {
        $match: {
          restaurantId: restaurantObjectId,
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['served', 'completed'] },
        },
      },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          grossSales: { $sum: '$subtotal' },
          taxCollected: { $sum: '$taxAmount' },
        },
      },
    ]);

    const payments = await Bill.aggregate([
      {
        $match: {
          restaurantId: restaurantObjectId,
          paidAt: { $gte: start, $lte: end },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: '$method',
          total: { $sum: '$paidAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const summary = orders[0] ?? { orderCount: 0, grossSales: 0, taxCollected: 0 };

    res.json({
      success: true,
      data: {
        date: dateStr,
        orderCount: summary.orderCount,
        grossSales: summary.grossSales,
        taxCollected: summary.taxCollected,
        paymentSplit: payments.map((p) => ({ method: p._id, total: p.total, count: p.count })),
      },
    });
  }),
);

export default router;
