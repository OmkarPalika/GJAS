import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import Registry from '../models/Registry.js';
import dotenv from 'dotenv';
import JURISDICTION_MANIFEST from '@data/jurisdiction_manifest.json' with { type: 'json' };

dotenv.config();

interface RegistryData {
  name: string;
  investigation: string | null;
  trial: string | null;
  appellate: string | null;
  supreme: string;
  sys: string;
  color: string;
  category: string;
  db_query_name?: string;
  simulationWeight: number;
  activeCaseCount: number;
}

async function migrateRegistry() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Validate manifest has standard fields (including simulationWeight)
    const validManifest = Object.entries(JURISDICTION_MANIFEST).map(([key, data]) => {
      const entry = data as any;
      if (entry.simulationWeight === undefined) {
        console.warn(`[Seeder] Warning: ${key} missing simulation parameters.`);
      }
      return [key, data];
    });

    // Phase 1: Seed from centralized manifest
    const DATA_SOURCE = Object.fromEntries(validManifest) as Record<string, RegistryData>;
    
    console.log(`Seeding ${Object.keys(DATA_SOURCE).length} jurisdictions...`);
    
    for (const [code, data] of Object.entries(DATA_SOURCE)) {
      const p5Nations = ['USA', 'GBR', 'FRA', 'RUS', 'CHN'];
      const p5VetoPower = p5Nations.includes(code);
      
      const iccStatesParties = [
        'AFG', 'ALB', 'AND', 'ATG', 'ARG', 'ARM', 'AUS', 'AUT', 'BGD', 'BRB', 'BEL', 'BLZ', 'BEN', 'BOL', 'BIH', 'BWA', 'BRA', 'BGR', 'BFA', 'CPV', 'KHM', 'CAN', 'CAF', 'TCD', 'CHL', 'COL', 'COM', 'COG', 'COK', 'CRI', 'CIV', 'HRV', 'CYP', 'CZE', 'COD', 'DNK', 'DJI', 'DMA', 'DOM', 'ECU', 'SLV', 'EST', 'FJI', 'FIN', 'FRA', 'GAB', 'GMB', 'GEO', 'DEU', 'GHA', 'GRC', 'GRD', 'GTM', 'GIN', 'GUY', 'HND', 'HUN', 'ISL', 'IRL', 'ITA', 'JPN', 'JOR', 'KEN', 'KIR', 'LVA', 'LSO', 'LBR', 'LIE', 'LTU', 'LUX', 'MDG', 'MWI', 'MDV', 'MLI', 'MLT', 'MHL', 'MUS', 'MEX', 'MDA', 'MCO', 'MNG', 'MNE', 'NAM', 'NRU', 'NLD', 'NZL', 'NER', 'NGA', 'NOR', 'PSE', 'PAN', 'PRY', 'PER', 'POL', 'PRT', 'ROU', 'KNA', 'LCA', 'VCT', 'SMR', 'SEN', 'SRB', 'SYC', 'SLE', 'SVK', 'SVN', 'SLB', 'ZAF', 'KOR', 'ESP', 'SUR', 'SWE', 'CHE', 'TJK', 'TZA', 'TLS', 'TGO', 'TTO', 'TUN', 'GBR', 'URY', 'VUT', 'VEN', 'ZMB'
      ];
      
      const treatiesRatified = ['UN Charter', 'Geneva Conventions', 'Outer Space Treaty', 'UNDRIP'];
      if (iccStatesParties.includes(code)) {
        treatiesRatified.push('Rome Statute');
      }
      
      // Regional Bloc Mapping (ECHR, IACHR, etc.)
      const euNations = ['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE'];
      if (euNations.includes(code)) {
        treatiesRatified.push('ECHR');
      }

      await Registry.findOneAndUpdate(
        { countryCode: code },
        {
          $set: {
            name: data.name,
            countryCode: code,
            investigation: data.investigation,
            trial: data.trial,
            appellate: data.appellate,
            supreme: data.supreme,
            sys: data.sys,
            color: data.color,
            category: data.category,
            db_query_name: data.db_query_name || data.name.toLowerCase().replace(/\s+/g, '-'),
            simulationWeight: data.simulationWeight,
            activeCaseCount: data.activeCaseCount,
            p5VetoPower,
            treatiesRatified
          },
          $setOnInsert: {
            'agentMetrics.casesSolved': 0,
            'agentMetrics.performancePoints': 0,
            'agentMetrics.averageConfidence': 0
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    }
    console.log('Centralized manifest seeded successfully.');

    // Phase 2: Merge court_hierarchies.json for RAG weights
    const jsonPath = path.join(process.cwd(), 'src/data/court_hierarchies.json');
    if (fs.existsSync(jsonPath)) {
      console.log('Merging court_hierarchies.json metadata...');
      const rawJson = fs.readFileSync(jsonPath, 'utf-8');
      const hierarchies = JSON.parse(rawJson);

      let merged = 0;
      for (const h of hierarchies) {
        const cleanName = h.country.split(' ')[0];
        const result = await Registry.findOneAndUpdate(
          {
            $or: [
              { name: new RegExp(cleanName, 'i') },
              { countryCode: cleanName.toUpperCase() }
            ]
          },
          {
            $set: {
              courts: h.courts
            }
          },
          { returnDocument: 'after' }
        );
        if (result) merged++;
      }
      console.log(`Merged weights for ${merged} registries.`);
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateRegistry();
