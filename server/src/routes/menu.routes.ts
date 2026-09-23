import { Router, type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';
import { requireAuth, requireRole, subscriptionGuard } from '../middleware/auth';
import { categorySchema, itemSchema, updateCategorySchema, updateItemSchema } from '../validators/menu';
import { getIO } from '../socket';

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

// All menu management routes: must be authenticated AND on active plan
router.use(requireAuth, subscriptionGuard);

// --- Categories ---

// GET /api/v1/menu/categories
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await MenuCategory.find({ restaurantId: req.auth!.restaurantId }).sort({ sortOrder: 1, name: 1 });
    res.json({ success: true, data: categories });
  }),
);

// POST /api/v1/menu/categories
router.post(
  '/categories',
  requireRole('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    const count = await MenuCategory.countDocuments({ restaurantId: req.auth!.restaurantId });
    const category = await MenuCategory.create({
      ...parsed.data,
      restaurantId: req.auth!.restaurantId,
      sortOrder: parsed.data.sortOrder ?? count,
    });
    res.status(201).json({ success: true, data: category });
  }),
);

// PATCH /api/v1/menu/categories/:id
router.patch(
  '/categories/:id',
  requireRole('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    const category = await MenuCategory.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.auth!.restaurantId },
      parsed.data,
      { new: true, runValidators: true },
    );
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    res.json({ success: true, data: category });
  }),
);

// DELETE /api/v1/menu/categories/:id
router.delete(
  '/categories/:id',
  requireRole('owner', 'manager'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    const used = await MenuItem.countDocuments({
      restaurantId: req.auth!.restaurantId,
      categoryId: req.params.id,
      isActive: true,
    });
    if (used > 0) {
      res.status(409).json({ success: false, error: 'Category has active items. Move or delete them first.' });
      return;
    }
    const category = await MenuCategory.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.auth!.restaurantId,
    });
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    res.json({ success: true, data: { message: 'Deleted' } });
  }),
);

// --- Items ---

// GET /api/v1/menu/items
router.get(
  '/items',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {
      restaurantId: req.auth!.restaurantId,
      isActive: true,
    };
    if (typeof req.query.categoryId === 'string' && mongoose.isValidObjectId(req.query.categoryId)) {
      filter.categoryId = req.query.categoryId;
    }
    if (req.query.inStock === 'true') filter.inStock = true;
    const items = await MenuItem.find(filter).sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, data: items });
  }),
);

// POST /api/v1/menu/items
router.post(
  '/items',
  requireRole('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const parsed = itemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    // Category must belong to THIS restaurant
    const category = await MenuCategory.findOne({
      _id: parsed.data.categoryId,
      restaurantId: req.auth!.restaurantId,
    });
    if (!category) {
      res.status(400).json({ success: false, error: 'Category not found for this restaurant' });
      return;
    }
    const item = await MenuItem.create({ ...parsed.data, restaurantId: req.auth!.restaurantId });
    res.status(201).json({ success: true, data: item });
  }),
);

// PATCH /api/v1/menu/items/:id
router.patch(
  '/items/:id',
  requireRole('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.auth!.restaurantId, isActive: true },
      parsed.data,
      { new: true, runValidators: true },
    );
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }
    res.json({ success: true, data: item });
  }),
);

// DELETE /api/v1/menu/items/:id — soft-delete only (never hard-delete items with order history)
router.delete(
  '/items/:id',
  requireRole('owner', 'manager'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.auth!.restaurantId, isActive: true },
      { isActive: false },
      { new: true },
    );
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }
    res.json({ success: true, data: { message: 'Item deactivated' } });
  }),
);

// PATCH /api/v1/menu/items/:id/stock — toggle inStock; emits 'menu_updated' via Socket.io
router.patch(
  '/items/:id/stock',
  requireRole('owner', 'manager'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    const item = await MenuItem.findOne({
      _id: req.params.id,
      restaurantId: req.auth!.restaurantId,
      isActive: true,
    });
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }
    item.inStock = !item.inStock;
    await item.save();

    // Broadcast to customer menu in real time (all connections viewing this restaurant's menu)
    try {
      const io = getIO();
      io.to(`restaurant_${req.auth!.restaurantId}`).emit('menu_updated', {
        itemId: item._id,
        inStock: item.inStock,
      });
    } catch {
      // Socket.io not yet initialized in tests — non-fatal
    }

    res.json({ success: true, data: { id: item._id, inStock: item.inStock } });
  }),
);

export default router;
