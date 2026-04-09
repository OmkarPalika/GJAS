export interface Court {
  name: string;
  level: number;
  weight: number;
}

export interface CourtHierarchy {
  country: string;
  courts: Court[];
  legal_system?: string;
}

export interface VectorMetadata {
  country: string;
  legal_system: string;
  [key: string]: any;
}

export interface VectorItem {
  embedding: number[];
  text: string;
  metadata: VectorMetadata;
}

export interface RagResult extends VectorItem {
  similarity: number;
  courtWeight: number;
  legalSystem?: string;
  weightedSimilarity?: number;
  originalSimilarity?: number;
}

export interface PerspectiveAnalysis {
  legalSystem: string;
  relevantProvisions: number;
  keyFindings: Array<{
    country: string;
    courtWeight: number;
    similarity: number;
    textPreview: string;
  }>;
  interpretation: string;
}

export interface Recommendation {
  type: string;
  message: string;
  confidence: 'high' | 'medium' | 'low';
}
