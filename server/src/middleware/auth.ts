import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../utils/jwt';
import { Tenant, type ITenant } from '../models/Tenant';
import type { Role } from '../models/types';

// Augment Express Request with our auth context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      tenant?: ITenant;
    }
  }
}

function extractToken(req: Request): string | null {
  // 1) Cookie (browser flow)
  if (req.cookies?.token && typeof req.cookies.token === 'string') {
    return req.cookies.token;
  }
  // 2) Authorization header (kitchen tablet / API clients)
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return null;
}

// Verifies JWT, attaches auth context. Use on every protected route.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// Must run AFTER requireAuth. Restricts to given roles.
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

// Loads the tenant doc and checks subscription status.
// - Active trial → pass through
// - Active paid plan → pass through
// - Expired/suspended → 402
export async function subscriptionGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  // Superadmin bypasses the subscription check
  if (req.auth.role === 'superadmin') {
    next();
    return;
  }

  const tenant = await Tenant.findById(req.auth.restaurantId);
  if (!tenant || !tenant.isActive) {
    res.status(403).json({ success: false, error: 'Tenant unavailable' });
    return;
  }

  const { status } = tenant.subscription;
  if (status === 'expired' || status === 'suspended') {
    res.status(402).json({
      success: false,
      error: status === 'expired' ? 'Trial expired. Please subscribe.' : 'Account suspended.',
    });
    return;
  }

  req.tenant = tenant;
  next();
}
