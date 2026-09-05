import { Router, type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { Tenant } from '../models/Tenant';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';
import { Order } from '../models/Order';
import { publicOrderSchema } from '../validators/publicOrder';

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

// Unauthenticated surface -> strict limiter: 20 writes / 10 min / IP
const publicOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Try again later.' },
});

// Resolve tenant by slug; gate on active + trial
router.use(
  '/:slug',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const slug = req.params.slug;
    if (typeof slug !== 'string') {
      res.status(404).json({ success: false, error: 'Restaurant not found' });
      return;
    }
    const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (!tenant || !tenant.isActive) {
      res.status(404).json({ success: false, error: 'Restaurant not found' });
      return;
    }
    if (tenant.trialEndsAt && tenant.trialEndsAt.getTime() < Date.now()) {
      res.status(403).json({ success: false, error: 'This restaurant is not accepting orders' });
      return;
    }
    res.locals.tenantId = String(tenant._id);
    next();
  }),
);

// GET /api/v1/public/:slug/menu - customer's phone
router.get(
  '/:slug/menu',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = res.locals.tenantId;
    const categories = await MenuCategory.find({ tenantId }).sort({ displayOrder: 1, name: 1 });
    const items = await MenuItem.find({ tenantId, isAvailable: true }).sort({ displayOrder: 1, name: 1 });
    res.json({
      success: true,
      data: {
        restaurant: { name: req.params.slug },
        categories,
        items,
      },
    });
  }),
);

// POST /api/v1/public/:slug/table/:tableNumber/order - QR ordering
router.post(
  '/:slug/table/:tableNumber/order',
  publicOrderLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = publicOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const tenantId = res.locals.tenantId;
    const { items, customerName, notes } = parsed.data;
    const tableNumber = req.params.tableNumber;

    // Re-price from DB; only available items of THIS tenant
    const ids = items.map((i) => new mongoose.Types.ObjectId(i.itemId));
    const dbItems = await MenuItem.find({ _id: { $in: ids }, tenantId, isAvailable: true });
    const byId = new Map(dbItems.map((d) => [String(d._id), d]));

    const orderItems = [];
    for (const line of items) {
      const menu = byId.get(line.itemId);
      if (!menu) {
        res.status(400).json({ success: false, error: 'Item unavailable: ' + line.itemId });
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
    const tax = 0;
    const total = subtotal + tax;

    const last = await Order.findOne({ tenantId }).sort({ orderNumber: -1 }).select('orderNumber');
    const order = await Order.create({
      tenantId,
      orderNumber: (last?.orderNumber ?? 0) + 1,
      status: 'pending', // staff must confirm; customer orders never skip the queue
      items: orderItems,
      subtotal,
      tax,
      total,
      tableNumber,
      customerName,
      notes,
      placedBy: tenantId, // system-placed; refine when staff users are linked
    });

    res.status(201).json({
      success: true,
      data: { orderNumber: order.orderNumber, status: order.status, total: order.total },
    });
  }),
);

export default router;
