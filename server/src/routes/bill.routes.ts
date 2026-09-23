import { Router, type Request, type Response, type NextFunction } from 'express';
import { Order } from '../models/Order';
import { Bill } from '../models/Bill';
import { requireAuth, requireRole, subscriptionGuard } from '../middleware/auth';
import { paymentSchema } from '../validators/payment';

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

const isObjectId = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);

// POST /api/v1/bills/orders/:orderId  - create (freeze) a bill
router.post(
  '/orders/:orderId',
  requireAuth,
  subscriptionGuard,
  requireRole('owner', 'manager', 'billing'),
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    if (!isObjectId(orderId)) {
      res.status(400).json({ success: false, error: 'Invalid order id' });
      return;
    }

    const order = await Order.findOne({ _id: orderId, restaurantId: req.auth!.restaurantId });
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    if (order.status !== 'ready' && order.status !== 'served') {
      res.status(409).json({ success: false, error: 'Bill can only be generated for ready or served orders' });
      return;
    }

    const existing = await Bill.findOne({ restaurantId: req.auth!.restaurantId, orderId });
    if (existing) {
      res.status(409).json({ success: false, error: 'Bill already exists for this order', data: existing });
      return;
    }

    // Frozen numbers: 5% GST split as CGST 2.5% + SGST 2.5%
    const subtotal = order.subtotal;
    const cgst = Math.round(subtotal * 0.025 * 100) / 100;
    const sgst = Math.round(subtotal * 0.025 * 100) / 100;
    const total = Math.round((subtotal + cgst + sgst) * 100) / 100;

    const last = await Bill.findOne({ restaurantId: req.auth!.restaurantId }).sort({ billNumber: -1 }).select('billNumber');

    const bill = await Bill.create({
      restaurantId: req.auth!.restaurantId,
      orderId: order._id,
      tableNumber: order.tableNumber,
      billNumber: (last?.billNumber ?? 0) + 1,
      subtotal,
      cgst,
      sgst,
      taxAmount: cgst + sgst,
      total,
      totalAmount: total,
      paymentStatus: 'pending',
      generatedAt: new Date(),
    });

    res.status(201).json({ success: true, data: bill });
  }),
);

// GET /api/v1/bills/orders/:orderId  - retrieve the printed bill
router.get(
  '/orders/:orderId',
  requireAuth,
  subscriptionGuard,
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    if (!isObjectId(orderId)) {
      res.status(400).json({ success: false, error: 'Invalid order id' });
      return;
    }
    const bill = await Bill.findOne({ restaurantId: req.auth!.restaurantId, orderId });
    if (!bill) {
      res.status(404).json({ success: false, error: 'No bill for this order' });
      return;
    }
    res.json({ success: true, data: bill });
  }),
);

// PATCH /api/v1/bills/orders/:orderId/pay  - record payment (exact amount)
router.patch(
  '/orders/:orderId/pay',
  requireAuth,
  subscriptionGuard,
  requireRole('owner', 'manager', 'billing'),
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    if (!isObjectId(orderId)) {
      res.status(400).json({ success: false, error: 'Invalid order id' });
      return;
    }

    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const bill = await Bill.findOne({ restaurantId: req.auth!.restaurantId, orderId });
    if (!bill) {
      res.status(404).json({ success: false, error: 'No bill for this order' });
      return;
    }
    if (bill.paymentStatus === 'paid') {
      res.status(409).json({ success: false, error: 'Bill already paid' });
      return;
    }
    if (parsed.data.amount !== bill.total) {
      res.status(400).json({
        success: false,
        error: 'Exact amount required',
        expected: bill.total,
        received: parsed.data.amount,
      });
      return;
    }

    bill.paymentStatus = 'paid';
    bill.method = parsed.data.method;
    bill.paymentMethod = parsed.data.method;
    bill.paidAmount = parsed.data.amount;
    bill.paidAt = new Date();
    await bill.save();

    res.json({ success: true, data: bill });
  }),
);

export default router;
