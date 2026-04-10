export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  limit?: number;
  skip?: number;
}

export interface Constitution {
  _id: string;
  country: string;
  fileName: string;
  text: string;
  metadata: {
    country: string;
    legal_system: string;
    year?: number;
  };
}

export interface CaseLaw {
  caseId: string;
  title: string;
  court: string;
  jurisdiction: string;
  decisionDate: string;
  legalSystem: string;
  summary?: string;
  keywords?: string[];
  topics?: string[];
}

export interface Treaty {
  treatyId: string;
  title: string;
  fullName?: string;
  status: string;
  adoptionDate?: string;
  entryIntoForceDate?: string;
  parties?: Array<{
    country: string;
    ratificationDate?: string;
    status?: string;
  }>;
  topics?: string[];
  summary?: string;
}

export interface RAGSearchResult {
  text: string;
  similarity: number;
  courtWeight: number;
  weightedSimilarity: number;
  legalSystem: string;
  metadata: {
    country: string;
    legal_system: string;
    fileName: string;
  };
}

export interface RAGResponse {
  results: RAGSearchResult[];
  cached: boolean;
  diversityScore: number;
  legalSystemsRepresented: string[];
  biasMitigationPrompt: string;
  metadata: {
    timestamp: string;
    resultsCount: number;
    queryLength: number;
  };
}

export interface CollaborativeMessage {
  caseId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'argument' | 'vote' | 'system' | 'document';
  createdAt: string;
  metadata?: {
    confidence?: number;
    references?: string[];
    legalSystem?: string;
    jurisdiction?: string;
  };
}

export interface DynamicEdgeCase {
  nodeId: string;
  type: string;
  description: string;
  resolved: boolean;
  userInterventionText?: string;
  timestamp: string;
}

export interface CollaborativeCase {
  _id: string;
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'archived' | 'investigation' | 'trial' | 'appellate' | 'supreme' | 'assembly' | 'executive_review' | 'complete';
  participants: string[];
  createdAt: string;
  updatedAt: string;
  legalSystem?: string;
  jurisdiction?: string;
  currentStep?: string;
  edgeCaseLog?: DynamicEdgeCase[];
  caseType?: string;
  pipelines: Record<string, {
    nodes: Record<string, {
      status: string;
      verdict?: { decision: string; sentenceOrRemedy?: string };
    }>;
    finalVerdict?: { decision: string; sentenceOrRemedy?: string };
    executiveReview?: { status: string; reasoning?: string };
  }>;
  iccProceedings?: {
    status: string;
    reasoning?: string;
    verdict?: { decision: string; sentenceOrRemedy?: string };
  };
}