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
import simulationRouter from './routes/simulation.js';
import registryRouter from './routes/registry.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for WebSocket
const httpServer = createServer(app);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
  
  // Initialize WebSocket server after DB connection
  WebSocketServer.init(httpServer);
  console.log('WebSocket server initialized');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// API routes
app.use('/api/constitutions', constitutionsRouter);
app.use('/api/rag', ragRouter);
app.use('/api/auth', authRouter);
app.use('/api/case-law', caseLawRouter);
app.use('/api/treaties', treatiesRouter);
app.use('/api/simulate', simulationRouter);
app.use('/api/registry', registryRouter);

// Note: /api/rag/test is served by ragRouter directly

// Use HTTP server instead of app.listen to support WebSocket
httpServer.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});