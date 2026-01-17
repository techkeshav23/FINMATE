import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import multer from 'multer';
import chatRoutes from './routes/chat.js';
import { parseSMS, parseCSVStatement, parseEmailAlert, detectAnomalies } from './services/parsers/statementParser.js';
import { parsePDFStatement, extractAccountSummary } from './services/parsers/pdfParser.js';
import { learnFromTransactions, recordAnomaly, loadPatterns } from './services/memory/patternLearning.js';
import { setParticipantPatterns } from './services/memory/conversationMemory.js';
import { detectPersonaFromData } from './config/systemPrompt.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Configure multer for file uploads (CSV and PDF)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for PDFs
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/pdf', 'text/plain'];
    const allowedExtensions = ['.csv', '.pdf', '.txt'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, PDF, and TXT files are allowed'), false);
    }
  }
});

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Default data structure for FinMate - Supports ALL personas
const getDefaultDataStructure = () => ({
  config: {
    persona: null, // Will be auto-detected: solo, traveler, household, group, vendor
    currency: 'INR',
    currencySymbol: '₹',
    userName: null,
    participants: [], // For group scenarios (roommates, family members, etc.)
    accounts: [],     // Bank accounts for multi-account tracking
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  },
  transactions: [],
  income: [],      // For vendor/business persona
  budgets: [],     // Budget goals
  goals: []        // Savings goals
});

// Load transaction data
const dataPath = join(__dirname, 'data', 'transactions.json');
let appData;

try {
  if (process.env.RESET_DATA === 'true') {
    appData = getDefaultDataStructure();
  } else if (existsSync(dataPath)) {
    const loadedData = JSON.parse(readFileSync(dataPath, 'utf-8'));
    // Migrate old structure if needed
    if (loadedData.roommates !== undefined && !loadedData.config) {
      console.log('📦 Migrating old data structure to new format...');
      appData = {
        config: {
          persona: loadedData.roommates?.length > 1 ? 'group' : 'solo',
          currency: 'INR',
          currencySymbol: '₹',
          userName: null,
          participants: loadedData.roommates || [],
          accounts: [],
          createdAt: loadedData.lastUpdated || new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        transactions: loadedData.transactions || [],
        income: [],
        budgets: [],
        goals: []
      };
    } else {
      appData = loadedData;
    }
  } else {
    appData = getDefaultDataStructure();
  }
} catch (error) {
  console.error('Error loading data:', error.message);
  appData = getDefaultDataStructure();
}

// Auto-detect persona from data
const detectedPersona = detectPersonaFromData(appData);
if (detectedPersona && !appData.config.persona) {
  appData.config.persona = detectedPersona;
  console.log(`🎭 Auto-detected persona: ${detectedPersona}`);
}

// Initialize participant patterns for conversation context
const initialParticipants = appData.config?.participants || [];
if (initialParticipants.length > 0) {
  setParticipantPatterns(initialParticipants);
  console.log(`👥 Initialized participant patterns: ${initialParticipants.join(', ')}`);
}

// Helper to save data
const saveData = () => {
  appData.config.lastUpdated = new Date().toISOString();
  writeFileSync(dataPath, JSON.stringify(appData, null, 2));
};

// Make data available to routes
app.use((req, res, next) => {
  req.appData = appData;
  // Backward compatibility
  req.transactions = {
    transactions: appData.transactions,
    roommates: appData.config?.participants || [],
    config: appData.config
  };
  next();
});

// Routes
app.use('/api/chat', chatRoutes);

// Get transactions endpoint
app.get('/api/transactions', (req, res) => {
  res.json(appData);
});

// Get/Update config endpoint
app.get('/api/config', (req, res) => {
  res.json(appData.config);
});

app.patch('/api/config', (req, res) => {
  const { persona, currency, currencySymbol, userName, participants } = req.body;
  
  if (persona) appData.config.persona = persona;
  if (currency) appData.config.currency = currency;
  if (currencySymbol) appData.config.currencySymbol = currencySymbol;
  if (userName) appData.config.userName = userName;
  if (participants) {
    appData.config.participants = participants;
    setParticipantPatterns(participants);
  }
  
  saveData();
  res.json({ message: 'Config updated', config: appData.config });
});

// Update transaction endpoint (e.g. for settling)
app.patch('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const { settled } = req.body;
  
  // Validation
  if (typeof settled !== 'boolean') {
    return res.status(400).json({ error: 'Invalid settled status. Must be boolean.' });
  }

  const txnIndex = appData.transactions.findIndex(t => t.id === id);
  
  if (txnIndex === -1) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  // Update transaction
  appData.transactions[txnIndex].settled = settled;

  // Persist to disk
  try {
    saveData();
  } catch (error) {
    console.error('Error saving transactions:', error);
    return res.status(500).json({ error: 'Failed to save changes' });
  }
  
  res.json({ 
    message: 'Transaction updated', 
    transaction: appData.transactions[txnIndex] 
  });
});

