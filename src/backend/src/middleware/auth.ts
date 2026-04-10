import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUserDocument } from '@/models/User.js';

// Extend Express Request type
export interface AuthRequest extends Request {
  user?: IUserDocument;
  token?: string;
}

interface DecodedToken {
  _id: string;
  role: string;
  iat: number;
  exp: number;
}

// Authentication middleware
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('FATAL: JWT_SECRET is not defined.');
      return res.status(500).json({ error: 'Server security configuration error' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Role-based access control — standalone, does NOT include authMiddleware
const roleMiddleware = (requiredRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Compose multiple middlewares into a single RequestHandler.
 * Ensures authMiddleware always runs first in role-protected routes.
 */
function composeMiddleware(
  ...mws: Array<(req: Request, res: Response, next: NextFunction) => void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const execute = (index: number) => {
      if (index >= mws.length) return next();
      mws[index](req, res, (err?: any) => {
        if (err) return next(err);
        execute(index + 1);
      });
    };
    execute(0);
  };
}

// Admin-only middleware (includes JWT verification)
export const adminMiddleware = composeMiddleware(authMiddleware, roleMiddleware(['admin']));

// Legal expert middleware (includes JWT verification)
export const expertMiddleware = composeMiddleware(authMiddleware, roleMiddleware(['admin', 'expert']));