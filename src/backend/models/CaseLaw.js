import mongoose from 'mongoose';

const caseLawSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  court: {
    type: String,
    required: true,
    trim: true
  },
  jurisdiction: {
    type: String,
    required: true,
    trim: true
  },
  decisionDate: {
    type: Date,
    required: true
  },
  legalSystem: {
    type: String,
    enum: ['common_law', 'civil_law', 'islamic_law', 'mixed', 'international'],
    required: true
  },
  citation: {
    type: String,
    trim: true
  },
  summary: {
    type: String,
    trim: true
  },
  fullText: {
    type: String,
    trim: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  parties: [{
    type: String,
    trim: true
  }],
  judges: [{
    type: String,
    trim: true
  }],
  ruling: {
    type: String,
    trim: true
  },
  precedentValue: {
    type: String,
    enum: ['binding', 'persuasive', 'none'],
    default: 'persuasive'
  },
  topics: [{
    type: String,
    trim: true
  }],
  source: {
    type: String,
    trim: true
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
caseLawSchema.index({ jurisdiction: 1 });
caseLawSchema.index({ legalSystem: 1 });
caseLawSchema.index({ decisionDate: -1 });
caseLawSchema.index({ keywords: 1 });
caseLawSchema.index({ topics: 1 });

// Update updatedAt before save
caseLawSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const CaseLaw = mongoose.model('CaseLaw', caseLawSchema);

export default CaseLaw;