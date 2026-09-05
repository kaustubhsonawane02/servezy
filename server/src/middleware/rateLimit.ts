import type { Request, Response, NextFunction } from 'express';

// Simple in-memory sliding window. Fine for dev/single instance;
// swap for a Redis-backed limiter when we scale horizontally.
const hits = new Map<string, number[]>();

export function rateLimit(opts: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
    if (timestamps.length >= opts.max) {
      res.status(429).json({ success: false, error: 'Too many attempts. Try again later.' });
      return;
    }
    timestamps.push(now);
    hits.set(key, timestamps);
    next();
  };
}

// Prune occasionally so the map does not grow forever
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [key, times] of hits) {
    const alive = times.filter((t) => t > cutoff);
    if (alive.length === 0) hits.delete(key);
    else hits.set(key, alive);
  }
}, 5 * 60 * 1000).unref();
