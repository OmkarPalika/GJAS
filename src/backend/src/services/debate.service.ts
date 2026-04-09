import { MistralAIEmbeddings } from '@langchain/mistralai';
import Message from '@/models/Message.js';
import vectorDBService from '@/services/vector_db.service.js';
import mongoose from 'mongoose';

export interface DebateTurn {
  role: 'agent_a' | 'agent_b';
  perspective: string;
  content: string;
  references: string[];
}

export interface DebateState {
  caseId: string;
  topic: string;
  currentTurn: number;
  maxTurns: number;
  history: DebateTurn[];
  perspectives: {
    agent_a: string;
    agent_b: string;
  };
}

class DebateService {
  private activeDebates: Map<string, DebateState> = new Map();

  async startDebate(caseId: string, topic: string, agentA_perspective: string, agentB_perspective: string, maxTurns: number = 4): Promise<DebateState> {
    const state: DebateState = {
      caseId,
      topic,
      currentTurn: 0,
      maxTurns,
      history: [],
      perspectives: {
        agent_a: agentA_perspective,
        agent_b: agentB_perspective
      }
    };

    this.activeDebates.set(caseId, state);
    return state;
  }

  async processNextTurn(caseId: string): Promise<DebateTurn | null> {
    const state = this.activeDebates.get(caseId);
    if (!state || state.currentTurn >= state.maxTurns) return null;

    const currentAgent = state.currentTurn % 2 === 0 ? 'agent_a' : 'agent_b';
    const currentPerspective = (state.perspectives as any)[currentAgent];
    const opponentTurn = state.history.length > 0 ? state.history[state.history.length - 1] : null;

    // 1. Retrieve legal context for the topic
    const embeddings = new MistralAIEmbeddings();
    const topicEmbedding = await embeddings.embedQuery(state.topic);
    const contextResults = await vectorDBService.query(topicEmbedding, 3);
    const context = contextResults.documents[0].join('\n\n');

    // 2. Formulate prompt for Mistral
    const prompt = `
      You are an AI legal expert participating in a formal judicial debate.
      Topic: ${state.topic}
      Your Identity: ${currentAgent === 'agent_a' ? 'Agent A' : 'Agent B'}
      Your Legal Perspective: ${currentPerspective}
      
      Legal Context (relevant constitutional provisions):
      ${context}
      
      ${opponentTurn ? `Your opponent (${opponentTurn.role}) said: "${opponentTurn.content}"\nCounter-argue based on your perspective and the provided context.` : `Start the debate by presenting your opening argument based on your perspective.`}
      
      Requirements:
      - Be rigorous and use the provided legal context.
      - Maintain your assigned perspective.
      - Keep the tone formal and judicial.
      - Maximum 3 paragraphs.
    `;

    // 3. Call Mistral API
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-medium',
        messages: [
          { role: 'system', content: 'You are a high-level judicial assistant specialized in multi-jurisdictional legal analysis.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;

    const turn: DebateTurn = {
      role: currentAgent as any,
      perspective: currentPerspective,
      content,
      references: contextResults.metadatas[0].map((m: any) => m.country)
    };

    // 4. Save to history and DB
    state.history.push(turn);
    state.currentTurn++;

    const message = new Message({
      caseId: state.caseId,
      senderId: new mongoose.Types.ObjectId(), // Virtual system ID
      content: content,
      messageType: 'argument',
      metadata: {
        legalSystem: currentPerspective,
        references: turn.references
      }
    });
    await message.save();

    return turn;
  }

  getDebateState(caseId: string): DebateState | undefined {
    return this.activeDebates.get(caseId);
  }
}

export const debateService = new DebateService();
export default debateService;
