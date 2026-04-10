/**
 * assembly.service.ts
 * Handles post-Supreme phases: Global Assembly synthesis, ICC Proceedings,
 * Executive Review (clemency/pardon), and case finalization.
 */
import Case from '@/models/Case.js';
import corpusLoader from '@/services/simulation/corpus.js';
import Registry from '@/models/Registry.js';
import { sharedQueue, RequestQueue } from '@/services/simulation/request_queue.js';
import type { CountryCode } from '@/services/simulation.service.js';
import { getWsServer } from '@/services/websocket.js';
import { SIMULATION_CONFIG } from '@/config/simulation.config.js';

const MISTRAL_API = SIMULATION_CONFIG.MISTRAL_API_URL;
const MISTRAL_KEY = () => process.env.MISTRAL_API_KEY;

export class AssemblyService {
  constructor(private queue: RequestQueue) {}

  // --- Phase 5: Global Assembly ---

  async runGlobalAssembly(caseId: string, factsEmbedding?: number[]): Promise<void> {
    // ── ATOMIC GUARD ──
    const ongoing = await Case.findOneAndUpdate(
      { _id: caseId, 'globalAssembly.status': 'pending' },
      { $set: { 'globalAssembly.status': 'deliberating' } },
      { returnDocument: 'after' }
    );
    if (!ongoing) {
      console.log(`[Assembly] Global Assembly for ${caseId} already in progress or complete. Skipping.`);
      return;
    }

    const globalLegalContext = await corpusLoader.getGlobalAssemblyContext(ongoing.facts, factsEmbedding);

    const nationCount = ongoing.pipelines.size;
    let summaryList = '';

    if (nationCount > SIMULATION_CONFIG.SCALING.BLOCK_SUMMARIZATION_THRESHOLD) {
      // Scale: Summarize by Legal System Block
      const blocks: Record<string, { count: number; guilty: number; notGuilty: number; summary: string[] }> = {};
      
      ongoing.pipelines.forEach((p, country) => {
        const sys = p.legalSystem || 'Other';
        if (!blocks[sys]) blocks[sys] = { count: 0, guilty: 0, notGuilty: 0, summary: [] };
        
        blocks[sys].count++;
        const decision = p.nodes.supreme.verdict?.decision?.toLowerCase() || '';
        if (decision.includes('guilty')) blocks[sys].guilty++;
        else blocks[sys].notGuilty++;

        if (blocks[sys].summary.length < 5) {
          blocks[sys].summary.push(`${country}: ${decision.slice(0, 30)}...`);
        }
      });

      summaryList = Object.entries(blocks).map(([sys, data]) => 
        `### ${sys} Block (${data.count} Nations)\n` +
        `- Trends: ${data.guilty} Guilty, ${data.notGuilty} Not Guilty\n` +
        `- Sample Verdicts: ${data.summary.join(', ')}`
      ).join('\n\n');
    } else {
      // Standard: List all nations
      const verdictLines: string[] = [];
      ongoing.pipelines.forEach((p, country) => {
        const supreme = p.nodes.supreme;
        let line = `${country} (${p.legalSystem}): ${supreme.verdict?.decision || 'No Verdict Reached'}`;
        if (supreme.dissentingReasoning) {
          line += ` | DISSENT: ${supreme.dissentingReasoning?.slice(0, 60)}...`;
        }
        verdictLines.push(line);
      });
      summaryList = verdictLines.join('\n');
    }

    // --- FORMAL WEIGHTED VOTING ---
    const registryDocs = await Registry.find({ countryCode: { $in: Array.from(ongoing.pipelines.keys()) } });
    const weightMap = new Map<string, number>();
    registryDocs.forEach(r => weightMap.set(r.countryCode, r.simulationWeight || 50));
    
    let totalWeight = 0;
    let guiltyWeight = 0;

    ongoing.pipelines.forEach((p, country) => {
      const weight = weightMap.get(country as string) || 50;
      totalWeight += weight;
      const decision = p.nodes.supreme.verdict?.decision?.toLowerCase() || '';
      
      const isNotGuilty = decision.includes('not guilty') || decision === 'acquitted' || decision === 'overturned';
      const isGuilty = !isNotGuilty && (decision.includes('guilty') || decision === 'upheld');
      
      if (isGuilty) {
        guiltyWeight += weight;
      }
    });

    const threshold = 0.75;
    const guiltyRatio = totalWeight > 0 ? (guiltyWeight / totalWeight) : 0;
    const isGuilty = guiltyRatio >= threshold;
    const isNotGuilty = guiltyRatio <= (1 - threshold);
    let consensusReached = isGuilty || isNotGuilty;
    const weightedMajorityPercent = Math.round(guiltyRatio * 100);

    // --- UN SECURITY COUNCIL P5 VETO LOGIC ---
    let vetoingNations: string[] = [];
    if (consensusReached) {
      registryDocs.forEach(r => {
        if (r.p5VetoPower) {
          const p = ongoing.pipelines.get(r.countryCode);
          const decision = p?.nodes.supreme.verdict?.decision?.toLowerCase() || '';
          const pNotGuilty = decision.includes('not guilty') || decision === 'acquitted' || decision === 'overturned';
          const pGuilty = !pNotGuilty && (decision.includes('guilty') || decision === 'upheld');
          
          if (isGuilty && pNotGuilty) vetoingNations.push(r.countryCode);
          if (isNotGuilty && pGuilty) vetoingNations.push(r.countryCode);
        }
      });
      if (vetoingNations.length > 0) {
        consensusReached = false;
      }
    }

    const prompt = `You are the LLM Moderator for the Global Judicial Assembly.
Case Facts: ${ongoing.facts}

International Law Context (RAG):
${globalLegalContext}

Jurisdictional Perspectives (${nationCount} nations):
${summaryList}

Voting Results (Mathematical Weighting applied by Registry):
Total Voting Weight: ${totalWeight}
Guilty Weight: ${guiltyWeight} (${weightedMajorityPercent}%)
Supermajority Threshold (75%): ${isGuilty || isNotGuilty ? 'REACHED' : 'FAILED (Hung Assembly)'}
UN Security Council P5 Veto: ${vetoingNations.length > 0 ? "TRIGGERED by " + vetoingNations.join(', ') : 'None'}
Final Status: ${consensusReached ? 'CONSENSUS' : 'DEADLOCKED'}

Task: Act as the Interactive Moderator. Facilitate a synthesis of these arguments.
If consensus was REACHED, synthesize the majority reasoning.
If consensus FAILED or VETOED, critique the divergence and synthesize why the nations disagree or triggered veto.
Assign an overall Confidence Score (1-10) reflecting the clarity of the legal arguments.
Output JSON: { "finalGlobalJudgement": string, "synthesisReasoning": string, "confidenceScore": number }`;

    const response = await this.queue.enqueue(() => fetch(MISTRAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY()}` },
      body: JSON.stringify({
        model: SIMULATION_CONFIG.MODELS.GLOBAL_ASSEMBLY,
        messages: [
          { role: 'system', content: 'You are an advanced international jurist.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    }));

    if (!response || !response.ok) {
      await Case.updateOne({ _id: caseId }, { $set: { 'globalAssembly.status': 'failed' } });
      try {
        getWsServer().broadcastCaseUpdate(caseId, {
          event: 'PHASE_FAILURE',
          status: 'assembly',
          error: 'Mistral API synthesis failed',
          timestamp: new Date()
        });
      } catch {}
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!data?.choices?.[0]) {
      console.error(`[Assembly] Mistral API returned invalid response envelope for Global Assembly`, data);
      await Case.updateOne({ _id: caseId }, { $set: { 'globalAssembly.status': 'failed' } });
      return;
    }

    const resultJson = RequestQueue.robustJsonParse(data.choices[0].message.content) || {};
    const confidenceScore = typeof resultJson.confidenceScore === 'number' ? resultJson.confidenceScore : 5;

    const finalJudgment = typeof resultJson.finalGlobalJudgement === 'string'
      ? resultJson.finalGlobalJudgement
      : JSON.stringify(resultJson.finalGlobalJudgement || 'Failed to synthesize judgement', null, 2);

    const synthesisReasoning = typeof resultJson.synthesisReasoning === 'string'
      ? resultJson.synthesisReasoning
      : JSON.stringify(resultJson.synthesisReasoning || 'Failed to synthesize reasoning', null, 2);

    // Determine next phase: ICC, ICJ, or Executive Review
    const humanityKeywords = [
      'genocide', 'humanity', 'war crime', 'systemic torture', 
      'ethnic cleansing', 'mass atrocities', 'crimes against peace'
    ];
    const icjKeywords = ['treaty', 'territory', 'border', 'cyber', 'trade', 'sovereign', 'extradition'];
    const stringBlockToCheck = `${finalJudgment} ${synthesisReasoning}`.toLowerCase();
    
    const triggeredByCrimes = humanityKeywords.some(kw => stringBlockToCheck.includes(kw));
    const triggeredByICJ = icjKeywords.some(kw => stringBlockToCheck.includes(kw));
    const shouldTriggerEscalation = triggeredByCrimes || triggeredByICJ || !consensusReached;

    if (shouldTriggerEscalation) {
      const isICC = triggeredByCrimes || (!triggeredByICJ && !consensusReached);
      const isICJ = !isICC;
      
      const payloadKey = isICC ? 'iccProceedings' : 'icjProceedings';
      const eventName = isICC ? 'ICC_ESCALATION' : 'ICJ_ESCALATION';
      const statusName = isICC ? 'icc' : 'icj';

      // ── ATOMIC TRANSITION ──
      const updatedCase = await Case.findOneAndUpdate(
        { _id: caseId, 'globalAssembly.status': 'deliberating' },
        {
          $set: {
            'globalAssembly.status': 'complete',
            'globalAssembly.finalGlobalJudgement': finalJudgment,
            'globalAssembly.synthesisReasoning': synthesisReasoning,
            'globalAssembly.confidenceScore': confidenceScore,
            'globalAssembly.weightedMajorityPercent': weightedMajorityPercent,
            'globalAssembly.consensusReached': consensusReached,
            [`${payloadKey}`]: { status: 'pending' }
          }
        },
        { returnDocument: 'after' }
      );

      if (!updatedCase) return; // Prevent double-triggering

      if (isICC) {
        if (triggeredByCrimes) console.log(`[Assembly] Crimes against humanity detected — escalating to ICC.`);
        else console.log(`[Assembly] Hung Assembly / VETO detected — escalating to ICC.`);
      } else {
        console.log(`[Assembly] State vs State dispute detected — escalating to ICJ.`);
      }
      
      // Update WebSocket with escalation transition
      try {
        getWsServer().broadcastCaseUpdate(caseId, {
          event: eventName,
          status: statusName,
          globalAssembly: updatedCase.globalAssembly, // Full payload
          [payloadKey]: { status: 'pending' },
          timestamp: new Date()
        });
      } catch (wsErr) {
        console.warn(`[WS] ${eventName} broadcast failed:`, wsErr);
      }

      if (isICC) this.runICCProceedings(caseId, factsEmbedding).catch(console.error);
      else this.runICJProceedings(caseId, factsEmbedding).catch(console.error);
    } else {
      // ── ATOMIC TRANSITION ──
      const updatedCase = await Case.findOneAndUpdate(
        { _id: caseId, 'globalAssembly.status': 'deliberating' },
        {
          $set: {
            status: 'executive_review',
            'globalAssembly.status': 'complete',
            'globalAssembly.finalGlobalJudgement': finalJudgment,
            'globalAssembly.synthesisReasoning': synthesisReasoning,
            'globalAssembly.confidenceScore': confidenceScore,
            'globalAssembly.weightedMajorityPercent': weightedMajorityPercent,
            'globalAssembly.consensusReached': consensusReached
          }
        },
        { returnDocument: 'after' }
      );

      if (!updatedCase) return; // Prevent double-triggering Executive Review

      console.log(`[Assembly] Global synthesis complete — triggering Executive Review.`);

      // Update WebSocket with Executive Review transition
      try {
        getWsServer().broadcastCaseUpdate(caseId, {
          event: 'EXECUTIVE_REVIEW_START',
          status: 'executive_review',
          globalAssembly: updatedCase.globalAssembly, // Full payload
          timestamp: new Date()
        });
      } catch (wsErr) {
        console.warn('[WS] Executive review start broadcast failed:', wsErr);
      }

      for (const [country, p] of updatedCase.pipelines.entries()) {
        const decision = p.nodes.supreme.verdict?.decision?.toLowerCase() || '';
        if (decision.includes('guilty')) {
          this.runExecutiveReview(caseId, country as CountryCode).catch(console.error);
        } else {
          await Case.updateOne({ _id: caseId }, { $set: { [`pipelines.${country}.executiveReview`]: { status: 'none' } } });
          this.finalizeCorrections(caseId, country as CountryCode).catch(console.error);
        }
      }
    }
  }

  // --- Phase 5b: ICC Proceedings ---

  async runICCProceedings(caseId: string, factsEmbedding?: number[]): Promise<void> {
    // ── ATOMIC GUARD ──
    const ongoing = await Case.findOneAndUpdate(
      { _id: caseId, 'iccProceedings.status': 'pending' },
      { $set: { 'iccProceedings.status': 'deliberating' } },
      { returnDocument: 'after' }
    );
    if (!ongoing) return;

    const iccLegalContext = await corpusLoader.getICCContext(ongoing.facts, factsEmbedding);

    const prompt = `You are the International Criminal Court (ICC) at The Hague.
An international Judicial Assembly has referred this case because national jurisdictions detected crimes against humanity.

ICC Legal Context (Rome Statute, RAG-retrieved):
${iccLegalContext}

Case Facts: ${ongoing.facts}
Synthesis Report: ${ongoing.globalAssembly?.synthesisReasoning || 'Evidence of crimes against humanity.'}

Task: Issue a binding International Verdict under the Rome Statute.
Output JSON: { "decision": "...", "reasoning": "...", "sentenceOrRemedy": "..." }`;

    const response = await this.queue.enqueue(() => fetch(MISTRAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY()}` },
      body: JSON.stringify({
        model: SIMULATION_CONFIG.MODELS.GLOBAL_ASSEMBLY,
        messages: [
          { role: 'system', content: 'You are the Chief Justice of the ICC.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    }));

    if (!response || !response.ok) {
      await Case.updateOne({ _id: caseId }, { $set: { 'iccProceedings.status': 'failed' } });
      try {
        getWsServer().broadcastCaseUpdate(caseId, {
          event: 'PHASE_FAILURE',
          status: 'icc',
          error: 'ICC Deliberation Failed',
          timestamp: new Date()
        });
      } catch {}
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!data?.choices?.[0]) {
      console.error(`[ICC] Mistral API returned invalid response envelope`, data);
      await Case.updateOne({ _id: caseId }, { $set: { 'iccProceedings.status': 'failed' } });
      return;
    }

    const resultJson = RequestQueue.robustJsonParse(data.choices[0].message.content) || {};

    const caseDoc = await Case.findById(caseId);
    const countries = Array.from(caseDoc?.pipelines.keys() || []);
    const registries = await Registry.find({ countryCode: { $in: countries } });
    
    // Treaty Block (Rome Statute)
    let jurisdictionNote = '';
    const nonSignatories = registries.filter(r => !(r.treatiesRatified || []).includes('Rome Statute'));
    if (nonSignatories.length > 0) {
       jurisdictionNote = `\n\n[JURISDICTION DECLINED] The ICC legally cannot assert binding jurisdiction over the following non-signatory nations: ${nonSignatories.map(n => n.countryCode).join(', ')}.`;
    }

    const finalResult = await Case.findOneAndUpdate(
      { _id: caseId, 'iccProceedings.status': 'deliberating' },
      {
        $set: {
          status: 'complete',
          updatedAt: new Date(),
          'iccProceedings.status': 'complete',
          'iccProceedings.reasoning': (resultJson.reasoning || 'Missing reasoning') + jurisdictionNote,
          'iccProceedings.verdict': {
            decision: resultJson.decision || 'Guilty Action Defaulted',
            sentenceOrRemedy: resultJson.sentenceOrRemedy || 'Remand to the Hague'
          }
        }
      },
      { returnDocument: 'after' }
    );

    if (finalResult) {
      console.log(`[Finalization] Case ${caseId} is now officially COMPLETE via ICC.`);
      this.updateAgentMetrics(caseId).catch(console.error);
      try {
        getWsServer().broadcastCaseUpdate(caseId, {
          event: 'CASE_COMPLETE',
          status: 'complete',
          iccProceedings: finalResult.iccProceedings,
          timestamp: new Date()
        });
      } catch (wsErr) {
        console.warn('[WS] ICC final broadcast failed:', wsErr);
      }
    }
  }

  // --- Phase 5c: ICJ Proceedings ---

  async runICJProceedings(caseId: string, factsEmbedding?: number[]): Promise<void> {
    const ongoing = await Case.findOneAndUpdate(
      { _id: caseId, 'icjProceedings.status': 'pending' },
      { $set: { 'icjProceedings.status': 'deliberating' } },
      { returnDocument: 'after' }
    );
    if (!ongoing) return;

    // ICJ relies on UN Charter, Treaties, and General International Law
    const icjLegalContext = await corpusLoader.getGlobalAssemblyContext(ongoing.facts, factsEmbedding);

    const prompt = `You are the International Court of Justice (ICJ) at The Hague.
This is a State vs State dispute referred by the Global Assembly.

ICJ Legal Context (RAG-retrieved):
${icjLegalContext}

Case Facts: ${ongoing.facts}
Assembly Report: ${ongoing.globalAssembly?.synthesisReasoning || 'Dispute escalated due to deadlock.'}

Task: Issue a binding ICJ ruling settling the dispute between the nations involved. Focus on treaties and sovereignty, not criminal sentencing.
Output JSON: { "decision": "...", "reasoning": "...", "sentenceOrRemedy": "..." }`;

    const response = await this.queue.enqueue(() => fetch(MISTRAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY()}` },
      body: JSON.stringify({
        model: SIMULATION_CONFIG.MODELS.GLOBAL_ASSEMBLY,
        messages: [
          { role: 'system', content: 'You are the President of the International Court of Justice (ICJ).' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    }));

    if (!response || !response.ok) {
      await Case.updateOne({ _id: caseId }, { $set: { 'icjProceedings.status': 'failed' } });
      return;
    }

    let data;
    try { data = await response.json(); } catch (e) { data = null; }

    const resultJson = RequestQueue.robustJsonParse(data?.choices?.[0]?.message?.content) || {};

    const finalResult = await Case.findOneAndUpdate(
      { _id: caseId, 'icjProceedings.status': 'deliberating' },
      {
        $set: {
          status: 'complete',
          updatedAt: new Date(),
          'icjProceedings.status': 'complete',
          'icjProceedings.reasoning': resultJson.reasoning || 'Missing reasoning',
          'icjProceedings.verdict': {
            decision: resultJson.decision || 'ICJ Jurisdictional Resolution',
            sentenceOrRemedy: resultJson.sentenceOrRemedy || 'Binding State Resolution'
          }
        }
      },
      { returnDocument: 'after' }
    );

    if (finalResult) {
      console.log(`[Finalization] Case ${caseId} is now officially COMPLETE via ICJ.`);
      this.updateAgentMetrics(caseId).catch(console.error);
      try {
        getWsServer().broadcastCaseUpdate(caseId, {
          event: 'CASE_COMPLETE',
          status: 'complete',
          icjProceedings: finalResult.icjProceedings,
          timestamp: new Date()
        });
      } catch (wsErr) {
        console.warn('[WS] ICJ final broadcast failed:', wsErr);
      }
    }
  }

  // --- Phase 6: Executive Review ---

  async runExecutiveReview(caseId: string, country: CountryCode): Promise<void> {
    const caseDoc = await Case.findById(caseId);
    const p = caseDoc?.pipelines.get(country);
    if (!caseDoc || !p) return;

    await Case.updateOne({ _id: caseId }, { $set: { [`pipelines.${country}.executiveReview.status`]: 'pending' } });

    const registry = await Registry.findOne({ countryCode: country });
    const persona = this.getExecutivePersona(country, registry);
    const prompt = `You are ${persona.role}. You have the power of ${persona.power} over the following judicial verdict:
Verdict: ${p.finalVerdict?.decision}
Reasoning: ${p.nodes.supreme.reasoning}
Case Facts: ${caseDoc.facts}

Task: Decide whether to grant clemency/pardon or sustain the verdict.
Respond in JSON: { "status": "granted" | "denied", "reasoning": "Explain your decision." }`;

    const response = await this.queue.enqueue(() => fetch(MISTRAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY()}` },
      body: JSON.stringify({
        model: 'mistral-medium-latest',
        messages: [
          { role: 'system', content: `You are the ${persona.role} of ${country}.` },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    }));

    if (!response) {
      // Fallback if Mistral drops out so the case doesn't hang forever
      await Case.updateOne({ _id: caseId }, { 
        $set: { 
          [`pipelines.${country}.executiveReview.status`]: 'denied',
          [`pipelines.${country}.executiveReview.reasoning`]: 'Executive review failed due to timeout.'
        } 
      });
      this.finalizeCorrections(caseId, country).catch(console.error);
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!data?.choices?.[0]) {
      console.error(`[Executive Review] Invalid Mistral schema for ${country}`, data);
      await Case.updateOne({ _id: caseId }, { 
        $set: { 
          [`pipelines.${country}.executiveReview.status`]: 'denied',
          [`pipelines.${country}.executiveReview.reasoning`]: 'Executive review failed mapping schema.'
        } 
      });
      this.finalizeCorrections(caseId, country).catch(console.error);
      return;
    }

    const result = RequestQueue.robustJsonParse(data.choices[0].message.content) || {};

    await Case.updateOne({ _id: caseId }, { 
      $set: { 
        [`pipelines.${country}.executiveReview.status`]: result.status || 'denied',
        [`pipelines.${country}.executiveReview.reasoning`]: result.reasoning || 'No comment provided.'
      } 
    });

    // Broadcast Executive Review completion for this country
    try {
      getWsServer().broadcastCaseUpdate(caseId, {
        event: 'EXECUTIVE_REVIEW_COMPLETE',
        country,
        executiveReview: { status: result.status || 'denied' },
        timestamp: new Date()
      });
    } catch (wsErr) {
      console.warn('[WS] Executive review broadcast failed:', wsErr);
    }

    this.finalizeCorrections(caseId, country).catch(console.error);
  }

  private async finalizeCorrections(caseId: string, country: CountryCode): Promise<void> {
    const caseDoc = await Case.findById(caseId);
    const p = caseDoc?.pipelines.get(country);
    if (!caseDoc || !p) return;

    const isGuilty = p.finalVerdict?.decision?.toLowerCase().includes('guilty');
    const isPardoned = p.executiveReview?.status === 'granted';

    let correctionsObj: any;
    if (isGuilty && !isPardoned) {
      correctionsObj = {
        status: 'Incarcerated',
        inmateId: `GA-${country}-${caseId.slice(-4)}-${Math.abs(this.hashCode(country + caseId)) % 10000}`,
        paroleEligibility: 'Parole Eligible in 12 Years'
      };
    } else {
      correctionsObj = {
        status: isPardoned ? 'Released (Executive Pardon)' : 'No Correctional Action (Acquittal)'
      };
    }

    await Case.updateOne({ _id: caseId }, { $set: { [`pipelines.${country}.corrections`]: correctionsObj } });

    // Check if ALL eligible countries have finished executive review
    const updatedCase = await Case.findById(caseId);
    if (updatedCase) {
      const allComplete = Array.from(updatedCase.pipelines.values()).every(p => {
        const decision = p.nodes.supreme.verdict?.decision?.toLowerCase() || '';
        const isGuilty = decision.includes('guilty');
        if (!isGuilty) return true; // Not eligible for review, so "complete" by default
        return !!p.executiveReview?.status && p.executiveReview.status !== 'pending';
      });

      if (allComplete) {
        // ── ATOMIC FINALIZATION ──
        const finalResult = await Case.findOneAndUpdate(
          { _id: caseId, status: { $ne: 'complete' } },
          { 
            $set: { 
              status: 'complete',
              updatedAt: new Date()
            } 
          },
          { returnDocument: 'after' }
        );

        if (finalResult) {
          console.log(`[Finalization] Case ${caseId} is now officially COMPLETE.`);
          this.updateAgentMetrics(caseId).catch(console.error);
          try {
            getWsServer().broadcastCaseUpdate(caseId, {
              event: 'CASE_COMPLETE',
              status: 'complete',
              timestamp: new Date()
            });
          } catch (wsErr) {
            console.warn('[WS] Finalization broadcast failed:', wsErr);
          }
        }
      }
    }
  }

  private getExecutivePersona(country: CountryCode, registry: any): { role: string; power: string } {

    if (registry?.category === 'Islamic') {
      return { role: 'Royal Court / High Governor', power: 'Supreme Executive Clemency under Sharia' };
    }

    const personas: Partial<Record<CountryCode, { role: string; power: string }>> = {
      USA: { role: 'President of the United States', power: 'Article II Federal Pardon' },
      IND: { role: 'President of India', power: 'Article 72 Clemency' },
      FRA: { role: 'Ministry of Justice (Garde des Sceaux)', power: 'Limited Administrative Review' },
      GER: { role: 'Federal President (Bundespräsident)', power: 'Right of Pardon (Gnadenrecht)' }
    };

    return personas[country] || {
      role: `Head of State / Executive Authority of ${registry?.name || country}`,
      power: 'Constitutional Executive Pardon Power'
    };
  }

  private async updateAgentMetrics(caseId: string): Promise<void> {
    try {
      const caseDoc = await Case.findById(caseId);
      if (!caseDoc) return;
      const countries = Array.from(caseDoc.pipelines.keys());
      await Registry.updateMany(
        { countryCode: { $in: countries } },
        { 
          $inc: { 
            'agentMetrics.casesSolved': 1, 
            'agentMetrics.performancePoints': 10 
          } 
        }
      );
      console.log(`[Metrics] Awarded 10 performance points to participating agents.`);
    } catch (metricError) {
      console.error(`[Metrics] Failed to update agent metrics:`, metricError);
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}

export const assemblyService = new AssemblyService(sharedQueue);
