/**
 * Anomaly Detection Service - Pattern detection and change analysis
 * Handles anomaly responses, change detection, and comparison views
 */

import { detectAnomalies } from '../parsers/statementParser.js';
import { addConfidence } from './analysisService.js';
import { loadPatterns, savePatterns } from '../memory/patternLearning.js';

/**
 * Detect changes between time periods - PERSONA-AWARE
 */
export const detectChanges = (data, period1 = 'lastMonth', period2 = 'thisMonth') => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  
  // Parse periods
  const now = new Date();
  const thisMonth = { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  const lastMonth = { 
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end: new Date(now.getFullYear(), now.getMonth(), 0)
  };
  
  const filterByPeriod = (txns, period) => {
    return txns.filter(t => {
      const date = new Date(t.date);
      return date >= period.start && date <= period.end;
    });
  };
  
  const thisMonthTxns = filterByPeriod(transactions, thisMonth);
  const lastMonthTxns = filterByPeriod(transactions, lastMonth);
  
  const thisTotal = thisMonthTxns.reduce((sum, t) => sum + t.amount, 0);
  const lastTotal = lastMonthTxns.reduce((sum, t) => sum + t.amount, 0);
  
  // Category comparison
  const getCategories = (txns) => {
    const cats = {};
    txns.forEach(t => {
      const cat = t.category || 'Other';
      cats[cat] = (cats[cat] || 0) + t.amount;
    });
    return cats;
  };
  
  const thisCats = getCategories(thisMonthTxns);
  const lastCats = getCategories(lastMonthTxns);
  
  const allCategories = [...new Set([...Object.keys(thisCats), ...Object.keys(lastCats)])];
  
  const changes = allCategories.map(cat => {
    const thisAmt = thisCats[cat] || 0;
    const lastAmt = lastCats[cat] || 0;
    const change = thisAmt - lastAmt;
    const changePercent = lastAmt > 0 ? ((change / lastAmt) * 100).toFixed(1) : (thisAmt > 0 ? 100 : 0);
    
    return {
      category: cat,
      thisMonth: thisAmt,
      lastMonth: lastAmt,
      change,
      changePercent,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    };
  }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  const totalChange = thisTotal - lastTotal;
  const totalChangePercent = lastTotal > 0 ? ((totalChange / lastTotal) * 100).toFixed(1) : 0;
  
  // Find significant changes
  const significantChanges = changes.filter(c => Math.abs(parseFloat(c.changePercent)) > 20);
  
  let message = `📊 **Month-over-Month Comparison**\n\n`;
  message += `**This month**: ${currency}${thisTotal.toLocaleString()} (${thisMonthTxns.length} transactions)\n`;
  message += `**Last month**: ${currency}${lastTotal.toLocaleString()} (${lastMonthTxns.length} transactions)\n`;
  message += `**Change**: ${totalChange >= 0 ? '+' : ''}${currency}${totalChange.toLocaleString()} (${totalChangePercent}%)\n\n`;
  
  if (significantChanges.length > 0) {
    message += `**Notable changes:**\n`;
    significantChanges.slice(0, 3).forEach(c => {
      const emoji = c.trend === 'up' ? '📈' : c.trend === 'down' ? '📉' : '➡️';
      message += `${emoji} ${c.category}: ${c.changePercent > 0 ? '+' : ''}${c.changePercent}%\n`;
    });
  }
  
  return addConfidence({
    message,
    ui_component: "comparison_view",
    ui_data: {
      title: "Monthly Comparison",
      periods: {
        current: { label: 'This Month', total: thisTotal, count: thisMonthTxns.length },
        previous: { label: 'Last Month', total: lastTotal, count: lastMonthTxns.length }
      },
      change: { amount: totalChange, percent: totalChangePercent },
      byCategory: changes
    },
    suggestions: ["Why did spending change?", "Show details for highest change", "Compare categories"]
  }, null, null, data, 'comparison');
};

/**
 * Generate anomaly response - PERSONA-AWARE
 */
export const generateAnomalyResponse = (data) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  const persona = config?.persona || 'solo';
  
  const anomalies = detectAnomalies(transactions, config);
  
  if (anomalies.length === 0) {
    return {
      message: "✅ **No Anomalies Detected**\n\nYour spending patterns look normal! No unusual expenses found.",
      ui_component: null,
      ui_data: null,
      suggestions: ["Show spending trends", "Compare months", "Set alerts"]
    };
  }
  
  let message = `⚠️ **${anomalies.length} Unusual ${anomalies.length === 1 ? 'Expense' : 'Expenses'} Detected**\n\n`;
  
  anomalies.forEach((anomaly, i) => {
    message += `**${i + 1}. ${anomaly.transaction.description}**\n`;
    message += `   ${currency}${anomaly.transaction.amount.toLocaleString()} - ${anomaly.reason}\n\n`;
  });
  
  message += `💡 *These might be one-time expenses or errors worth reviewing.*`;
  
  const anomalyData = anomalies.map(a => ({
    id: a.transaction.id,
    description: a.transaction.description,
    amount: a.transaction.amount,
    category: a.transaction.category,
    date: a.transaction.date,
    reason: a.reason,
    severity: a.severity || 'medium',
    expectedAmount: a.expected
  }));
  
  return addConfidence({
    message,
    ui_component: "anomaly_list",
    ui_data: {
      title: "Unusual Expenses",
      anomalies: anomalyData,
      totalAnomalyAmount: anomalies.reduce((sum, a) => sum + a.transaction.amount, 0)
    },
    suggestions: ["Explain this expense", "Mark as expected", "Show all transactions"]
  }, null, null, data, 'anomaly');
};

/**
 * Generate anomaly response with learning capability
 */
