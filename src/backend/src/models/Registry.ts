import mongoose, { Document, Schema } from 'mongoose';

/**
 * Registry Model
 * Stores jurisdictional data (court names, legal systems, etc.)
 * Previously stored in court_hierarchies.json.
 */
export interface ICourt {
  name: string;
  level: number;
  weight: number;
}

export interface IRegistry extends Document {
  countryCode: string; // e.g. "USA", "IND"
  name: string;
  sys: string;       // e.g. "Common Law"
  category: string;  // e.g. "Presidential Republic"
  investigation: string;
  trial: string;
  appellate: string;
  supreme: string;
  color: string;
  db_query_name?: string;
  simulationWeight: number;
  activeCaseCount: number;
  p5VetoPower?: boolean;
  treatiesRatified?: string[];
  agentMetrics?: {
    casesSolved: number;
    performancePoints: number;
    averageConfidence: number;
  };
  courts: ICourt[];
}

const registrySchema = new Schema({
  countryCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  sys: { type: String, required: true },
  category: { type: String, required: true },
  investigation: { type: String, required: true },
  trial: { type: String, required: true },
  appellate: { type: String, required: true },
  supreme: { type: String, required: true },
  color: { type: String, default: 'text-gray-500' },
  db_query_name: String,
  simulationWeight: { type: Number, default: 70 },
  activeCaseCount: { type: Number, default: 1000 },
  p5VetoPower: { type: Boolean, default: false },
  treatiesRatified: [{ type: String }],
  agentMetrics: {
    casesSolved: { type: Number, default: 0 },
    performancePoints: { type: Number, default: 0 },
    averageConfidence: { type: Number, default: 0 }
  },
  courts: [{
    name: String,
    level: Number,
    weight: Number
  }]
});

const Registry = mongoose.model<IRegistry>('Registry', registrySchema);
export default Registry;
