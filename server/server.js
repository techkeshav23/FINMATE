import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import multer from 'multer';
import chatRoutes from './routes/chat.js';
import { parseSMS, parseCSVStatement, parseEmailAlert, detectAnomalies } from './services/statementParser.js';
import { parsePDFStatement, extractAccountSummary } from './services/pdfParser.js';
import { learnFromTransactions, recordAnomaly, loadPatterns } from './services/patternLearning.js';

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

// Load transaction data
const transactionsPath = join(__dirname, 'data', 'transactions.json');
const transactions = JSON.parse(readFileSync(transactionsPath, 'utf-8'));

// Make transactions available to routes
app.use((req, res, next) => {
  req.transactions = transactions;
  next();
});

// Routes
app.use('/api/chat', chatRoutes);

// Get transactions endpoint
app.get('/api/transactions', (req, res) => {
  res.json(transactions);
});

// Update transaction endpoint (e.g. for settling)
app.patch('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const { settled } = req.body;
  
  // Validation
  if (typeof settled !== 'boolean') {
    return res.status(400).json({ error: 'Invalid settled status. Must be boolean.' });
  }

  const txnIndex = transactions.transactions.findIndex(t => t.id === id);
  
  if (txnIndex === -1) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  // Update transaction
  transactions.transactions[txnIndex].settled = settled;

  // Persist to disk
  try {
    writeFileSync(transactionsPath, JSON.stringify(transactions, null, 2));
  } catch (error) {
    console.error('Error saving transactions:', error);
    return res.status(500).json({ error: 'Failed to save changes' });
  }
  
  res.json({ 
    message: 'Transaction updated', 
    transaction: transactions.transactions[txnIndex] 
  });
});

// CSV Upload endpoint
app.post('/api/transactions/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or has no data rows' });
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredFields = ['date', 'description', 'amount', 'payer', 'category'];
    const missingFields = requiredFields.filter(f => !header.includes(f));
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required columns: ${missingFields.join(', ')}. Expected: date,description,amount,payer,category` 
      });
    }

    // Parse rows
    const newTransactions = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < header.length) continue;

      const row = {};
      header.forEach((col, idx) => row[col] = values[idx]);

      // Validate row
      const amount = parseFloat(row.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push(`Row ${i + 1}: Invalid amount "${row.amount}"`);
        continue;
      }

      // Check if payer exists in roommates
      if (!transactions.roommates.includes(row.payer)) {
        errors.push(`Row ${i + 1}: Unknown payer "${row.payer}". Valid: ${transactions.roommates.join(', ')}`);
        continue;
      }

      // Create transaction with equal split
      const perPerson = Math.round(amount / transactions.roommates.length);
      const split = {};
      transactions.roommates.forEach((name, idx) => {
        // Handle rounding by giving remainder to first person
        split[name] = idx === 0 ? amount - (perPerson * (transactions.roommates.length - 1)) : perPerson;
      });

      newTransactions.push({
        id: `txn_csv_${Date.now()}_${i}`,
        date: row.date || new Date().toISOString().split('T')[0],
        description: row.description,
        amount: amount,
        payer: row.payer,
        category: row.category || 'Other',
        split: split,
        settled: false
      });
    }

    if (newTransactions.length === 0) {
      return res.status(400).json({ 
        error: 'No valid transactions found in CSV',
        details: errors 
      });
    }

    // Add new transactions
    transactions.transactions.push(...newTransactions);

    // Persist to disk
    writeFileSync(transactionsPath, JSON.stringify(transactions, null, 2));

    res.json({ 
      message: 'Transactions imported successfully',
      added: newTransactions.length,
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
    const { transactions: parsedTxns } = req.body;

    if (!parsedTxns || parsedTxns.length === 0) {
      return res.status(400).json({ error: 'No transactions to import' });
    }

    const newTransactions = parsedTxns.map((txn, idx) => {
      // Create split among roommates
      const perPerson = Math.round(txn.amount / transactions.roommates.length);
      const split = {};
      transactions.roommates.forEach((name, i) => {
        split[name] = i === 0 ? txn.amount - (perPerson * (transactions.roommates.length - 1)) : perPerson;
      });

      return {
        id: `txn_import_${Date.now()}_${idx}`,
        date: txn.date || new Date().toISOString().split('T')[0],
        description: txn.description,
        amount: txn.amount,
        payer: transactions.roommates[0], // Default to first roommate
        category: txn.category || 'Other',
        split,
        settled: false,
        source: txn.source || 'Imported'
      };
    });

    // Add to transactions
    transactions.transactions.push(...newTransactions);

    // Persist to disk
    writeFileSync(transactionsPath, JSON.stringify(transactions, null, 2));

    res.json({ 
      message: 'Transactions imported successfully',
      added: newTransactions.length
    });

    // Re-learn patterns with new data
    learnFromTransactions(transactions.transactions, transactions.roommates);

  } catch (error) {
    console.error('Import confirm error:', error);
    res.status(500).json({ error: 'Failed to import transactions' });
  }
});

// Get anomalies endpoint (with learning)
app.get('/api/transactions/anomalies', (req, res) => {
  try {
    const anomalies = detectAnomalies(transactions.transactions, transactions.roommates);
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
  res.json({ status: 'ok', message: 'FinMate server is running!' });
});

// Initialize patterns on startup
learnFromTransactions(transactions.transactions, transactions.roommates);
console.log('📊 Learned spending patterns from transaction history');

app.listen(PORT, () => {
  console.log(`🚀 FinMate server running on http://localhost:${PORT}`);
});
