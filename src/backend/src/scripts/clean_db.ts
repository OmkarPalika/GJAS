import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Constitution from '@/models/Constitution.js';

dotenv.config();

async function cleanDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gjas');
    console.log('Connected to Database');

    const result = await Constitution.deleteOne({ country: 'Sign in' });
    console.log(`Deleted ${result.deletedCount} junk documents.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanDB();