// ==================== DATA MANAGEMENT ENDPOINTS ====================

/**
 * DELETE /api/transactions/:id - Delete a single transaction
 */
app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  
  const txnIndex = appData.transactions.findIndex(t => t.id === id);
  
  if (txnIndex === -1) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  const deleted = appData.transactions.splice(txnIndex, 1)[0];
  
  try {
    saveData();
    res.json({ message: 'Transaction deleted', deleted });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

/**
 * POST /api/transactions/delete-batch - Delete multiple transactions by IDs
 * Used when deleting a file's worth of transactions
 */
app.post('/api/transactions/delete-batch', (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No transaction IDs provided' });
    }
    
    const idsToDelete = new Set(ids);
    const originalCount = appData.transactions.length;
    
    appData.transactions = appData.transactions.filter(t => !idsToDelete.has(t.id));
    
    const deletedCount = originalCount - appData.transactions.length;
    
    saveData();
    res.json({ 
      message: 'Transactions deleted',
      deletedCount,
      requestedCount: ids.length
    });
  } catch (error) {
    console.error('Error batch deleting transactions:', error);
    res.status(500).json({ error: 'Failed to delete transactions' });
  }
});

/**
 * DELETE /api/transactions - Clear ALL transactions (reset data)
 */
app.delete('/api/transactions', (req, res) => {
  const { confirm } = req.query;
  
  if (confirm !== 'true') {
    return res.status(400).json({ 
      error: 'Confirmation required',
      hint: 'Add ?confirm=true to confirm deletion of all transactions'
    });
  }
  
  const deletedCount = appData.transactions.length;
  appData.transactions = [];
  
  // Also clear related data
  appData.income = [];
  appData.budgets = [];
  appData.goals = [];
  
  try {
    saveData();
    res.json({ 
      message: 'All transactions cleared',
      deletedCount,
      note: 'Your config (persona, participants) is preserved'
    });
  } catch (error) {
    console.error('Error clearing transactions:', error);
    res.status(500).json({ error: 'Failed to clear transactions' });
  }
});

/**
 * POST /api/transactions/replace - Replace ALL transactions with new data
 * Use this when user wants to overwrite with a fresh upload
 */
app.post('/api/transactions/replace', (req, res) => {
  const { transactions, confirm } = req.body;
  
  if (confirm !== true) {
    return res.status(400).json({
      error: 'Confirmation required',
      hint: 'Include { confirm: true } in request body to replace all data'
    });
  }
  
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'transactions must be an array' });
  }
  
  const oldCount = appData.transactions.length;
  appData.transactions = transactions;
  
  try {
    saveData();
    res.json({
      message: 'Transactions replaced',
      previous: oldCount,
      current: transactions.length
    });
  } catch (error) {
    console.error('Error replacing transactions:', error);
    res.status(500).json({ error: 'Failed to replace transactions' });
  }
});

/**
 * GET /api/data/stats - Get data statistics (for UI display)
 */
