import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import constitutionsRouter from './routes/constitutions.js';
import ragRouter from './routes/rag.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.use('/api/constitutions', constitutionsRouter);
app.use('/api/rag', ragRouter);

// Test route to verify RAG router is loaded
app.get('/api/rag/test', (req, res) => {
  res.json({ status: 'RAG router is loaded' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});