export const generateAnomalyResponseWithLearning = (data) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  const participants = config?.participants || [];
  
  const anomalies = detectAnomalies(transactions, config);
  
  if (anomalies.length === 0) {
    return {
      message: "✅ **All Clear!**\n\nNo unusual spending patterns detected. Your finances look healthy!",
      ui_component: null,
      ui_data: null,
      suggestions: ["Show spending analysis", "Compare months", "Set up alerts"]
    };
  }
  
  // Check for known patterns from learning
  const patterns = loadPatterns();
  const knownDescriptions = patterns.anomalyHistory?.map(a => a.description?.toLowerCase()) || [];
  
  const categorizedAnomalies = anomalies.map(anomaly => {
    const isKnown = knownDescriptions.some(desc => 
      desc && anomaly.transaction.description.toLowerCase().includes(desc)
    );
    
    return {
      ...anomaly,
      isKnown,
      status: isKnown ? 'known' : 'new'
    };
  });
  
  const newAnomalies = categorizedAnomalies.filter(a => !a.isKnown);
  const knownAnomalies = categorizedAnomalies.filter(a => a.isKnown);
  
  let message = `⚠️ **Anomaly Analysis**\n\n`;
  
  if (newAnomalies.length > 0) {
    message += `**${newAnomalies.length} New Unusual Expenses:**\n`;
    newAnomalies.forEach(a => {
      message += `• ${a.transaction.description}: ${currency}${a.transaction.amount.toLocaleString()}\n`;
      message += `  _${a.reason}_\n`;
    });
    message += `\n`;
  }
  
  if (knownAnomalies.length > 0) {
    message += `**${knownAnomalies.length} Known Recurring Expenses:**\n`;
    knownAnomalies.forEach(a => {
      message += `• ${a.transaction.description}: ${currency}${a.transaction.amount.toLocaleString()} ✓\n`;
    });
  }
  
  return addConfidence({
    message,
    ui_component: "anomaly_list_with_learning",
    ui_data: {
      title: "Anomaly Detection",
      newAnomalies: newAnomalies.map(a => ({
        id: a.transaction.id,
        description: a.transaction.description,
        amount: a.transaction.amount,
        reason: a.reason,
        canLearn: true
      })),
      knownAnomalies: knownAnomalies.map(a => ({
        id: a.transaction.id,
        description: a.transaction.description,
        amount: a.transaction.amount
      })),
      totalAmount: anomalies.reduce((sum, a) => sum + a.transaction.amount, 0)
    },
    suggestions: [
      "Mark as recurring expense",
      "Show all patterns",
      "Why is this unusual?"
    ]
  }, null, null, data, 'anomaly');
};

/**
 * Generate comparison response for specific categories
 */
export const generateCategoryComparison = (data, category) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  
  const categoryTxns = transactions.filter(t => 
    (t.category || 'Other').toLowerCase() === category.toLowerCase()
  );
  
  if (categoryTxns.length === 0) {
    return {
      message: `📊 No transactions found in **${category}** category.`,
      ui_component: null,
      ui_data: null,
      suggestions: ["Show all categories", "Show spending analysis", "Add expense"]
    };
  }
  
  // Group by month
  const monthlyData = {};
  categoryTxns.forEach(t => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + t.amount;
  });
  
  const sortedMonths = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      amount
    }));
  
  const total = categoryTxns.reduce((sum, t) => sum + t.amount, 0);
  const average = Math.round(total / sortedMonths.length);
  
  // Trend analysis
  let trend = 'stable';
  if (sortedMonths.length >= 2) {
    const recent = sortedMonths.slice(-2);
    const change = recent[1].amount - recent[0].amount;
    if (change > average * 0.1) trend = 'increasing';
    else if (change < -average * 0.1) trend = 'decreasing';
  }
  
  let message = `📊 **${category} Analysis**\n\n`;
  message += `**Total**: ${currency}${total.toLocaleString()} across ${categoryTxns.length} transactions\n`;
  message += `**Monthly average**: ${currency}${average.toLocaleString()}\n`;
  message += `**Trend**: ${trend === 'increasing' ? '📈 Increasing' : trend === 'decreasing' ? '📉 Decreasing' : '➡️ Stable'}\n`;
  
  return {
    message,
    ui_component: "category_trend",
    ui_data: {
      title: `${category} Trend`,
      category,
      monthlyData: sortedMonths,
      total,
      average,
      trend,
      transactionCount: categoryTxns.length
    },
    suggestions: [
      `Set ${category} budget`,
      "Compare with other categories",
      "Show transactions"
    ]
  };
};

/**
 * Mark anomaly as expected and learn the pattern
 */
export const markAnomalyAsExpected = (data, transactionId, participant) => {
  const { transactions } = data;
  
  const transaction = transactions.find(t => t.id === transactionId);
  
  if (!transaction) {
    return {
      message: "❌ Transaction not found.",
      ui_component: null,
      ui_data: null,
      suggestions: ["Show all transactions", "Show anomalies"]
    };
  }
  
  // Learn this as a known pattern
  const patterns = loadPatterns();
  if (!patterns.anomalyHistory) {
    patterns.anomalyHistory = [];
  }
  
  patterns.anomalyHistory.push({
    description: transaction.description,
    category: transaction.category,
    approximateAmount: transaction.amount,
    markedAsExpected: true,
    markedBy: participant || 'user',
    markedAt: new Date().toISOString()
  });
  
  savePatterns(patterns);
  
  return {
    message: `✅ **Got it!**\n\nI've learned that "${transaction.description}" is an expected recurring expense. I won't flag similar expenses in the future.`,
    ui_component: null,
    ui_data: null,
    suggestions: ["Show learned patterns", "Detect anomalies again", "Show spending analysis"]
  };
};
