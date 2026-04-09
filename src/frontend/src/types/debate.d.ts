export interface DebateTurn {
  role: 'agent_a' | 'agent_b';
  perspective: string;
  content: string;
  references: string[];
}

export interface DebateState {
  caseId: string;
  topic: string;
  title?: string;
  status?: string;
  currentTurn: number;
  maxTurns: number;
  history: DebateTurn[];
  perspectives: {
    agent_a: string;
    agent_b: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalAssembly?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iccProceedings?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipelines?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ombudsmanReports?: any[];
}

export interface DebateStartedEvent {
  caseId: string;
  topic: string;
  state: DebateState;
}

export interface DebateTurnEvent {
  caseId: string;
  turn: DebateTurn;
  state: DebateState;
}
