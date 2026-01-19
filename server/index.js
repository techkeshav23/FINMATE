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
app.use((req, res, next) => {
  // Get userId from header (preferred) or query param
  const userId = req.headers['x-user-id'] || req.query.userId || null;
  
  if (userId) {
    // Set the current user context for this request
    db.setCurrentUser(userId);
    console.log(`[User] Request from user: ${userId.substring(0, 12)}...`);
  } else {
    // Default user for backward compatibility
    db.setCurrentUser('default');
  }
  
  next();
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
