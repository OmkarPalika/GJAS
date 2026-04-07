import mongoose from 'mongoose';

const treatySchema = new mongoose.Schema({
  treatyId: {
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
  fullName: {
    type: String,
    trim: true
  },
  shortName: {
    type: String,
    trim: true
  },
  adoptionDate: {
    type: Date
  },
  entryIntoForceDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['in_force', 'signed', 'ratified', 'terminated', 'draft'],
    default: 'in_force'
  },
  parties: [{
    country: String,
    ratificationDate: Date,
    status: String
  }],
  depositary: {
    type: String,
    trim: true
  },
  language: {
    type: String,
    default: 'English'
  },
  topics: [{
    type: String,
    trim: true
  }],
  summary: {
    type: String,
    trim: true
  },
  fullText: {
    type: String,
    trim: true
  },
  articles: [{
    articleNumber: String,
    title: String,
    content: String
  }],
  source: {
    type: String,
    trim: true
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  relatedInstruments: [{
    type: String,
    trim: true
  }],
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
treatySchema.index({ status: 1 });
treatySchema.index({ topics: 1 });
treatySchema.index({ adoptionDate: -1 });
treatySchema.index({ "parties.country": 1 });

// Update updatedAt before save
treatySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Treaty = mongoose.model('Treaty', treatySchema);

export default Treaty;