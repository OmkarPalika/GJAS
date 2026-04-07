import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'argument', 'vote', 'system', 'document'],
    default: 'text'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    confidence: Number,
    references: [String],
    legalSystem: String,
    jurisdiction: String
  },
  reactions: [{
    userId: mongoose.Schema.Types.ObjectId,
    type: String,
    emoji: String
  }]
});

// Create indexes
messageSchema.index({ caseId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;