app.get('/api/data/stats', (req, res) => {
  const transactions = appData.transactions || [];
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Group by source
  const sources = {};
  transactions.forEach(t => {
    const src = t.source || 'Manual';
    sources[src] = (sources[src] || 0) + 1;
  });
  
  // Date range
  const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d));
  const oldest = dates.length > 0 ? new Date(Math.min(...dates)) : null;
  const newest = dates.length > 0 ? new Date(Math.max(...dates)) : null;
  
  res.json({
    transactionCount: transactions.length,
    totalAmount: total,
    sources,
    dateRange: oldest && newest ? {
      from: oldest.toISOString().split('T')[0],
      to: newest.toISOString().split('T')[0]
    } : null,
    persona: appData.config?.persona,
    participants: appData.config?.participants || []
  });
});

// CSV Upload endpoint - Now flexible for any persona
app.post('/api/transactions/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique file ID for tracking which transactions belong to which file
    const fileId = `file_${Date.now()}`;
    const fileName = req.file.originalname || 'Uploaded CSV';
    
    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or has no data rows' });
    }

    // Parse header - flexible column detection
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    // Minimum required fields
    const hasDate = header.includes('date');
    const hasAmount = header.includes('amount');
    const hasDescription = header.some(h => ['description', 'narration', 'details', 'particulars'].includes(h));
    
    if (!hasAmount) {
      return res.status(400).json({ 
        error: 'CSV must have at least an "amount" column',
        hint: 'Expected columns: date, description/narration, amount, category (optional: payer for group expenses)'
      });
    }

    // Detect if this is group (has payer column) or solo (no payer)
    const hasPayer = header.includes('payer');
    const hasCategory = header.includes('category');
    
    // Parse rows
    const newTransactions = [];
    const errors = [];
    const discoveredParticipants = new Set();
    const descCol = header.findIndex(h => ['description', 'narration', 'details', 'particulars'].includes(h));

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < header.length) continue;

      const row = {};
      header.forEach((col, idx) => row[col] = values[idx]);

      // Validate amount
      const amount = parseFloat(row.amount?.replace(/[₹,]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        errors.push(`Row ${i + 1}: Invalid amount "${row.amount}"`);
        continue;
      }

      // Track payers for group detection
      if (row.payer) {
        discoveredParticipants.add(row.payer);
      }

      // Build transaction with sourceFile tracking
      const txn = {
        id: `txn_csv_${Date.now()}_${i}`,
        date: row.date || new Date().toISOString().split('T')[0],
        description: row[header[descCol]] || row.description || row.narration || 'Transaction',
        amount: amount,
        category: row.category || 'Other',
        settled: false,
        source: 'CSV Import',
        sourceFile: {
          id: fileId,
          name: fileName
        }
      };

      // Add payer if group expense
      if (row.payer) {
        txn.payer = row.payer;
      }

      newTransactions.push(txn);
    }

    if (newTransactions.length === 0) {
      return res.status(400).json({ 
        error: 'No valid transactions found in CSV',
        details: errors 
      });
    }

    // Update participants if we discovered any
    if (discoveredParticipants.size > 0) {
      const existingParticipants = new Set(appData.config.participants || []);
      discoveredParticipants.forEach(p => existingParticipants.add(p));
      appData.config.participants = Array.from(existingParticipants);
      setParticipantPatterns(appData.config.participants);
      console.log(`👥 Participants: ${appData.config.participants.join(', ')}`);
    }

    // Auto-detect persona if not set
    if (!appData.config.persona) {
      if (discoveredParticipants.size > 1) {
        appData.config.persona = 'group';
      } else {
        appData.config.persona = 'solo';
      }
      console.log(`🎭 Auto-set persona: ${appData.config.persona}`);
    }

    // Add splits for group expenses if we have participants
    if (appData.config.persona === 'group' && appData.config.participants.length > 0) {
      newTransactions.forEach(txn => {
        if (txn.payer && !txn.split) {
          const participants = appData.config.participants;
          const perPerson = Math.round(txn.amount / participants.length);
          txn.split = {};
          participants.forEach((name, idx) => {
            txn.split[name] = idx === 0 ? txn.amount - (perPerson * (participants.length - 1)) : perPerson;
          });
        }
      });
    }

    // Add new transactions
    appData.transactions.push(...newTransactions);
    saveData();

    // Calculate total amount for tracking
    const totalAmount = newTransactions.reduce((sum, txn) => sum + txn.amount, 0);

    res.json({ 
      message: 'Transactions imported successfully',
      added: newTransactions.length,
      transactionIds: newTransactions.map(t => t.id),
      totalAmount: totalAmount,
      fileId: fileId,
      fileName: fileName,
      persona: appData.config.persona,
      participants: appData.config.participants,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
});

