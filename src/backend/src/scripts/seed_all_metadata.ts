import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Mistral } from '@mistralai/mistralai';
import Constitution from '@/models/Constitution.js';

dotenv.config();

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

async function getMetadataFromMistral(country: string): Promise<{ legal_system: string, year: number } | null> {
  try {
    const prompt = `You are a legal expert. What is the primary legal system and current constitution year for the country "${country}"?
Return ONLY a valid JSON object matching this schema exactly:
{
  "legal_system": "common_law" | "civil_law" | "islamic_law" | "mixed",
  "year": <number>
}`;

    const chatResponse = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' }
    });

    const responseContent = chatResponse.choices && chatResponse.choices[0].message.content;
    if (responseContent) {
        return JSON.parse(responseContent as string);
    }
  } catch (error) {
    console.error(`Mistral API Error for ${country}:`, error);
  }
  return null;
}

// Helper to run promises in parallel with concurrency limit
async function asyncPool<T>(poolLimit: number, array: any[], iteratorFn: (item: any, array: any[]) => Promise<T>) {
  const ret: Promise<T>[] = [];
  const executing: Promise<T>[] = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item, array));
    ret.push(p);
    if (poolLimit <= array.length) {
      const e: Promise<T> = p.then(() => {
        executing.splice(executing.indexOf(e), 1);
        return {} as T;
      });
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

async function seedAllMetadata() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gjas');
    console.log('Connected to Database');

    const constitutions = await Constitution.find({});
    console.log(`Found ${constitutions.length} constitutions.`);

    // Filter those that need metadata
    const pendingConstitutions = constitutions.filter(doc => !doc.legal_system || !doc.year);
    console.log(`Missing metadata for ${pendingConstitutions.length} constitutions. Starting Mistral API population...`);

    let updated = 0;

    await asyncPool(5, pendingConstitutions, async (doc) => {
      console.log(`Fetching parameters for ${doc.country}...`);
      const metadata = await getMetadataFromMistral(doc.country);
      
      if (metadata && metadata.legal_system && metadata.year) {
        await Constitution.updateOne(
          { _id: doc._id },
          { $set: { legal_system: metadata.legal_system, year: metadata.year } }
        );
        updated++;
        console.log(`[Success] ${doc.country} -> ${metadata.legal_system}, ${metadata.year}`);
      } else {
        console.warn(`[Failed] Could not parse legal data for ${doc.country}`);
      }
    });

    console.log(`Metadata seeding complete. Updated ${updated} records.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding process failed:', err);
    process.exit(1);
  }
}

seedAllMetadata();
