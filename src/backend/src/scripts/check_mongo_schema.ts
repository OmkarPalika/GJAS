import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('gjas');
    const doc = await db.collection('constitutions').findOne({});
    console.log('MongoDB Schema Sample:');
    console.log(JSON.stringify(doc, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkSchema();
