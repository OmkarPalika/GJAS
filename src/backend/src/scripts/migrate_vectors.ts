import vectorDBService from '@/services/vector_db.service.js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const jsonPath = path.resolve('O:/Projects/GJAS/src/data/vector_store.json');
  try {
    await vectorDBService.initialize();
    await vectorDBService.migrateFromJson(jsonPath);
    process.exit(0);
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  }
}

run();
