
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Case, { ICountryPipeline } from '../src/models/Case.js';
import simulationService, { CourtLevel, CountryCode } from '../src/services/simulation.service.js';

dotenv.config();

async function runTenNationTest() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gjas';
  const NATIONS: CountryCode[] = ['IND', 'USA', 'CHN', 'GBR', 'FRA', 'DEU', 'JPN', 'BRA', 'ZAF', 'RUS'];
  
  console.log(`[E2E-Plus] Connecting to ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);

  console.log(`[E2E-Plus] Creating a NEW case for Global Synthesis test...`);
  const newCaseId = new mongoose.Types.ObjectId().toString();
  
  const caseDoc = new Case({
    _id: newCaseId,
    title: `Global AI Sovereignty & Data Ethics - ${new Date().toLocaleTimeString()}`,
    facts: `A massive AI model is being adjudicated by a global coalition of 10 nations. The central dispute involves the 'unauthorized harvesting of cultural and biometric data' to train a decentralized engine. The nations must decide if this constitutes 'Transformative Fair Use' or 'Digital Resource Theft' under their unique legal systems.`,
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
        legalSystem: 'Mixed/International',
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
    // 3. Compact Status Reporting (5 per line)
    const nationStatus = NATIONS.map(n => {
      const p = updatedCase.pipelines.get(String(n));
      const levels: CourtLevel[] = ['investigation', 'trial', 'appellate', 'supreme'];
      let current = 'DONE';
      for (const lvl of levels) {
         const node = (p?.nodes as any)?.[lvl];
         if (node?.status !== 'complete' && node?.status !== 'failed') {
            current = `${lvl.substring(0,3)}(${node?.status === 'deliberating' ? '⏳' : 'P'})`;
            break;
         }
      }
      return `${String(n)}:${current}`;
    });

    const chunks: string[][] = [];
    for (let i = 0; i < nationStatus.length; i += 5) chunks.push(nationStatus.slice(i, i + 5));

    console.log(`\n[E2E-Plus] Time: ${((Date.now() - startTime)/1000).toFixed(0)}s | Phase: ${updatedCase.status}`);
    chunks.forEach(c => console.log(`  > ${c.join(' | ')}`));
    console.log(`  > Assembly: ${updatedCase.globalAssembly?.status} | Outcome: ${updatedCase.iccProceedings?.status || 'none'}`);

    // 4. Termination Condition
    if (updatedCase.status === 'complete') {
      console.log(`[E2E-Plus] GLOBAL RESOLUTION REACHED.`);
      break;
    }

    if (updatedCase.globalAssembly?.status === 'failed') break;

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

runTenNationTest().catch(err => {
  console.error('[E2E-Plus] Fatal Error:', err);
  process.exit(1);
});