// Bank Statement / SMS / Email / PDF Parser endpoint
app.post('/api/transactions/parse-statement', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const sourceType = req.body.sourceType || 'bank';
    const isPDF = req.file.originalname.toLowerCase().endsWith('.pdf') || req.file.mimetype === 'application/pdf';
    
    let parsed = [];
    let bankInfo = null;

    // Handle PDF files
    if (isPDF) {
      console.log('Processing PDF file...');
      const pdfResult = await parsePDFStatement(req.file.buffer);
      
      if (!pdfResult.success) {
        return res.status(400).json({ 
          error: pdfResult.error || 'Failed to parse PDF',
          hint: 'Make sure the PDF is a valid bank statement with transaction data'
        });
      }
      
      parsed = pdfResult.parsed;
      bankInfo = {
        bank: pdfResult.bank,
        summary: await extractAccountSummary(req.file.buffer)
      };
    } else {
      // Handle text-based files (CSV, TXT)
      const content = req.file.buffer.toString('utf-8');

      if (sourceType === 'sms') {
        parsed = parseSMS(content);
      } else if (sourceType === 'email') {
        parsed = parseEmailAlert(content);
      } else {
        // Try CSV first, then SMS patterns
        parsed = parseCSVStatement(content);
        if (parsed.length === 0) {
          parsed = parseSMS(content);
        }
      }
    }

    if (parsed.length === 0) {
      return res.status(400).json({ 
        error: 'Could not parse any transactions. Please check the format.',
        hint: isPDF ? 'The PDF might be scanned/image-based. Try a text-based statement.' : 'Ensure the file contains valid transaction data.'
      });
    }

    res.json({ 
      parsed,
      count: parsed.length,
      message: `Found ${parsed.length} transactions`,
      bankInfo
    });

  } catch (error) {
    console.error('Statement parse error:', error);
    res.status(500).json({ error: 'Failed to parse statement: ' + error.message });
  }
});

// Parse text directly (for pasted SMS/content)
app.post('/api/transactions/parse-text', (req, res) => {
  try {
    const { text, sourceType } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text content provided' });
    }

    let parsed = [];

    if (sourceType === 'sms') {
      parsed = parseSMS(text);
    } else if (sourceType === 'email') {
      parsed = parseEmailAlert(text);
    } else {
      parsed = parseSMS(text); // Default to SMS parser for text
    }

    if (parsed.length === 0) {
      return res.status(400).json({ 
        error: 'Could not parse any transactions from the text. Please check the format.',
        hint: 'Try SMS format like: "HDFC: Rs.1500 debited on 15-01-26 for SWIGGY"'
      });
    }

    res.json({ 
      parsed,
      count: parsed.length,
      message: `Found ${parsed.length} transactions`
    });

  } catch (error) {
    console.error('Text parse error:', error);
    res.status(500).json({ error: 'Failed to parse text' });
  }
});

