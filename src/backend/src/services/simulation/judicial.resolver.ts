import Case, { ICase, INodeResult } from '@/models/Case.js';
import corpusLoader from '@/services/simulation/corpus.js';
import Registry from '@/models/Registry.js';
import { sharedQueue, RequestQueue } from '@/services/simulation/request_queue.js';
import type { CourtLevel, CountryCode } from '@/services/simulation.service.js';
import { getWsServer } from '@/services/websocket.js';
import { SIMULATION_CONFIG } from '@/config/simulation.config.js';

const MISTRAL_API = SIMULATION_CONFIG.MISTRAL_API_URL;
const MISTRAL_KEY = () => process.env.MISTRAL_API_KEY;

export class JudicialResolver {
  constructor(public queue: RequestQueue) {}

  // --- Core Node Resolution ---

  async resolveNode(
    caseId: string,
    country: CountryCode,
    nodeLevel: CourtLevel,
    factsEmbedding?: number[]
  ): Promise<INodeResult | null> {
    const version = this.queue.queueVersion;
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) throw new Error('Case not found');

    const registry = await Registry.findOne({ countryCode: country });
    if (!registry) throw new Error(`Registry for ${country} not found`);

    const pipeline = caseDoc.pipelines.get(country);
    if (!pipeline) throw new Error(`Pipeline for ${country} not initialized`);

    const node = pipeline.nodes[nodeLevel];
    if (node.status === 'complete') return node;

    const nodeId = `${country}-${nodeLevel}`;
    if (this.queue.queuedNodes.has(nodeId)) return node;
    this.queue.queuedNodes.add(nodeId);

    // CRITICAL 2.1 FIX: Mark as deliberating instantly so the Orchestrator stops re-dispatching
    await Case.updateOne(
      { _id: caseId },
      { $set: { [`pipelines.${country}.nodes.${nodeLevel}.status`]: 'deliberating' } }
    );

    const existingEdgeCase = caseDoc.edgeCaseLog.find(e => e.nodeId === nodeId);
    let advocateInputContext = '';

    if (existingEdgeCase) {
      if (!existingEdgeCase.resolved) {
        await Case.updateOne(
          { _id: caseId },
          { $set: { [`pipelines.${country}.nodes.${nodeLevel}.status`]: 'edge_case' } }
        );
        return node;
      } else if (existingEdgeCase.userInterventionText) {
        advocateInputContext = `\n\n### USER ADVOCATE INTERVENTION\nDuring this phase, an edge case occurred (${existingEdgeCase.type}). The user advocate provided this critical instruction:\n"${existingEdgeCase.userInterventionText}"`;
      }
    }

    const legalContext = await corpusLoader.getLegalContext(country, nodeLevel, caseDoc.facts, factsEmbedding);
    let prompt = this.buildPrompt(caseDoc, country, nodeLevel, legalContext);
    if (advocateInputContext) prompt += advocateInputContext;

