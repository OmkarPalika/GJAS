import mongoose, { Document, Schema } from 'mongoose';

export interface IConstitution extends Document {
  country: string;
  content: string;
  year?: number;
  legal_system?: string;
  region?: string;
  metadata?: any;
}

const constitutionSchema: Schema = new Schema({
  country: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  year: Number,
  legal_system: String,
  region: { type: String, index: true },
  metadata: Schema.Types.Mixed
});

constitutionSchema.index({ content: 'text', country: 'text' });

const Constitution = mongoose.model<IConstitution>('Constitution', constitutionSchema);

export default Constitution;
