import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import db from '../services/db.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// GET /api/transactions/stats
router.get('/stats', (req, res) => {
  const stats = db.getStats();
  res.json(stats);
});

// GET /api/transactions
router.get('/', (req, res) => {
  const { startDate, endDate, category, search } = req.query;
  // Local DB filters
  const filters = { search }; 
  const txns = db.getTransactions(filters);
  // Date filtering in memory
  let filtered = txns;
  if(startDate) filtered = filtered.filter(t => t.date >= startDate);
  if(endDate) filtered = filtered.filter(t => t.date <= endDate);
  
  res.json(filtered);
});

// POST /api/transactions/upload (CSV)
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
    // Parse with improved options
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle Byte Order Mark (Excel CSVs)
      relax_column_count: true // Be tolerant of trailing commas
    });

    console.log(`[Upload] Parsed ${records.length} records from ${req.file.originalname}`);

    const sourceFileName = req.file.originalname || 'uploaded.csv';
    const uploadBatchId = uuidv4(); 

    const parsedTxns = records.map((record, index) => {
      // Normalize keys (handle case sensitivity)
      const keys = Object.keys(record);
      const getVal = (key) => record[keys.find(k => k.toLowerCase() === key.toLowerCase())];

      const rDate = getVal('date');
      const rDesc = getVal('description') || getVal('desc') || 'Unknown';
      const rAmount = getVal('amount') || getVal('amt') || getVal('value') || 0;
      const rType = getVal('type') || 'debit';
      const rCategory = getVal('category') || 'Uncategorized';

      return {
        id: uuidv4(),
        date: rDate || new Date().toISOString().split('T')[0],
        description: rDesc,
        amount: parseFloat(String(rAmount).replace(/[^0-9.-]+/g, '')), // Remove currency symbols
        type: rType.toLowerCase(),
        category: rCategory,
        source: 'csv',
        sourceFile: sourceFileName,
        uploadBatchId: uploadBatchId,
        uploadedAt: new Date().toISOString(),
        status: 'settled'
      };
    }).filter(t => t.amount !== 0); // Remove 0 amount rows

    // Check for duplicates
    const existingTxns = db.getTransactions();
    const newTxns = parsedTxns.filter(newTxn => {
      return !existingTxns.some(existing => 
        existing.date === newTxn.date && 
        existing.description === newTxn.description && 
        existing.amount === newTxn.amount
      );
    });

    const duplicatesSkipped = parsedTxns.length - newTxns.length;

    // Add to Local DB
    db.addTransactions(newTxns);
    fs.unlinkSync(req.file.path); // Cleanup

    res.json({ 
      message: 'Upload success', 
      added: newTxns.length,
      duplicatesSkipped: duplicatesSkipped,
      total: parsedTxns.length,
      sourceFile: sourceFileName,
      uploadBatchId: uploadBatchId,
      transactionIds: newTxns.map(t => t.id)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to parse CSV' });
  }
});

// POST /api/transactions/parse-statement (Simulation for PDF/Img)
router.post('/parse-statement', upload.single('file'), (req, res) => {
   // In a real app, use PDF parsing here. 
   // For Hackathon prototype, we mock extracting some transactions from a "statement"
   
   const mockParsed = [
     { id: uuidv4(), date: "2024-01-15", description: "Stock Purchase", amount: 450, type: "debit", category: "Inventory" },
     { id: uuidv4(), date: "2024-01-15", description: "UPI Payment Received", amount: 200, type: "credit", category: "Sales" },
     { id: uuidv4(), date: "2024-01-14", description: "Utilities Payment", amount: 1100, type: "debit", category: "Utilities" }
   ];

   res.json({ 
     parsed: mockParsed,
     message: "Successfully parsed statement"
   });
});

// POST /api/transactions/confirm-import
router.post('/confirm-import', (req, res) => {
  const { transactions } = req.body;
  const withIds = transactions.map(t => ({ ...t, id: t.id || uuidv4() }));
  db.addTransactions(withIds);
  res.json({ success: true, added: withIds.length });
});

// DELETE /api/transactions
router.delete('/', (req, res) => {
  if (req.query.confirm === 'true') {
    db.clearTransactions();
    res.json({ message: 'All transactions cleared' });
  } else {
    res.status(400).json({ error: 'Confirmation required' });
  }
});

// DELETE /api/transactions/batch - Delete transactions by IDs
router.delete('/batch', (req, res) => {
  const { transactionIds } = req.body;
  if (!transactionIds || !Array.isArray(transactionIds)) {
    return res.status(400).json({ error: 'Transaction IDs required' });
  }
  
  const txns = db.getCollection('transactions');
  const filtered = txns.filter(t => !transactionIds.includes(t.id));
  db.saveCollection('transactions', filtered);
  
  res.json({ 
    message: 'Transactions deleted', 
    deleted: txns.length - filtered.length 
  });
});

// DELETE /api/transactions/by-source - Delete by source file
router.delete('/by-source', (req, res) => {
  const { sourceFile } = req.query;
  if (!sourceFile) {
    return res.status(400).json({ error: 'Source file required' });
  }
  
  const txns = db.getCollection('transactions');
  const filtered = txns.filter(t => t.sourceFile !== sourceFile);
  db.saveCollection('transactions', filtered);
  
  res.json({ 
    message: 'Transactions deleted', 
    deleted: txns.length - filtered.length 
  });
});

// GET /api/transactions/categories
router.get('/categories', (req, res) => {
    // Basic aggregation
    const txns = db.getTransactions();
    const catMap = {};
    txns.forEach(t => {
        if(t.type === 'debit') {
            catMap[t.category] = (catMap[t.category] || 0) + parseFloat(t.amount);
        }
    });

    const stats = Object.keys(catMap).map(k => ({ category: k, value: catMap[k] }));
    res.json(stats);
});

export default router;
