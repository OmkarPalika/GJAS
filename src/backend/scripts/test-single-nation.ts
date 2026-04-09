
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Case from '../src/models/Case.js';
import { judicialResolver } from '../src/services/simulation/judicial.resolver.js';
import { CourtLevel, CountryCode } from '../src/services/simulation.service.js';

dotenv.config();

async function runBenchmark() {
  const TEST_COUNTRY: CountryCode = 'USA';
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gjas';
  
  console.log(`[Benchmark] Connecting to ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);

  // REUSE THE SAME CASE BUT ADD USA TO IT
  const caseDoc = await Case.findOne().sort({ createdAt: -1 });
  if (!caseDoc) {
     console.error("No case found.");
     process.exit(1);
  }

  console.log(`[Benchmark] Adding ${TEST_COUNTRY} to existing case ${caseDoc.id}`);
  caseDoc.pipelines.set(TEST_COUNTRY, {
    country: TEST_COUNTRY,
    legalSystem: 'Common Law',
    nodes: {
      investigation: { status: 'pending', agentsInvolved: [] },
      trial: { status: 'pending', agentsInvolved: [] },
      appellate: { status: 'pending', agentsInvolved: [] },
      supreme: { status: 'pending', agentsInvolved: [] }
    }
  });
  await caseDoc.save();

  console.log(`[Benchmark] Starting End-to-End timing for ${TEST_COUNTRY} on Case ${caseDoc.id}`);
  console.log(`[Benchmark] -----------------------------------------------------------------`);
  
  const levels: CourtLevel[] = ['investigation', 'trial', 'appellate', 'supreme'];
  const startTime = Date.now();
  const phaseTimings: Record<string, number> = {};

  for (const level of levels) {
    console.log(`[Benchmark] Phase: ${level.toUpperCase()}...`);
    const phaseStart = Date.now();
    
    // Call the resolver directly to bypass the global orchestrator
    await judicialResolver.resolveNode(caseDoc.id, TEST_COUNTRY, level);
    
    const duration = (Date.now() - phaseStart) / 1000;
    phaseTimings[level] = duration;
    console.log(`[Benchmark] Phase ${level.toUpperCase()} completed in ${duration.toFixed(2)}s`);
  }

  const totalDuration = (Date.now() - startTime) / 1000;
  
  console.log(`[Benchmark] -----------------------------------------------------------------`);
  console.log(`[Benchmark] SUMMARY REPORT`);
  Object.entries(phaseTimings).forEach(([lvl, time]) => {
    console.log(` - ${lvl.padEnd(15)}: ${time.toFixed(2)}s`);
  });
  console.log(`[Benchmark] TOTAL DURATION : ${totalDuration.toFixed(2)}s`);
  console.log(`[Benchmark] -----------------------------------------------------------------`);

  fs.writeFileSync('timing_results.json', JSON.stringify({
    TEST_COUNTRY,
    caseId: caseDoc.id,
    phaseTimings,
    totalDuration
  }, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

runBenchmark().catch(err => {
  console.error('[Benchmark] Fatal Error:', err);
  process.exit(1);
});
