import { Router, type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order, type IOrderItem } from '../models/Order';
import { MenuItem } from '../models/MenuItem';
import { requireAuth, requireRole, subscriptionGuard } from '../middleware/auth';
import { createOrderSchema, updateStatusSchema } from '../validators/order';

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

// Legal transitions of the order state machine
const TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
  served: [],
  cancelled: [],
};

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
    const dbItems = await MenuItem.find({ _id: { $in: ids }, tenantId: req.auth!.tenantId, isAvailable: true });
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
        nameSnapshot: menu.name,
        priceSnapshot: menu.price,
        quantity: line.quantity,
      });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.priceSnapshot * i.quantity, 0);
    const tax = 0; // pluggable later: per-tenant tax rate
    const total = subtotal + tax;

    // Atomic order-number allocation within a transaction
    const order = await mongoose.connection.transaction(async (session) => {
      const last = await Order.findOne({ tenantId: req.auth!.tenantId })
        .sort({ orderNumber: -1 })
        .select('orderNumber')
        .session(session);
      const nextNumber = (last?.orderNumber ?? 0) + 1;
      return Order.create(
        [
          {
            tenantId: req.auth!.tenantId,
            orderNumber: nextNumber,
            status: 'pending',
            items: orderItems,
            subtotal,
            tax,
            total,
            tableNumber,
            customerName,
            customerPhone,
            notes,
            placedBy: req.auth!.sub,
          },
        ],
        { session },
      );
    });

    res.status(201).json({ success: true, data: order[0] ?? order });
  }),
);

// GET /api/v1/orders?status=&limit= - newest first
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { tenantId: req.auth!.tenantId };
    if (typeof req.query.status === 'string' && ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'].includes(req.query.status)) {
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
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.auth!.tenantId });
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

    const order = await Order.findOne({ _id: req.params.id, tenantId: req.auth!.tenantId });
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

