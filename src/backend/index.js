import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import WebSocketServer from './services/websocket.js';
import constitutionsRouter from './routes/constitutions.js';
import ragRouter from './routes/rag.js';
import authRouter from './routes/auth.js';
import caseLawRouter from './routes/caseLaw.js';
import treatiesRouter from './routes/treaties.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for WebSocket
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gjas')
.then(() => {
  console.log('Connected to MongoDB');
  
  // Initialize WebSocket server after DB connection
  const wsServer = new WebSocketServer(httpServer);
  console.log('WebSocket server initialized');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ status: 'Server is running' });
});

// API routes
app.use('/api/constitutions', constitutionsRouter);
app.use('/api/rag', ragRouter);
app.use('/api/auth', authRouter);
app.use('/api/case-law', caseLawRouter);
app.use('/api/treaties', treatiesRouter);

// Test route to verify RAG router is loaded
app.get('/api/rag/test', (req, res) => {
  res.json({ status: 'RAG router is loaded' });
});

// Use HTTP server instead of app.listen to support WebSocket
httpServer.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});