import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import chatRoutes from './routes/chat.js';
import transactionRoutes from './routes/transactions.js';
import analysisRoutes from './routes/analysis.js';
import db from './services/db.js';

// Config
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // For serving uploaded files if needed

// User identification middleware - extracts userId from header or query
app.use(db.userMiddleware);

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: '🪙 FinMate API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat',
      transactions: '/api/transactions',
      analysis: '/api/analysis'
    },
    documentation: 'See README.md for API documentation',
    frontend: 'Run client on port 5173 (npm run dev in /client folder)'
  });
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analysis', analysisRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
