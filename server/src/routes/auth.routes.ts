import { Router, type Request, type Response, type NextFunction } from 'express';
import { Tenant } from '../models/Tenant';
import { StaffUser } from '../models/StaffUser';
import { signupSchema, loginSchema, staffLoginSchema } from '../validators/auth';
import { signToken } from '../utils/jwt';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Helper: issue JWT cookie + return raw token (Bearer fallback for kitchen tablet)
function issueSession(
  res: Response,
  sub: string,
  restaurantId: string,
  role: import('../models/types').Role,
): string {
  const token = signToken({ sub, restaurantId, role });
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
}

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

// POST /api/v1/auth/register
// Creates a new restaurant (tenant) + owner StaffUser, starts 14-day trial
router.post(
  '/register',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 signups per IP per 15 min
  asyncHandler(async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const { restaurantName, ownerName, email, password, phone } = parsed.data;

    // Check email uniqueness
    const existing = await Tenant.findOne({ ownerEmail: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    // Unique slug: name → lowercase-kebab + random suffix
    const baseSlug =
      restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'restaurant';
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    const now = new Date();
    const trialDays = env.TRIAL_DAYS;
    const expiresAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const passwordHash = await StaffUser.hashPassword(password);

    // Create tenant (restaurant) — stores owner credentials at tenant level too
    const tenant = await Tenant.create({
      name: restaurantName,
      slug,
      ownerEmail: email.toLowerCase(),
      passwordHash, // owner logs in via this
      subscription: {
        plan: 'trial',
        status: 'trial',
        startedAt: now,
        expiresAt,
      },
    });

    // Create owner StaffUser record (for RBAC and per-restaurant queries)
    const staffUser = await StaffUser.create({
      restaurantId: tenant._id,
      name: ownerName,
      email: email.toLowerCase(),
      passwordHash,
      role: 'owner',
      ...(phone ? { phone } : {}),
    });

    const token = issueSession(res, String(staffUser._id), String(tenant._id), 'owner');

    res.status(201).json({
      success: true,
      data: {
        restaurant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
        },
        user: {
          id: staffUser._id,
          name: staffUser.name,
          role: staffUser.role,
        },
        subscription: {
          status: tenant.subscription.status,
          expiresAt: tenant.subscription.expiresAt,
          trialDays,
        },
        token,
      },
    });
  }),
);

// POST /api/v1/auth/login
// Owner/manager login by email + password
router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed' });
      return;
    }
    const { email, password } = parsed.data;
    const fail = (): void => {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    };

    // Find active staff user by email (owner/manager)
    const user = await StaffUser.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) { fail(); return; }

    const ok = await user.comparePassword(password);
    if (!ok) { fail(); return; }

    const tenant = await Tenant.findById(user.restaurantId);
    if (!tenant || !tenant.isActive) { fail(); return; }

    user.lastLoginAt = new Date();
    await user.save();

    const token = issueSession(res, String(user._id), String(user.restaurantId), user.role);

    res.json({
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        restaurant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          subscription: tenant.subscription,
        },
        token,
      },
    });
  }),
);

// POST /api/v1/auth/staff-login
// Kitchen/billing staff login by restaurantId + PIN (tablet flow)
router.post(
  '/staff-login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
  asyncHandler(async (req, res) => {
    const parsed = staffLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed' });
      return;
    }
    const { restaurantSlug, staffName, pin } = parsed.data;
    const fail = (): void => {
      res.status(401).json({ success: false, error: 'Invalid PIN' });
    };

    const tenant = await Tenant.findOne({ slug: restaurantSlug.toLowerCase() });
    if (!tenant || !tenant.isActive) { fail(); return; }

    // Match by name within the restaurant (kitchen staff don't have emails)
    const user = await StaffUser.findOne({
      restaurantId: tenant._id,
      name: staffName,
      isActive: true,
      role: { $in: ['kitchen', 'billing', 'manager'] },
    });
    if (!user) { fail(); return; }

    const ok = await user.comparePin(pin);
    if (!ok) { fail(); return; }

    user.lastLoginAt = new Date();
    await user.save();

    const token = issueSession(res, String(user._id), String(tenant._id), user.role);

    res.json({
      success: true,
      data: {
        user: { id: user._id, name: user.name, role: user.role },
        restaurant: { id: tenant._id, name: tenant.name, slug: tenant.slug },
        token,
      },
    });
  }),
);

// POST /api/v1/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true, data: { message: 'Logged out' } });
});

// GET /api/v1/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await StaffUser.findById(req.auth!.sub);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Account unavailable' });
      return;
    }
    const tenant = await Tenant.findById(user.restaurantId);
    res.json({
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        restaurant: tenant
          ? {
              id: tenant._id,
              name: tenant.name,
              slug: tenant.slug,
              subscription: tenant.subscription,
              settings: tenant.settings,
            }
          : null,
      },
    });
  }),
);

export default router;
