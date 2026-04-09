import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  caseId: string;
  senderId: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'argument' | 'vote' | 'system' | 'document';
  createdAt: Date;
  metadata?: {
    confidence?: number;
    references?: string[];
    legalSystem?: string;
    jurisdiction?: string;
  };
  reactions: Array<{
    userId: mongoose.Types.ObjectId;
    type: string;
    emoji: string;
  }>;
}

const messageSchema: Schema = new Schema({
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

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;