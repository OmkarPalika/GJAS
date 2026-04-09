import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Constitution from '@/models/Constitution.js'; // Must be executed with tsx or transpiled

dotenv.config();

const commonLawKeywords = ['united kingdom', 'australia', 'new zealand', 'canada', 'ireland', 'india', 'pakistan', 'singapore', 'malaysia', 'nigeria', 'kenya', 'uganda', 'bahamas', 'jamaica', 'barbados', 'belize', 'fiji', 'islands'];
const islamicLawKeywords = ['saudi arabia', 'iran', 'afghanistan', 'yemen', 'oman', 'mauritius', 'pakistan', 'maldives'];
const mixedLawKeywords = ['south africa', 'scotland', 'philippines', 'egypt', 'algeria', 'morocco', 'sri lanka', 'cyprus', 'zimbabwe'];

async function seedAllFast() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gjas');
    console.log('Connected to Database');

    const constitutions = await Constitution.find({});
    console.log(`Found ${constitutions.length} constitutions.`);

    let updated = 0;

    for (const doc of constitutions) {
      let needsUpdate = false;
      const countryStr = doc.country.toLowerCase();

      // 1. Extract Year from Country string (e.g. "France 1958 rev 2008")
      if (!doc.year) {
         const yearMatches = doc.country.match(/\b(17|18|19|20)\d{2}\b/g);
         if (yearMatches && yearMatches.length > 0) {
           doc.year = parseInt(yearMatches[0], 10);
           needsUpdate = true;
         } else {
           // fallback default
           doc.year = 1990;
           needsUpdate = true; 
         }
      }

      // 2. Heuristic Legal System
      if (!doc.legal_system) {
         let system = 'civil_law'; // default globally most common

         // Check Islamic
         for (const kw of islamicLawKeywords) {
            if (countryStr.includes(kw)) system = 'islamic_law';
         }
         // Check Mixed
         for (const kw of mixedLawKeywords) {
            if (countryStr.includes(kw)) system = 'mixed';
         }
         // Check Common Law
         for (const kw of commonLawKeywords) {
            if (countryStr.includes(kw)) system = 'common_law';
         }

         doc.legal_system = system;
         needsUpdate = true;
      }

      if (needsUpdate) {
         await Constitution.updateOne(
            { _id: doc._id },
            { $set: { year: doc.year, legal_system: doc.legal_system } }
         );
         updated++;
      }
    }

    console.log(`Fast Semantic Seeding complete. Updated ${updated} records.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding process failed:', err);
    process.exit(1);
  }
}

seedAllFast();
