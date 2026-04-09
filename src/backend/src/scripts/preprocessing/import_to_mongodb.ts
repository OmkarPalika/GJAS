import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const INPUT_DIR = path.join(process.cwd(), '..', 'data', 'cleaned_constitutions');
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'gjas';
const COLLECTION_NAME = 'constitutions';

async function importToMongoDB() {
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Read all files in the input directory
    const files = fs.readdirSync(INPUT_DIR);
    
    for (const file of files) {
      const filePath = path.join(INPUT_DIR, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile() && file.endsWith('.txt')) {
        const constitutionText = fs.readFileSync(filePath, 'utf-8');
        
        // Extract country name from file name
        const countryName = file.replace('.txt', '').replace(/_/g, ' ');
        
        // Insert into MongoDB
        await collection.insertOne({
          country: countryName,
          text: constitutionText,
          fileName: file,
          createdAt: new Date()
        });
        
        console.log(`Inserted: ${countryName}`);
      }
    }

    console.log('Import to MongoDB complete!');
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

importToMongoDB();