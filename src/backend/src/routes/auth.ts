import express, { Response } from 'express';
import User from '@/models/User.js';
import { authMiddleware, AuthRequest } from '@/middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// User registration
router.post('/register', async (req: express.Request, res: Response) => {
  try {
    const { username, email, password, role = 'user', legalExpertise = [] } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Create user
    const user = new User({ username, email, password, role, legalExpertise });
    
    // Check password strength
    if (!user.hasStrongPassword()) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      });
    }
    
    await user.save();
    
    // Generate token
    const token = await user.generateAuthToken();
    
    res.status(201).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        legalExpertise: user.legalExpertise
      },
      token
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// User login
router.post('/login', async (req: express.Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by credentials
    const user = await User.findByCredentials(email, password);
    
    // Generate token
    const token = await user.generateAuthToken();
    
    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        legalExpertise: user.legalExpertise,
        lastLogin: user.lastLogin
      },
      token
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get user profile (protected)
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'User not found in request' });
  
  res.json({
    _id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    legalExpertise: req.user.legalExpertise,
    createdAt: req.user.createdAt,
    lastLogin: req.user.lastLogin,
    profile: req.user.profile
  });
});

// Update user profile (protected)
router.patch('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User not found in request' });
    
    const updates = Object.keys(req.body);
    const allowedUpdates = ['username', 'email', 'password', 'legalExpertise', 'profile'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
      return res.status(400).json({ error: 'Invalid updates!' });
    }
    
    // Handle updates
    updates.forEach(update => (req.user as any)[update] = req.body[update]);
    
    // Special handling for password
    if (req.body.password) {
      if (!req.user.hasStrongPassword()) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
        });
      }
    }
    
    await req.user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        legalExpertise: req.user.legalExpertise
      }
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Logout (blacklist token - would need Redis in production)
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin route to get all users (admin only)
router.get('/users', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User not found in request' });
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const users = await User.find({}, '-password -__v');
    
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password - Generate token and log it (as discussed)
router.post('/forgot-password', async (req: express.Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if user exists. Return generic success.
      return res.json({ message: 'If an account exists, a reset link has been generated.' });
    }

    // Generate token
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    
    await user.save();

    console.log('\n=======================================');
    console.log('PASSWORD RESET LINK GENERATED');
    console.log(`User: ${user.email}`);
    console.log(`Token: ${token}`);
    console.log(`URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`);
    console.log('=======================================\n');

    res.json({ message: 'If an account exists, a reset link has been generated.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req: express.Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'New password is required' });

    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    if (!user.hasStrongPassword()) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      });
    }

    await user.save();
    res.json({ message: 'Password has been reset successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;