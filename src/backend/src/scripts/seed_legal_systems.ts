import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Constitution from '@/models/Constitution.js'; // Must be executed with tsx or transpiled

dotenv.config();

const metadataMap: Record<string, { legal_system: string, year: number }> = {
  'united states of america': { legal_system: 'common_law', year: 1789 },
  'france': { legal_system: 'civil_law', year: 1958 },
  'india': { legal_system: 'common_law', year: 1950 },
  'germany': { legal_system: 'civil_law', year: 1949 },
  'saudi arabia': { legal_system: 'islamic_law', year: 1992 },
  'united kingdom': { legal_system: 'common_law', year: 1215 },
  'china': { legal_system: 'civil_law', year: 1982 },
  'japan': { legal_system: 'civil_law', year: 1947 },
  'brazil': { legal_system: 'civil_law', year: 1988 },
  'south africa': { legal_system: 'mixed', year: 1996 }
};

async function seedMetadata() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gjas');
    console.log('Connected to Database');

    const constitutions = await Constitution.find({});
    console.log(`Found ${constitutions.length} constitutions.`);

    let updated = 0;
    for (const doc of constitutions) {
        const countryName = doc.country.toLowerCase().trim();
        let metadata = metadataMap[countryName];
        
        // fuzzy match
        if (!metadata) {
           for (const [key, value] of Object.entries(metadataMap)) {
               if (countryName.includes(key)) {
                   metadata = value;
                   break;
               }
           }
        }

        if (metadata) {
          await Constitution.updateOne(
              { _id: doc._id }, 
              { $set: { legal_system: metadata.legal_system, year: metadata.year } }
          );
          updated++;
        }
    }

    console.log(`Metadata seeding complete. Updated ${updated} records.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedMetadata();
