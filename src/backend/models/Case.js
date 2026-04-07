import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'archived'],
    default: 'open'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  legalSystem: {
    type: String,
    enum: ['common_law', 'civil_law', 'islamic_law', 'mixed', 'international']
  },
  jurisdiction: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  documents: [{
    type: String,
    trim: true
  }],
  currentStep: {
    type: String,
    enum: ['retrieval', 'analysis', 'deliberation', 'voting', 'conclusion'],
    default: 'retrieval'
  }
});

// Update updatedAt before save
caseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Case = mongoose.model('Case', caseSchema);

export default Case;