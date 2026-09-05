import { Router, type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { signupSchema, loginSchema } from '../validators/auth';
import { signToken } from '../utils/jwt';
import { env } from '../config/env';
import type { Role } from '../models/types';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';


const router = Router();

// Helper: set the JWT in an HTTP-only cookie AND return it (Bearer fallback for kitchen tablet)
function issueSession(res: Response, userId: string, tenantId: string, role: Role): string {
  const token = signToken({ sub: userId, tenantId: tenantId, role: role });
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
}

// Wrap async handlers so rejections reach the central error handler
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

// POST /api/v1/auth/signup - creates tenant + owner in one transaction, starts trial
router.post(
  '/signup',
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
    const input = parsed.data;

    // Unique slug: name, lowercased, non-alphanumerics dashed, random suffix
    const baseSlug =
      input.restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'restaurant';
    const slug = baseSlug + '-' + Math.random().toString(36).slice(2, 7);

    const trialEndsAt = new Date(Date.now() + env.TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const session = await mongoose.startSession();
    try {
      let tenantId: mongoose.Types.ObjectId | undefined;
      let userId: mongoose.Types.ObjectId | undefined;

      await session.withTransaction(async () => {
        const passwordHash = await User.hashPassword(input.password);

        const [tenant] = await Tenant.create(
          [
            {
              name: input.restaurantName,
              slug: slug,
              email: input.email,
              phone: input.phone,
              trialStartedAt: new Date(),
              trialEndsAt: trialEndsAt,
            },
          ],
          { session },
        );
        tenantId = tenant!._id;


        const [user] = await User.create(
          [
            {
              tenantId: tenant!._id,
              name: input.ownerName,
              email: input.email,
              passwordHash: passwordHash,
              role: 'owner',
            },
          ],
          { session },
        );
        userId = user!._id;
      });

      if (!tenantId || !userId) {
        res.status(500).json({ success: false, error: 'Signup failed' });
        return;
      }

      const token = issueSession(res, userId.toString(), tenantId.toString(), 'owner');

      res.status(201).json({
        success: true,
        data: {
          tenant: { id: tenantId.toString(), name: input.restaurantName, slug: slug },
          trialEndsAt: trialEndsAt.toISOString(),
          token: token,
        },
      });
    } finally {
      await session.endSession();
    }
  }),
);

// POST /api/v1/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
      res.status(400).json({ success: false, error: 'Validation failed' });
      return;
    }
    const input = parsed.data;

    // Deliberately vague on failure: never reveal whether email or password was wrong
    const fail = (): void => {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    };

    const user = await User.findOne({ email: input.email.toLowerCase(), isActive: true });
    if (!user) {
      fail();
      return;
    }

    const ok = await user.comparePassword(input.password);
    if (!ok) {
      fail();
      return;
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || !tenant.isActive) {
      fail();
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = issueSession(res, user._id.toString(), user.tenantId.toString(), user.role);

    res.json({
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        tenant: { id: tenant._id, name: tenant.name, slug: tenant.slug },
        token: token,
      },
    });
  }),
);

// POST /api/v1/auth/logout - clears the cookie
router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true, data: { message: 'Logged out' } });
});

// GET /api/v1/auth/me - session introspection for the frontend
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth!.sub);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Account unavailable' });
      return;
    }
    const tenant = await Tenant.findById(user.tenantId);
    res.json({
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        tenant: tenant ? { id: tenant._id, name: tenant.name, slug: tenant.slug, trialEndsAt: tenant.trialEndsAt } : null,
      },
    });
  }),
);

export default router;
