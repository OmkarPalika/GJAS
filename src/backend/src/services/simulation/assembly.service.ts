/**
 * assembly.service.ts
 * Handles post-Supreme phases: Global Assembly synthesis, ICC Proceedings,
 * Executive Review (clemency/pardon), and case finalization.
 */
import Case from '@/models/Case.js';
import corpusLoader from '@/services/simulation/corpus.js';
import { GLOBAL_COURT_REGISTRY } from '@/lib/court_registry.js';
import { sharedQueue, RequestQueue } from '@/services/simulation/request_queue.js';
import type { CountryCode } from '@/services/simulation.service.js';

const MISTRAL_API = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_KEY = () => process.env.MISTRAL_API_KEY;

export class AssemblyService {
  constructor(private queue: RequestQueue) {}

  // --- Phase 5: Global Assembly ---

  async runGlobalAssembly(caseId: string, factsEmbedding?: number[]): Promise<void> {
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc || !caseDoc.globalAssembly) return;

    caseDoc.globalAssembly.status = 'deliberating';
    await caseDoc.save();

    const globalLegalContext = await corpusLoader.getGlobalAssemblyContext(caseDoc.facts, factsEmbedding);

    // Build batched national verdict summary to stay within context limits
    // NOTE: Full 195-nation list is grouped into a condensed summary map
    const verdictLines: string[] = [];
    caseDoc.pipelines.forEach((p, country) => {
      const supreme = p.nodes.supreme;
      let line = `${country} (${p.legalSystem}): ${supreme.verdict?.decision}`;
      if (supreme.dissentingReasoning) {
        line += ` | DISSENT by ${supreme.dissentingAgents?.join(', ')}: ${supreme.dissentingReasoning?.slice(0, 80)}`;
      }
      verdictLines.push(line);
    });

    const prompt = `You are the Global Judicial Assembly.
Case Facts: ${caseDoc.facts}

International Law Context (RAG-retrieved):
${globalLegalContext}

National Supreme Verdicts Summary (${verdictLines.length} jurisdictions):
${verdictLines.join('\n')}

Task: Synthesize these multi-national perspectives into a final global consensus judgment.
Analyze where jurisdictions diverged and where dissenting views hold more weight in international law.
Output JSON with keys: "finalGlobalJudgement", "synthesisReasoning".`;

    const response = await this.queue.enqueue(() => fetch(MISTRAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY()}` },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'You are an advanced international jurist.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    }));

    if (!response) {
      caseDoc.globalAssembly.status = 'failed';
      await caseDoc.save();
      return;
    }

    const data = await response.json();
    const resultJson = RequestQueue.robustJsonParse(data.choices[0].message.content);

    caseDoc.globalAssembly.status = 'complete';
    caseDoc.globalAssembly.finalGlobalJudgement =
      typeof resultJson.finalGlobalJudgement === 'string'
        ? resultJson.finalGlobalJudgement
        : JSON.stringify(resultJson.finalGlobalJudgement, null, 2);
    caseDoc.globalAssembly.synthesisReasoning =
      typeof resultJson.synthesisReasoning === 'string'
        ? resultJson.synthesisReasoning
        : JSON.stringify(resultJson.synthesisReasoning, null, 2);

    // Determine next phase: ICC or Executive Review
    const humanityKeywords = ['genocide', 'humanity', 'war crime', 'systemic torture', 'ethnic cleansing'];
    const shouldTriggerICC = humanityKeywords.some(kw =>
      caseDoc.globalAssembly?.finalGlobalJudgement?.toLowerCase().includes(kw) ||
      caseDoc.globalAssembly?.synthesisReasoning?.toLowerCase().includes(kw)
    );

    if (shouldTriggerICC) {
      caseDoc.iccProceedings = { status: 'pending' };
      await caseDoc.save();
      console.log(`[Assembly] Crimes against humanity detected — escalating to ICC.`);
      this.runICCProceedings(caseId).catch(console.error);
    } else {
      caseDoc.status = 'executive_review';
      await caseDoc.save();
      console.log(`[Assembly] Global synthesis complete — triggering Executive Review.`);
      for (const [country, p] of caseDoc.pipelines.entries()) {
        if (p.finalVerdict?.decision?.toLowerCase().includes('guilty')) {
          this.runExecutiveReview(caseId, country as CountryCode).catch(console.error);
        } else {
          p.executiveReview = { status: 'none' };
          this.finalizeCorrections(caseId, country as CountryCode).catch(console.error);
        }
      }
    }
  }

  // --- Phase 5b: ICC Proceedings ---

  async runICCProceedings(caseId: string, factsEmbedding?: number[]): Promise<void> {
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc || !caseDoc.iccProceedings) return;

    caseDoc.iccProceedings.status = 'deliberating';
    await caseDoc.save();

    const iccLegalContext = await corpusLoader.getICCContext(caseDoc.facts, factsEmbedding);

    const prompt = `You are the International Criminal Court (ICC) at The Hague.
An international Judicial Assembly has referred this case because national jurisdictions detected crimes against humanity.

ICC Legal Context (Rome Statute, RAG-retrieved):
${iccLegalContext}

Case Facts: ${caseDoc.facts}
Synthesis Report: ${caseDoc.globalAssembly?.synthesisReasoning}

Task: Issue a binding International Verdict under the Rome Statute.
Output JSON: { "decision": "...", "reasoning": "...", "sentenceOrRemedy": "..." }`;

    const response = await this.queue.enqueue(() => fetch(MISTRAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY()}` },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'You are the Chief Justice of the ICC.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    }));

