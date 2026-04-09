
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Case, { ICountryPipeline } from '../src/models/Case.js';
import simulationService, { CourtLevel, CountryCode } from '../src/services/simulation.service.js';

dotenv.config();

async function runDualNationTest() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gjas';
  const NATIONS: CountryCode[] = ['IND', 'USA'];
  
  console.log(`[E2E-Plus] Connecting to ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);

  console.log(`[E2E-Plus] Creating a NEW case for Global Synthesis test...`);
  const newCaseId = new mongoose.Types.ObjectId().toString();
  
  const caseDoc = new Case({
    _id: newCaseId,
    title: `AI Data Sovereignty Dispute - ${new Date().toLocaleTimeString()}`,
    facts: `A massive AI model trained in the USA by a global tech titan is being sued by the Indian government for 'Data Colonialism'. India claims that the training data included sensitive biometric and cultural archives without sovereign consent. The USA defends the model as 'Transformative Fair Use'.`,
    caseType: 'constitutional',
    status: 'investigation',
    parties: {
      prosecution: 'Ministry of Information Technology (India)',
      defense: 'Global Neural Systems Corp',
      accused: 'GNS Engine v4.0',
      isPublicDefender: false
    },
    // Initialize empty global objects to trigger orchestration
    globalAssembly: { status: 'pending' },
    pipelines: new Map<string, ICountryPipeline>(
      NATIONS.map(country => [country as string, {
        country: country as string,
        legalSystem: country === 'USA' ? 'Common Law' : 'Public/Digital Law',
        nodes: {
          investigation: { status: 'pending', agentsInvolved: [] },
          trial: { status: 'pending', agentsInvolved: [] },
          appellate: { status: 'pending', agentsInvolved: [] },
          supreme: { status: 'pending', agentsInvolved: [] }
        }
      }] as any)
    )
  });

  await caseDoc.save();
  console.log(`[E2E-Plus] Case created: ${caseDoc.id}`);
  
  const startTime = Date.now();
  console.log(`[E2E-Plus] Starting Full Orchestrated Simulation (Nations -> Assembly -> Outcome)...`);

  while (true) {
    // 1. Trigger Orchestrator
    await simulationService.runPipelineNextSteps(caseDoc.id);

    // 2. Refresh State
    const updatedCase = await Case.findById(caseDoc.id);
    if (!updatedCase) break;

    // 3. Status Reporting
    const nationalStatus = NATIONS.map(n => {
      const countryStr = String(n);
      const p = updatedCase.pipelines.get(countryStr);
      const levels: CourtLevel[] = ['investigation', 'trial', 'appellate', 'supreme'];
      for (const lvl of levels) {
         const node = (p?.nodes as any)?.[lvl];
         if (node?.status !== 'complete') return `${countryStr}:${lvl}(${node?.status})`;
      }
      return `${countryStr}:PASS`;
    }).join(' | ');

    const globalStatus = `Assembly: ${updatedCase.globalAssembly?.status || 'awaiting'} | ICC: ${updatedCase.iccProceedings?.status || 'none'} | Status: ${updatedCase.status}`;
    
    console.log(`[E2E-Plus] [${nationalStatus}] || [${globalStatus}]`);

    // 4. Termination Condition: Final Case Completion
    if (updatedCase.status === 'complete') {
      console.log(`[E2E-Plus] GLOBAL RESOLUTION REACHED.`);
      break;
    }

    // Check for stagnation/errors in global objects
    if (updatedCase.globalAssembly?.status === 'failed' || updatedCase.iccProceedings?.status === 'failed') {
      console.error("[E2E-Plus] Core simulation encountered a global failure.");
      break;
    }

    await new Promise(r => setTimeout(r, 6000));
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n[E2E-Plus] ==========================================`);
  console.log(`[E2E-Plus] ULTIMATE GLOBAL OUTCOME REPORT`);
  console.log(`[E2E-Plus] Total Duration: ${totalTime.toFixed(2)}s`);
  console.log(`[E2E-Plus] Case Status: COMPLETED`);
  console.log(`[E2E-Plus] ==========================================`);

  const finalCase = await Case.findById(caseDoc.id);
  
  if (finalCase?.globalAssembly) {
    console.log(`\n[GLOBAL ASSEMBLY SYNTHESIS]`);
    console.log(`Judgement: ${finalCase.globalAssembly.finalGlobalJudgement}`);
    console.log(`\n[SYNTHESIS REASONING - CROSS VERIFICATION]`);
    console.log(`${finalCase.globalAssembly.synthesisReasoning}`);
  }

  if (finalCase?.iccProceedings?.status === 'complete') {
    console.log(`\n[INTERNATIONAL CRIMINAL COURT VERDICT]`);
    console.log(`Decision: ${finalCase.iccProceedings.verdict?.decision}`);
    console.log(`Sentence: ${finalCase.iccProceedings.verdict?.sentenceOrRemedy}`);
    console.log(`Reasoning: ${finalCase.iccProceedings.reasoning}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

runDualNationTest().catch(err => {
  console.error('[E2E-Plus] Fatal Error:', err);
  process.exit(1);
});
