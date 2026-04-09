import path from 'path';
import dotenv from 'dotenv';
import vectorDBService from '../../services/vector_db.service.js';

dotenv.config();

/**
 * Migration script to move data from JSON vector store to ChromaDB
 */
async function migrate() {
  const jsonPath = path.join(process.cwd(), '..', 'data', 'vector_store.json');
  
  try {
    console.log('Starting migration to ChromaDB...');
    console.log('Ensure ChromaDB server is running at http://localhost:8000');
    
    await vectorDBService.migrateFromJson(jsonPath);
    
    console.log('🚀 ChromaDB Migration Successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
