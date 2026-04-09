import mongoose from 'mongoose';
import Case from '../src/models/Case.js';
import { GLOBAL_COURT_REGISTRY } from '../src/lib/court_registry.js';

async function inspect() {
  await mongoose.connect('mongodb://localhost:27017/gjas');
  const c = await Case.findOne().sort({ createdAt: -1 });
  if (!c) {
    console.log('No cases found.');
    process.exit(0);
  }

  console.log(`\n[Inspect] Case ID: ${c._id}`);
  console.log(`[Inspect] Global Status: ${c.status.toUpperCase()}`);
  console.log('--------------------------------------------------');

  const countries = Object.keys(GLOBAL_COURT_REGISTRY);
  const phaseOrder = ['investigation', 'trial', 'appellate', 'supreme'];
  
  for (const country of countries as any[]) {
    const pipeline = c.pipelines.get(country);
    if (!pipeline) {
      console.log(`${country}: [NOT INITIALIZED]`);
      continue;
    }

    const statuses = phaseOrder.map(phase => {
      const node = (pipeline.nodes as any)[phase];
      const statusIcon = node.status === 'complete' ? '✅' : 
                         node.status === 'deliberating' ? '⏳' : 
                         node.status === 'failed' ? '❌' : 
                         node.status === 'pending' ? '⋯' : node.status;
      return `${phase.slice(0, 3)}:${statusIcon}`;
    });

    console.log(`${country.padEnd(4)}: ${statuses.join(' | ')}`);
  }

  console.log('--------------------------------------------------');
  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
