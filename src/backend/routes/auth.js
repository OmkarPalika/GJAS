import express from 'express';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
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
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// User login
router.post('/login', async (req, res) => {
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
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user profile (protected)
router.get('/profile', authMiddleware, async (req, res) => {
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
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['username', 'email', 'password', 'legalExpertise', 'profile'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
      return res.status(400).json({ error: 'Invalid updates!' });
    }
    
    // Handle updates
    updates.forEach(update => req.user[update] = req.body[update]);
    
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
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Logout (blacklist token - would need Redis in production)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // In production, add token to blacklist
    // await addToBlacklist(req.token);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin route to get all users (admin only)
router.get('/users', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const users = await User.find({}, '-password -__v');
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;