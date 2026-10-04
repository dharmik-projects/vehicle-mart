import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

// Short-TTL in-process cache for the authenticated user lookup: every API
// request used to pay a MongoDB round trip + network hop just to re-fetch
// the same user document. Entries expire quickly so role/isActive changes
// propagate almost immediately; misses (user not found) are never cached.
const USER_CACHE_TTL_MS = 15000;
const USER_CACHE_MAX_SIZE = 5000;
const userCache = new Map<string, { user: any; expires: number }>();

/** Drop one cached user (by id) or the whole cache when no id is given. */
export const clearUserCache = (id?: string): void => {
  if (id !== undefined) {
    userCache.delete(String(id));
    return;
  }
  userCache.clear();
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Access token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Cache hit → skip the DB round trip; miss → existing lookup, store result
    const cacheKey = String(decoded.userId);
    const cached = userCache.get(cacheKey);
    let user;
    if (cached && cached.expires > Date.now()) {
      user = cached.user;
    } else {
      user = await User.findById(decoded.userId).select('-password -refreshToken');
      if (user) {
        if (userCache.size > USER_CACHE_MAX_SIZE) userCache.clear();
        userCache.set(cacheKey, { user, expires: Date.now() + USER_CACHE_TTL_MS });
      } else {
        userCache.delete(cacheKey); // drop any stale entry; never cache misses
      }
    }

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Account is deactivated' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token expired' });
      return;
    }
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const user = await User.findById(decoded.userId).select('-password -refreshToken');
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch {
    // ignore
  }
  next();
};
