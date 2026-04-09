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
const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for token in headers
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as DecodedToken;
    
    // Find user
    const user = await User.findById(decoded._id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Role-based access control
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

// Admin-only middleware
const adminMiddleware = roleMiddleware(['admin']);

// Legal expert middleware
const expertMiddleware = roleMiddleware(['admin', 'expert']);

export { authMiddleware, adminMiddleware, expertMiddleware };