import mongoose, { Document, Schema } from 'mongoose';

export interface IEvidence {
  _id?: mongoose.Types.ObjectId;
  title: string;
  rawText: string;
  type: string;
  dateAdded: Date;
}

export interface IEdgeCaseEvent {
  nodeId: string; // e.g., 'USA-trial'
  type: 'LAWYER_WITHDRAWAL' | 'HOSTILE_WITNESS' | 'NEW_EVIDENCE' | 'AGENCY_ESCALATION' | 'CONFLICT_OF_INTEREST' | 'MISTRIAL' | 'DISCOVERY_REQUEST' | 'GLOBAL_ESCALATION' | 'JURISDICTIONAL_VOID' | 'DATA_SOVEREIGNTY_BLOCK' | 'SOVEREIGN_IMMUNITY' | 'EXTRATERRITORIAL_OVERREACH';
  description: string;
  resolved: boolean;
  userInterventionText?: string;
  timestamp: Date;
}

export interface IOmbudsmanReport {
  nodeId: string;
  critique: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface IVerdict {
  decision: string; // e.g., 'Guilty', 'Not Guilty', 'Overturned', 'Upheld'
  sentenceOrRemedy?: string;
  majorityRatio?: string; // e.g., '5-4'
}

export interface INodeResult {
  status: 'pending' | 'deliberating' | 'complete' | 'edge_case' | 'failed';
  verdict?: IVerdict;
  reasoning?: string;
  dissentingReasoning?: string;
  legalReferences?: string[];
  agentsInvolved: string[]; // Agent persona names/roles
  dissentingAgents?: string[];
  startedAt?: Date;
  completedAt?: Date;
  thinkingLog?: string;
}

export interface ICountryPipeline {
  country: string;
  legalSystem: string;
  nodes: {
    investigation: INodeResult;
    trial: INodeResult;
    appellate: INodeResult;
    supreme: INodeResult;
  };
  finalVerdict?: IVerdict;
  executiveReview?: {
    status: 'pending' | 'granted' | 'denied' | 'none';
    reasoning?: string;
  };
  corrections?: {
    status: string;
    inmateId?: string;
    paroleEligibility?: string;
  };
}

export interface ICase extends Document {
  title: string;
  facts: string;
  caseType: 'criminal' | 'civil' | 'constitutional';
  status: 'investigation' | 'trial' | 'appellate' | 'supreme' | 'assembly' | 'executive_review' | 'corrections' | 'complete';
  evidence: IEvidence[];
  parties: {
    prosecution: string;
    defense: string;
    accused: string;
    isPublicDefender: boolean;
  };
  participants: mongoose.Types.ObjectId[];
  pipelines: Map<string, ICountryPipeline>;
  globalAssembly?: {
    status: 'pending' | 'deliberating' | 'complete' | 'failed';
    synthesisReasoning?: string;
    finalGlobalJudgement?: string;
  };
  iccProceedings?: {
    status: 'pending' | 'deliberating' | 'complete' | 'failed';
    verdict?: IVerdict;
    reasoning?: string;
  };
  edgeCaseLog: IEdgeCaseEvent[];
  ombudsmanReports: IOmbudsmanReport[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  tags: string[];
}

const NodeResultSchema = new Schema({
  status: { type: String, enum: ['pending', 'deliberating', 'complete', 'edge_case', 'failed'], default: 'pending' },
  verdict: {
    decision: String,
    sentenceOrRemedy: String,
    majorityRatio: String
  },
  reasoning: String,
  dissentingReasoning: String,
  legalReferences: [String],
  agentsInvolved: [String],
  dissentingAgents: [String],
  startedAt: Date,
  completedAt: Date,
  thinkingLog: String
}, { _id: false });

const CountryPipelineSchema = new Schema({
  country: { type: String, required: true },
  legalSystem: { type: String, required: true },
  nodes: {
    investigation: { type: NodeResultSchema, default: () => ({ status: 'pending' }) },
    trial: { type: NodeResultSchema, default: () => ({ status: 'pending' }) },
    appellate: { type: NodeResultSchema, default: () => ({ status: 'pending' }) },
    supreme: { type: NodeResultSchema, default: () => ({ status: 'pending' }) }
  },
  finalVerdict: {
    decision: String,
    sentenceOrRemedy: String,
    majorityRatio: String
  },
  executiveReview: {
    status: { type: String, enum: ['pending', 'granted', 'denied', 'none'], default: 'none' },
    reasoning: String
  },
  corrections: {
    status: String,
    inmateId: String,
    paroleEligibility: String
  }
}, { _id: false });

const caseSchema: Schema = new Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  facts: { type: String, required: true, trim: true },
  caseType: { type: String, enum: ['criminal', 'civil', 'constitutional'], default: 'criminal' },
  status: { type: String, enum: ['investigation', 'trial', 'appellate', 'supreme', 'assembly', 'executive_review', 'corrections', 'complete'], default: 'investigation' },
  evidence: [{
    title: String,
    rawText: String,
    type: String,
    dateAdded: { type: Date, default: Date.now }
  }],
  parties: {
    prosecution: { type: String, required: true },
    defense: { type: String, required: true },
    accused: { type: String, required: true },
    isPublicDefender: { type: Boolean, default: false }
  },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pipelines: {
    type: Map,
    of: CountryPipelineSchema,
    default: () => new Map()
  },
  globalAssembly: {
    status: { type: String, enum: ['pending', 'deliberating', 'complete', 'failed'] },
    synthesisReasoning: String,
    finalGlobalJudgement: String
  },
  iccProceedings: {
    status: { type: String, enum: ['pending', 'deliberating', 'complete', 'failed'] },
    verdict: {
      decision: String,
      sentenceOrRemedy: String
    },
    reasoning: String
  },
  edgeCaseLog: [{
    nodeId: String,
    type: { type: String, enum: ['LAWYER_WITHDRAWAL', 'HOSTILE_WITNESS', 'NEW_EVIDENCE', 'AGENCY_ESCALATION', 'CONFLICT_OF_INTEREST', 'MISTRIAL', 'DISCOVERY_REQUEST', 'GLOBAL_ESCALATION', 'JURISDICTIONAL_VOID', 'DATA_SOVEREIGNTY_BLOCK', 'SOVEREIGN_IMMUNITY', 'EXTRATERRITORIAL_OVERREACH'] },
    description: String,
    resolved: { type: Boolean, default: false },
    userInterventionText: String,
    timestamp: { type: Date, default: Date.now }
  }],
  ombudsmanReports: [{
    nodeId: String,
    critique: String,
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    timestamp: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String, trim: true }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

caseSchema.pre('save', function(this: any) {
  this.updatedAt = new Date();
});

const Case = mongoose.model<ICase>('Case', caseSchema);
export default Case;