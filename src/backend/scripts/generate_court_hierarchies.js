import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'gjas';
const COLLECTION_NAME = 'constitutions';
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'court_hierarchies.json');

// Common court hierarchy templates by region
const COURT_TEMPLATES = {
  'common_law': [
    {"name": "Supreme Court", "weight": 3, "level": 1},
    {"name": "Court of Appeal", "weight": 2, "level": 2},
    {"name": "High Court", "weight": 1, "level": 3}
  ],
  'civil_law': [
    {"name": "Constitutional Court", "weight": 3, "level": 1},
    {"name": "Supreme Court", "weight": 2, "level": 2},
    {"name": "Court of Cassation", "weight": 1, "level": 3}
  ],
  'islamic_law': [
    {"name": "Supreme Court", "weight": 3, "level": 1},
    {"name": "Sharia Court of Appeal", "weight": 2, "level": 2},
    {"name": "Sharia Court", "weight": 1, "level": 3}
  ],
  'mixed': [
    {"name": "Constitutional Court", "weight": 3, "level": 1},
    {"name": "Supreme Court", "weight": 2, "level": 2},
    {"name": "Court of Appeal", "weight": 1, "level": 3}
  ]
};

// Countries by legal system (simplified classification)
const COUNTRY_LEGAL_SYSTEMS = {
  // Common law countries
  'common_law': [
    'Australia', 'Canada', 'India', 'United States', 'United Kingdom',
    'New Zealand', 'Singapore', 'Hong Kong', 'Malaysia', 'Pakistan'
  ],
  // Civil law countries
  'civil_law': [
    'France', 'Germany', 'Italy', 'Spain', 'Brazil', 'Mexico',
    'Japan', 'South Korea', 'China', 'Russia', 'Argentina'
  ],
  // Islamic law countries
  'islamic_law': [
    'Saudi Arabia', 'Iran', 'Afghanistan', 'Pakistan', 'Iraq',
    'United Arab Emirates', 'Kuwait', 'Qatar', 'Oman', 'Yemen'
  ]
};

async function generateCourtHierarchies() {
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const constitutions = await db.collection(COLLECTION_NAME).find({}).toArray();
    
    console.log(`Found ${constitutions.length} constitutions`);
    
    const courtHierarchies = [];
    
    for (const constitution of constitutions) {
      const country = constitution.country;
      let template = 'mixed'; // Default to mixed system
      
      // Try to classify by country name
      for (const [system, countries] of Object.entries(COUNTRY_LEGAL_SYSTEMS)) {
        if (countries.some(c => country.includes(c))) {
          template = system;
          break;
        }
      }
      
      // Create court hierarchy
      const courts = COURT_TEMPLATES[template].map(court => ({
        ...court,
        // Add country-specific court names for top court
        name: court.level === 1 ? `${country.split(' ')[0]} ${court.name}` : court.name
      }));
      
      courtHierarchies.push({
        country: country,
        legal_system: template,
        courts: courts
      });
    }
    
    // Save to file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(courtHierarchies, null, 2));
    console.log(`Generated court hierarchies for ${courtHierarchies.length} countries`);
    console.log(`Saved to ${OUTPUT_PATH}`);
    
    // Show sample
    console.log('\nSample hierarchies:');
    courtHierarchies.slice(0, 3).forEach(h => {
      console.log(`\n${h.country}:`);
      h.courts.forEach(court => {
        console.log(`  - ${court.name} (Weight: ${court.weight}, Level: ${court.level})`);
      });
    });
    
  } catch (error) {
    console.error('Error generating court hierarchies:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

generateCourtHierarchies();
