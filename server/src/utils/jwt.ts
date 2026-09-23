import jwt from 'jsonwebtoken';
import type { Role } from '../models/types';

export interface JwtPayload {
  sub: string;          // staffUser _id (or tenantId for owner-level token)
  restaurantId: string;
  role: Role;
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
}