    if (!response) {
      caseDoc.iccProceedings.status = 'failed';
      await caseDoc.save();
      return;
    }

    const data = await response.json();
    const resultJson = RequestQueue.robustJsonParse(data.choices[0].message.content);

    caseDoc.iccProceedings.status = 'complete';
    caseDoc.iccProceedings.reasoning = resultJson.reasoning;
    caseDoc.iccProceedings.verdict = {
      decision: resultJson.decision,
      sentenceOrRemedy: resultJson.sentenceOrRemedy
    };
    caseDoc.status = 'complete';
    await caseDoc.save();
    console.log(`[ICC] Proceedings complete. Verdict: ${resultJson.decision}`);
  }

  // --- Phase 6: Executive Review ---

  async runExecutiveReview(caseId: string, country: CountryCode): Promise<void> {
    const caseDoc = await Case.findById(caseId);
    const p = caseDoc?.pipelines.get(country);
    if (!caseDoc || !p) return;

    p.executiveReview = { status: 'pending' };
    await caseDoc.save();

    const persona = this.getExecutivePersona(country);
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

    if (!response) return;
    const data = await response.json();
    const result = RequestQueue.robustJsonParse(data.choices[0].message.content);

    p.executiveReview = { status: result.status, reasoning: result.reasoning };
    await caseDoc.save();

    this.finalizeCorrections(caseId, country).catch(console.error);
  }

  private async finalizeCorrections(caseId: string, country: CountryCode): Promise<void> {
    const caseDoc = await Case.findById(caseId);
    const p = caseDoc?.pipelines.get(country);
    if (!caseDoc || !p) return;

    const isGuilty = p.finalVerdict?.decision?.toLowerCase().includes('guilty');
    const isPardoned = p.executiveReview?.status === 'granted';

    if (isGuilty && !isPardoned) {
      p.corrections = {
        status: 'Incarcerated',
        inmateId: `#${Math.floor(Math.random() * 90000) + 10000}`,
        paroleEligibility: 'Parole Eligible in 12 Years'
      };
    } else {
      p.corrections = {
        status: isPardoned ? 'Released (Executive Pardon)' : 'No Correctional Action (Acquittal)'
      };
    }

    const allComplete = Array.from(caseDoc.pipelines.values()).every(pp =>
      pp.corrections || pp.finalVerdict?.decision?.toLowerCase().includes('not guilty')
    );
    if (allComplete) {
      caseDoc.status = 'complete';
      console.log(`[Assembly] Case ${caseId} fully resolved. Status: complete.`);
    }
    await caseDoc.save();
  }

  private getExecutivePersona(country: CountryCode): { role: string; power: string } {
    const registry = GLOBAL_COURT_REGISTRY[country];

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
}

export const assemblyService = new AssemblyService(sharedQueue);
