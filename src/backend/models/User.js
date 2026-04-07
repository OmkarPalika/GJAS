import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['user', 'expert', 'admin'],
    default: 'user'
  },
  legalExpertise: {
    type: [String],
    enum: ['common_law', 'civil_law', 'islamic_law', 'mixed', 'international'],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  profile: {
    firstName: String,
    lastName: String,
    institution: String,
    bio: String
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Generate auth token
userSchema.methods.generateAuthToken = async function() {
  const token = jwt.sign(
    { _id: this._id.toString(), role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  // Update last login
  this.lastLogin = new Date();
  await this.save();
  
  return token;
};

// Check credentials
userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error('Invalid login credentials');
  }
  
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    throw new Error('Invalid login credentials');
  }
  
  return user;
};

// Check password strength
userSchema.methods.hasStrongPassword = function() {
  // At least 8 characters, one uppercase, one lowercase, one number
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return strongPasswordRegex.test(this.password);
};

const User = mongoose.model('User', userSchema);

export default User;