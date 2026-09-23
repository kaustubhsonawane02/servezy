import rateLimit from 'express-rate-limit';

// General limiter: generous, protects against brute force / abuse
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

// Strict limiter for auth endpoints (login/signup = brute-force targets)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, try again later' },
});
