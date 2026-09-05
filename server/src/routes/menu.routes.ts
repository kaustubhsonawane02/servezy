import { Router, type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';
import { requireAuth, subscriptionGuard } from '../middleware/auth';
import { categorySchema, itemSchema, updateCategorySchema, updateItemSchema } from '../validators/menu';

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

// All menu routes: must be authenticated AND on an active trial/subscription
router.use(requireAuth, subscriptionGuard);

// --- Categories ---

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await MenuCategory.find({ tenantId: req.auth!.tenantId }).sort({ displayOrder: 1 });
    res.json({ success: true, data: categories });
  }),
);

router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    const count = await MenuCategory.countDocuments({ tenantId: req.auth!.tenantId });
    const category = await MenuCategory.create({
      ...parsed.data,
      tenantId: req.auth!.tenantId,
      displayOrder: parsed.data.displayOrder ?? count,
    });
    res.status(201).json({ success: true, data: category });
  }),
);

router.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed' });
      return;
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    // tenantId in the filter = the tenancy firewall. A valid id from ANOTHER tenant returns 404, never data.
    const category = await MenuCategory.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.auth!.tenantId },
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

router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    const used = await MenuItem.countDocuments({ tenantId: req.auth!.tenantId, categoryId: req.params.id });
    if (used > 0) {
      res.status(409).json({ success: false, error: 'Category has items. Move or delete them first.' });
      return;
    }
    const category = await MenuCategory.findOneAndDelete({ _id: req.params.id, tenantId: req.auth!.tenantId });
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    res.json({ success: true, data: { message: 'Deleted' } });
  }),
);

// --- Items ---

router.get(
  '/items',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { tenantId: req.auth!.tenantId };
    if (typeof req.query.categoryId === 'string' && mongoose.isValidObjectId(req.query.categoryId)) {
      filter.categoryId = req.query.categoryId;
    }
    if (req.query.available === 'true') filter.isAvailable = true;
    const items = await MenuItem.find(filter).sort({ displayOrder: 1 });
    res.json({ success: true, data: items });
  }),
);

router.post(
  '/items',
  asyncHandler(async (req, res) => {
    const parsed = itemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    // Category must belong to THIS tenant
    const category = await MenuCategory.findOne({ _id: parsed.data.categoryId, tenantId: req.auth!.tenantId });
    if (!category) {
      res.status(400).json({ success: false, error: 'Category not found for this tenant' });
      return;
    }
    const item = await MenuItem.create({ ...parsed.data, tenantId: req.auth!.tenantId });
    res.status(201).json({ success: true, data: item });
  }),
);

router.patch(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed' });
      return;
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.auth!.tenantId },
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

router.delete(
  '/items/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    const item = await MenuItem.findOneAndDelete({ _id: req.params.id, tenantId: req.auth!.tenantId });
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }
    res.json({ success: true, data: { message: 'Deleted' } });
  }),
);

export default router;
