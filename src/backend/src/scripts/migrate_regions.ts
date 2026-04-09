import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import Constitution from '@/models/Constitution.js'; // Must be executed with tsx or transpiled

dotenv.config();

async function migrateRegions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gjas');
    console.log('Connected to Database');

    console.log('Fetching regional data from restcountries API...');
    const API_URL = 'https://restcountries.com/v3.1/all?fields=name,region';
    const response = await axios.get(API_URL);
    
    // Create a mapping from common name to region
    const regionMap: Record<string, string> = {};
    for (const country of response.data) {
       if (country.name && country.name.common) {
           regionMap[country.name.common.toLowerCase()] = country.region;
       }
       // Map official names too, just in case
       if (country.name && country.name.official) {
           regionMap[country.name.official.toLowerCase()] = country.region;
       }
    }
    
    // Add manual overrides for specific DB naming conflicts
    regionMap['united states of america'] = 'Americas';
    regionMap['usa'] = 'Americas';
    regionMap['uk'] = 'Europe';

    const constitutions = await Constitution.find({});
    console.log(`Found ${constitutions.length} constitutions.`);

    let updated = 0;
    for (const doc of constitutions) {
        // Find region
        const countryName = doc.country.toLowerCase().trim();
        let mappedRegion = regionMap[countryName];
        
        // If exact match fails, try partial mapping
        if (!mappedRegion) {
           for (const [key, value] of Object.entries(regionMap)) {
               if (countryName.includes(key) || key.includes(countryName)) {
                   mappedRegion = value;
                   break;
               }
           }
        }

        if (mappedRegion) {
          doc.region = mappedRegion;
          await Constitution.updateOne({ _id: doc._id }, { $set: { region: doc.region } });
          updated++;
        } else {
          console.warn(`Could not find region for: ${doc.country}`);
        }
    }

    console.log(`Migration complete. Updated ${updated} records.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateRegions();