// Confirm import of parsed transactions
app.post('/api/transactions/confirm-import', (req, res) => {
  try {
    const { transactions: parsedTxns, defaultPayer, fileName, sourceType } = req.body;

    if (!parsedTxns || parsedTxns.length === 0) {
      return res.status(400).json({ error: 'No transactions to import' });
    }

    // Generate file ID for tracking
    const fileId = `file_${Date.now()}`;
    const finalFileName = fileName || `${sourceType || 'Import'}_${new Date().toLocaleDateString()}`;

    const participants = appData.config.participants || [];
    const isGroupMode = appData.config.persona === 'group' && participants.length > 0;

    const newTransactions = parsedTxns.map((txn, idx) => {
      const transaction = {
        id: `txn_import_${Date.now()}_${idx}`,
        date: txn.date || new Date().toISOString().split('T')[0],
        description: txn.description,
        amount: txn.amount,
        category: txn.category || 'Other',
        settled: false,
        source: txn.source || 'Imported',
        sourceFile: {
          id: fileId,
          name: finalFileName
        }
      };

      // Only add payer/split for group mode
      if (isGroupMode) {
        transaction.payer = defaultPayer || participants[0] || 'Unknown';
        
        // Create equal split
        const perPerson = Math.round(txn.amount / participants.length);
        transaction.split = {};
        participants.forEach((name, i) => {
          transaction.split[name] = i === 0 ? txn.amount - (perPerson * (participants.length - 1)) : perPerson;
        });
      }

      return transaction;
    });

    // Add to transactions
    appData.transactions.push(...newTransactions);
    saveData();

    // Calculate total amount for tracking
    const totalAmount = newTransactions.reduce((sum, txn) => sum + txn.amount, 0);

    res.json({ 
      message: 'Transactions imported successfully',
      added: newTransactions.length,
      transactionIds: newTransactions.map(t => t.id),
      totalAmount: totalAmount,
      fileId: fileId,
      fileName: finalFileName,
      persona: appData.config.persona
    });

    // Re-learn patterns with new data
    learnFromTransactions(appData.transactions, participants);

  } catch (error) {
    console.error('Import confirm error:', error);
    res.status(500).json({ error: 'Failed to import transactions' });
  }
});

// Get anomalies endpoint (with learning)
app.get('/api/transactions/anomalies', (req, res) => {
  try {
    const participants = appData.config?.participants || [];
    const anomalies = detectAnomalies(appData.transactions, participants);
    res.json({ anomalies });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

// Mark anomaly as false positive (for learning)
app.post('/api/transactions/anomaly-feedback', (req, res) => {
  try {
    const { anomalyId, wasAccurate, category, amount } = req.body;
    
    recordAnomaly({
      id: anomalyId,
      category,
      amount,
      wasAccurate
    });
    
    res.json({ 
      message: 'Feedback recorded',
      note: wasAccurate === false 
        ? 'Thanks! I\'ll be less sensitive to similar expenses in the future.'
        : 'Thanks for confirming! This helps me learn your patterns.'
    });
  } catch (error) {
    console.error('Anomaly feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get learned patterns endpoint
app.get('/api/transactions/patterns', (req, res) => {
  try {
    const patterns = loadPatterns();
    res.json({ 
      patterns,
      summary: {
        categoriesLearned: Object.keys(patterns.categoryAverages).length,
        anomaliesRecorded: patterns.anomalyHistory.length,
        settlementsRecorded: patterns.settledHistory.length,
        lastUpdated: patterns.lastUpdated
      }
    });
  } catch (error) {
    console.error('Patterns fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'FinMate server is running!',
    persona: appData.config?.persona || 'not set',
    transactionCount: appData.transactions?.length || 0
  });
});

// Initialize patterns on startup
const startupParticipants = appData.config?.participants || [];
learnFromTransactions(appData.transactions, startupParticipants);
console.log('📊 Learned spending patterns from transaction history');
console.log(`🎭 Current persona: ${appData.config?.persona || 'not set'}`);
console.log(`📝 Transactions loaded: ${appData.transactions?.length || 0}`);

app.listen(PORT, () => {
  console.log(`🚀 FinMate server running on http://localhost:${PORT}`);
});
