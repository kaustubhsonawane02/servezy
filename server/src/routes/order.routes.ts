import { Router, type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order, type IOrderItem } from '../models/Order';
import { MenuItem } from '../models/MenuItem';
import { requireAuth, requireRole, subscriptionGuard } from '../middleware/auth';
import { createOrderSchema, updateStatusSchema } from '../validators/order';
import { ORDER_TRANSITIONS, ORDER_STATUS } from '../models/types';

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

// Legal transitions of the order state machine
const TRANSITIONS = ORDER_TRANSITIONS;

router.use(requireAuth, subscriptionGuard);

// POST /api/v1/orders - owner/waiter places an order
router.post(
  '/',
  requireRole('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { items, tableNumber, customerName, customerPhone, notes } = parsed.data;

    // Re-price from the DB. NEVER trust client-sent prices.
    const ids = items.map((i) => new mongoose.Types.ObjectId(i.itemId));
    const dbItems = await MenuItem.find({ _id: { $in: ids }, restaurantId: req.auth!.restaurantId, inStock: true, isActive: true });
    const byId = new Map(dbItems.map((d) => [String(d._id), d]));

    const orderItems: IOrderItem[] = [];
    for (const line of items) {
      const menu = byId.get(line.itemId);
      if (!menu) {
        res.status(400).json({ success: false, error: 'Item unavailable or not found: ' + line.itemId });
        return;
      }
      orderItems.push({
        menuItemId: new mongoose.Types.ObjectId(line.itemId),
        name: menu.name,
        price: menu.price,
        quantity: line.quantity,
      });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const taxAmount = 0; // pluggable later: per-tenant tax rate
    const totalAmount = subtotal + taxAmount;

    const order = await Order.create({
      restaurantId: req.auth!.restaurantId,
      tableNumber: tableNumber ?? 'Takeaway',
      items: orderItems,
      subtotal,
      taxAmount,
      discountAmount: 0,
      totalAmount,
      status: 'placed',
      paymentStatus: 'pending',
      source: 'waiter',
      customerName,
      customerPhone,
      notes,
    });

    res.status(201).json({ success: true, data: order });
  }),
);

// GET /api/v1/orders?status=&limit= - newest first
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { restaurantId: req.auth!.restaurantId };
    if (typeof req.query.status === 'string' && (ORDER_STATUS as readonly string[]).includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: orders });
  }),
);

// GET /api/v1/orders/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.auth!.restaurantId });
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    res.json({ success: true, data: order });
  }),
);

// PATCH /api/v1/orders/:id/status - owner/kitchen drive the state machine
router.patch(
  '/:id/status',
  requireRole('owner', 'kitchen'),
  asyncHandler(async (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed' });
      return;
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }

    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.auth!.restaurantId });
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    const allowed = TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      res.status(409).json({
        success: false,
        error: 'Cannot move order from ' + order.status + ' to ' + parsed.data.status,
      });
      return;
    }
    order.status = parsed.data.status;
    await order.save();
    res.json({ success: true, data: order });
  }),
);

export default router;

