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
    // Return REAL monthly trend data (Fix: Removed mock data)
    const monthlyData = db.getMonthlyData();
    
    // Format to match chart expectation (name = label)
    const data = monthlyData.map(m => ({
        name: m.month,
        income: Math.round(m.income),
        expense: Math.round(m.expense),
        profit: Math.round(m.profit)
    }));

    // If no data, return empty array (or minimal placeholder if needed by frontend)
    if (data.length === 0) {
        return res.json([
            { name: 'No Data', income: 0, expense: 0 }
        ]);
    }

    res.json(data);
});

export default router;
