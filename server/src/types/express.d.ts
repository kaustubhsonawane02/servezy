import type { AuthPayload } from '../middleware/requireAuth.placeholder';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth (staff routes). */
      auth?: AuthPayload;
      /** Set by resolveTenant (public routes). */
      tenant?: { _id: string; slug: string };
    }
  }
}

export {};