    return this.queue.enqueue(
      async () => {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 300s safety timeout

        try {
          console.log(`[${new Date().toLocaleTimeString()}] [Judicial|Start] Resolving ${country} (${nodeLevel})...`);
          const response = await fetch(MISTRAL_API, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY()}` },
            body: JSON.stringify({
              model: SIMULATION_CONFIG.MODELS.JUDICIAL,
              messages: [
                {
                  role: 'system',
                  content: this.getSystemPrompt(country, nodeLevel, caseDoc, nodeId, registry) +
                    '\n\nSTRICT REQUIREMENT: Verify your own legal logic before outputting JSON. Ensure the JSON is structurally valid.'
                },
                { role: 'user', content: prompt }
              ],
              response_format: { type: 'json_object' },
              frequency_penalty: 0.2
            })
          });

          if (!response.ok) {
            const err = await response.text();
            console.error(`[Mistral|API Error] ${country}-${nodeLevel}:`, err);
            throw new Error(`LLM API failed: ${response.status}`);
          }

          const data = await response.json();
          const rawContent = data.choices[0].message.content;

          let resultJson;
          try {
            resultJson = RequestQueue.robustJsonParse(rawContent);
          } catch {
            console.warn(`[Retry|JSON] Invalid JSON from LLM. Retrying once.`);
            return this.handleRetry(caseId, country, nodeLevel, prompt, 'The judge outputted unparseable JSON.', version, nodeId, caseDoc, legalContext);
          }

          // Clerk anti-hallucination check
          const verification = await this.verifyWithClerk(resultJson, legalContext, caseDoc.facts);
          if (!verification.valid) {
            console.warn(`[Clerk Intervention] Node ${nodeId} flagged. Retrying once...`);
            return this.handleRetry(caseId, country, nodeLevel, prompt, verification.critique || 'Problematic logic detected.', version, nodeId, caseDoc, legalContext);
          }

          await this.saveVerdict(caseId, country, nodeLevel, resultJson, registry);
          console.log(`[${new Date().toLocaleTimeString()}] [Judicial|Done] ${country} resolved in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
          return node;
        } catch (err) {
          console.error(`[Fatal] Judicial task failed for ${country}-${nodeLevel}:`, err);
          throw err; // Re-throw so the queue knows it failed (it will catch and resolve(null))
        } finally {
          clearTimeout(timeoutId);
        }
      },
      async () => {
        const freshCase = await Case.findById(caseId);
        if (freshCase) {
          const fP = freshCase.pipelines.get(country);
          if (fP) {
            fP.nodes[nodeLevel].startedAt = new Date();
            if (!freshCase.startedAt) (freshCase as any).startedAt = new Date();
            fP.nodes[nodeLevel].thinkingLog = 'Judicial Deliberation Token Acquired. Finalizing deliberation...\n\n';
            await freshCase.save();

            // Monologue: only fire if feature flag is enabled (default: off)
            if (SIMULATION_CONFIG.FEATURES.ENABLE_MONOLOGUE) {
              this.queue.enqueue(
                async () => {
                  console.log(`[${new Date().toLocaleTimeString()}] [Monologue|Start] Deliberation text for ${country}...`);
                  return this.runJudicialMonologue(caseId, country, nodeLevel, legalContext, caseDoc.facts, version);
                }
              ).catch(e => console.warn('[Monologue] Background error:', e));
            }
          }
        }
      },
      'legal'
    );
  }

  private async handleRetry(
    caseId: string, country: string, nodeLevel: string,
    originalPrompt: string, critique: string, version: number,
    nodeId: string, caseDoc: any, legalContext: string
  ): Promise<any> {
    const retryPrompt = originalPrompt +
      `\n\nCRITICAL FEEDBACK FROM REVIEWER:\nYour previous attempt was rejected:\n"${critique}"\n\nRewrite your logic to fix this error.`;

    const registryEntry = await Registry.findOne({ countryCode: country });

    const retryResponse = await this.queue.enqueue(() => fetch(MISTRAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY()}` },
      body: JSON.stringify({
        model: SIMULATION_CONFIG.MODELS.JUDICIAL,
        messages: [
          { role: 'system', content: this.getSystemPrompt(country as CountryCode, nodeLevel as CourtLevel, caseDoc, nodeId, registryEntry) },
          { role: 'user', content: retryPrompt }
        ],
        response_format: { type: 'json_object' }
      })
    }), undefined, 'legal');


    if (!retryResponse || !retryResponse.ok) return null;
    const retryData = await retryResponse.json();
    try {
      const retryJson = RequestQueue.robustJsonParse(retryData.choices[0].message.content);
      await this.saveVerdict(caseId, country, nodeLevel, retryJson, registryEntry);
    } catch (err) {
      console.error(`[Retry|Fail] Permanent failure for ${country} ${nodeLevel}.`, err);
      // Mark node as failed so orchestrator doesn't see it stuck as 'deliberating'
      await Case.updateOne(
        { _id: caseId },
        { $set: { [`pipelines.${country}.nodes.${nodeLevel}.status`]: 'failed' } }
      );
    }
  }

  async saveVerdict(caseId: string, country: string, nodeLevel: string, resultJson: any, registry?: any): Promise<void> {
    const activeRegistry = registry || await Registry.findOne({ countryCode: country });
    const updatePayload: any = {
      [`pipelines.${country}.nodes.${nodeLevel}.status`]: 'complete',
      [`pipelines.${country}.nodes.${nodeLevel}.completedAt`]: new Date(),
      [`pipelines.${country}.nodes.${nodeLevel}.reasoning`]: resultJson.reasoning,
      [`pipelines.${country}.nodes.${nodeLevel}.agentsInvolved`]: this.getAgentsForNode(country as CountryCode, nodeLevel as CourtLevel, activeRegistry),
      [`pipelines.${country}.nodes.${nodeLevel}.legalReferences`]: resultJson.legalReferences || [],
      [`pipelines.${country}.nodes.${nodeLevel}.confidenceScore`]: typeof resultJson.confidenceScore === 'number' ? resultJson.confidenceScore : 5,
      [`pipelines.${country}.nodes.${nodeLevel}.verdict`]: {
        decision: resultJson.decision || 'Undecided',
        sentenceOrRemedy: resultJson.sentenceOrRemedy,
        majorityRatio: resultJson.majorityRatio
      }
    };

    if (nodeLevel === 'supreme') {
      updatePayload[`pipelines.${country}.finalVerdict`] = updatePayload[`pipelines.${country}.nodes.${nodeLevel}.verdict`];
    }

    const updateQuery: any = { $set: updatePayload };

    // Anomaly detection — AI-driven via LLM response
    const VALID_ANOMALY_TYPES = [
      'LAWYER_WITHDRAWAL', 'HOSTILE_WITNESS', 'NEW_EVIDENCE', 
      'AGENCY_ESCALATION', 'CONFLICT_OF_INTEREST', 'MISTRIAL', 
      'DISCOVERY_REQUEST', 'GLOBAL_ESCALATION', 'JURISDICTIONAL_VOID',
      'DATA_SOVEREIGNTY_BLOCK', 'SOVEREIGN_IMMUNITY', 'EXTRATERRITORIAL_OVERREACH'
    ];

    if (resultJson.anomaly_detected === true && resultJson.anomaly_type) {
      const isTypeValid = VALID_ANOMALY_TYPES.includes(resultJson.anomaly_type);
      if (isTypeValid) {
        const description = resultJson.anomaly_description || this.getEdgeCaseDescription(resultJson.anomaly_type);
        updateQuery.$push = {
          edgeCaseLog: {
            nodeId: `${country}-${nodeLevel}`,
            type: resultJson.anomaly_type,
            description,
            resolved: false,
            timestamp: new Date()
          }
        };
        updateQuery.$set[`pipelines.${country}.nodes.${nodeLevel}.status`] = 'edge_case';
      } else {
        console.warn(`[EdgeCase] Ignoring invalid anomaly_type '${resultJson.anomaly_type}' — not in schema enum.`);
      }
    }

    await Case.updateOne({ _id: caseId }, updateQuery);

    // Broadcast node completion via WebSocket
    try {
      getWsServer().broadcastCaseUpdate(caseId, {
        event: 'NODE_COMPLETE',
        country,
        nodeLevel,
        verdict: updatePayload[`pipelines.${country}.nodes.${nodeLevel}.verdict`],
        timestamp: new Date()
      });
    } catch (wsErr) {
      console.warn('[WS] Node broadcast failed:', wsErr);
    }
  }

  // --- Clerk Verification ---

  private async verifyWithClerk(
    decisionPayload: any,
    legalContext: string,
    caseFacts: string
  ): Promise<{ valid: boolean; critique?: string }> {
    const prompt = `You are a sophisticated Judicial Clerk verifying an AI Judge's output for structural and factual integrity.
Facts: ${caseFacts}
Legal Context: ${legalContext}
Judge's Decision: ${JSON.stringify(decisionPayload)}

Criterion 1: Structural Integrity — Does the decision follow logically from the provided legal context?
Criterion 2: Factual Grounding — Does the decision contradict the verified case facts?
Criterion 3: No Hallucination — Did the judge invent legal doctrines or statutes not present in the context?

Output strictly JSON: { "valid": true/false, "critique": "If false, explain the exactly what was hallucinated or contradictory." }`;

    const verificationResponse = await this.queue.enqueue(() => fetch(MISTRAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY()}` },
      body: JSON.stringify({
        model: SIMULATION_CONFIG.MODELS.CLERK,
        messages: [
          { role: 'system', content: 'You are a meticulous Judicial Clerk.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    }), undefined, 'util');

    try {
      if (!verificationResponse || !verificationResponse.ok) return { valid: true };
      const data = await verificationResponse.json();
      return JSON.parse(data.choices[0].message.content);
    } catch {
      return { valid: true }; // Fail-open: don't hard-block pipeline on clerk parse failure
    }
  }

  // --- Monologue (non-streaming, single call) ---
  // Only runs when SIMULATION_CONFIG.FEATURES.ENABLE_MONOLOGUE === true

  async runJudicialMonologue(
    caseId: string,
    country: CountryCode,
    nodeLevel: CourtLevel,
    context: string,
    facts: string,
    version: number
  ): Promise<string> {
    if (version !== this.queue.queueVersion) return '';

    const prompt = `You are a Senior Judicial Scholar. Think through this case at the ${nodeLevel} stage in ${country}.
Case Facts: ${facts}
Legal Context: ${context}

Write a 3-5 paragraph Judicial Monologue detailing your internal deliberation.
Analyze the interplay between facts and law. Do not reach a final verdict yet.
Structure your thoughts as a professional courtroom internal monologue.`;

    const response = await fetch(MISTRAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY()}` },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response || !response.ok) return 'Deliberation unavailable.';
    if (version !== this.queue.queueVersion) return '';

    const data = await response.json();
    const monologue = data?.choices?.[0]?.message?.content || '';

    if (monologue) {
      await Case.updateOne(
        { _id: caseId },
        { $set: { [`pipelines.${country}.nodes.${nodeLevel}.thinkingLog`]: monologue } }
      );
    }

    return monologue;
  }

  // --- Prompt Builders ---

  buildPrompt(caseDoc: ICase, country: CountryCode, level: CourtLevel, legalContext: string): string {
    const history = this.getJudicialHistory(caseDoc, country, level);
    return `
You must respond with a strict JSON object mapping these keys exactly:
{
  "decision": "Short 1-3 word decision (e.g. Guilty, Not Guilty, Upheld, Overturned, Remanded)",
  "reasoning": "Exactly 3 lines of legal rationale (no more, no less). Each line separated by \\n",
  "legalReferences": ["Reference 1", "Reference 2"],
  "sentenceOrRemedy": "Optional specific remedy or sentence",
  "majorityRatio": "Optional 5-4, Unanimous, etc.",
  "anomaly_detected": false,
  "anomaly_type": null,
  "anomaly_description": null,
  "confidenceScore": 8
}

Assign a "confidenceScore" (Number, 1-10) reflecting how strongly the legal context supports this decision.

CRITICAL ANOMALY DETECTION INSTRUCTIONS:
Set "anomaly_detected": true ONLY if the case facts reveal a REAL, SPECIFIC issue such as:
- Missing jurisdiction, evidence tampering, conflict of interest, hostile witness, or critical procedural violation.
If anomaly_detected is true, ALSO set "anomaly_type" and "anomaly_description".
Do NOT flag anomalies for trivial or generic reasons.

Case Facts: ${caseDoc.facts}

Mandatory Legal Context:
${legalContext}

${history ? `Judicial History:\n${history}\n\nTask: Evaluate the case at the ${level} stage based on cumulative history and legal context.` : `Task: Decide the outcome at the first instance based strictly on the provided legal context.`}
    `;
  }

  getSystemPrompt(country: CountryCode, level: CourtLevel, caseDoc: ICase, nodeId: string, registry: any): string {
    const systemType = registry?.sys || 'General Legal System';
    const investigationAgency = registry?.investigation || 'Local Investigating Authority';

    const isAgencyActive = caseDoc.edgeCaseLog.some(e => e.nodeId === nodeId && e.type === 'AGENCY_ESCALATION' && e.resolved);
    const isPublicDefender = (caseDoc as any).parties?.isPublicDefender;

    let role = '';
    if (level === 'investigation') {
      role = isAgencyActive ? `Special Federal Agent from the ${investigationAgency}` : `Investigating Official (${investigationAgency})`;
    } else {
      const courtName = (registry as any)[level] || `${level.charAt(0).toUpperCase() + level.slice(1)} Court`;
      role = `Judge in the ${courtName}`;
    }

    return `You are acting as the ${role} in ${country}.
Your legal system is based on ${systemType}.
${isAgencyActive && level === 'investigation' ? `You have overridden local jurisdiction as part of the ${investigationAgency} mandate.` : ''}
${isPublicDefender ? 'The Defense is led by a State-appointed Public Defender focusing on Constitutional due process.' : 'The Defense is led by Private Counsel.'}
${level === 'supreme' ? 'Focus purely on Constitutional validity and fundamental rights.' : 'Focus on applying statutes to the given facts.'}

CRITICAL VISUAL CONSTRAINT: For the "reasoning" field, provide EXACTLY 3 lines. Required for our global judicial dashboard.`;
  }

  getAgentsForNode(country: CountryCode, level: CourtLevel, registry: any): string[] {
    const courtName = (registry as any)[level] || `${level.charAt(0).toUpperCase() + level.slice(1)} Court`;
    if (level === 'supreme') return [courtName];
    if (level === 'trial' && country === 'USA') return ['Judge', 'Jury'];
    return [courtName];
  }

  private getJudicialHistory(caseDoc: ICase, country: CountryCode, level: CourtLevel): string | null {
    const p = caseDoc.pipelines.get(country);
    if (!p) return null;
    let history = '';
    const nodes = p.nodes;
    if (level === 'trial') {
      if (nodes.investigation.status === 'complete') history += `### STAGE 1: INVESTIGATION\n${nodes.investigation.reasoning}\n\n`;
    } else if (level === 'appellate') {
      if (nodes.investigation.status === 'complete') history += `### STAGE 1: INVESTIGATION\n${nodes.investigation.reasoning}\n\n`;
      if (nodes.trial.status === 'complete') history += `### STAGE 2: TRIAL COURT\n${nodes.trial.reasoning}\n\n`;
    } else if (level === 'supreme') {
      if (nodes.investigation.status === 'complete') history += `### STAGE 1: INVESTIGATION\n${nodes.investigation.reasoning}\n\n`;
      if (nodes.trial.status === 'complete') history += `### STAGE 2: TRIAL COURT\n${nodes.trial.reasoning}\n\n`;
      if (nodes.appellate.status === 'complete') history += `### STAGE 3: APPELLATE REVIEW\n${nodes.appellate.reasoning}\n\n`;
    }
    return history.trim() || null;
  }

  private getEdgeCaseDescription(type: string): string {
    const descriptions: Record<string, string> = {
      LAWYER_WITHDRAWAL: 'The lead counsel has filed an emergency motion to withdraw due to ethical conflicts.',
      HOSTILE_WITNESS: 'A key witness has suddenly recanted their initial statement during proceedings.',
      NEW_EVIDENCE: 'A previously unknown exculpatory document has surfaced in the middle of this phase.',
      AGENCY_ESCALATION: 'A federal or higher national agency has attempted to intervene and seize jurisdiction.',
      CONFLICT_OF_INTEREST: 'The presiding judge was found to have financial ties to one of the active parties.',
      MISTRIAL: 'A procedural violation threatens the integrity of the entire proceeding.',
      DISCOVERY_REQUEST: 'A massive discovery request has stalled forward momentum.',
      GLOBAL_ESCALATION: 'An international NGO or foreign government has filed an amicus brief challenging this proceeding.',
      JURISDICTIONAL_VOID: 'The dispute concerns assets or data located in non-sovereign global commons, creating a legal lacuna.',
      DATA_SOVEREIGNTY_BLOCK: 'A sovereign nation has invoked national security protocols to block the transfer of crucial trial data.',
      SOVEREIGN_IMMUNITY: 'A party has claimed absolute sovereign immunity, challenging the court\'s authority to adjudicate the dispute.',
      EXTRATERRITORIAL_OVERREACH: 'The legal proceedings attempt to exert authority over behavior and entities residing outside national borders.'
    };
    return descriptions[type] || 'An unexpected procedural anomaly has stalled the court.';
  }
}

export const judicialResolver = new JudicialResolver(sharedQueue);
