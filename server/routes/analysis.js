import express from 'express';
import db from '../services/db.js';

const router = express.Router();

// GET /api/analysis/summary
router.get('/summary', (req, res) => {
  const stats = db.getStats();
  res.json({
    income: stats.total_income || 0,
    expenses: stats.total_expense || 0,
    profit: (stats.total_income || 0) - (stats.total_expense || 0)
  });
});

// GET /api/analysis/trends
router.get('/trends', (req, res) => {
    // Return mock trend data for charts
    const data = [
        { name: 'Week 1', income: 4000, expense: 2400 },
        { name: 'Week 2', income: 3000, expense: 1398 },
        { name: 'Week 3', income: 2000, expense: 9800 },
        { name: 'Week 4', income: 2780, expense: 3908 },
    ];
    res.json(data);
});

export default router;
