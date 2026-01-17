// Bank Statement & SMS Parser Service
// Parses various formats: Bank PDFs, SMS messages, Email alerts

// SMS patterns for Indian banks
const SMS_PATTERNS = [
  // HDFC Bank
  {
    bank: 'HDFC',
    pattern: /(?:HDFC|hdfc).*?(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:debited|spent|withdrawn|paid).*?(?:on|dated?)\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})?.*?(?:Info:|to|at|for)\s*([A-Za-z0-9\s]+)/i,
    extract: (match) => ({
      amount: parseFloat(match[1].replace(/,/g, '')),
      date: match[2] || new Date().toISOString().split('T')[0],
      description: match[3]?.trim() || 'Bank Transaction'
    })
  },
  // ICICI Bank
  {
    bank: 'ICICI',
    pattern: /(?:ICICI|icici).*?(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:debited|spent|withdrawn).*?(?:on|dated?)\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})?.*?(?:at|to|for)\s*([A-Za-z0-9\s]+)/i,
    extract: (match) => ({
      amount: parseFloat(match[1].replace(/,/g, '')),
      date: match[2] || new Date().toISOString().split('T')[0],
      description: match[3]?.trim() || 'Bank Transaction'
    })
  },
  // SBI
  {
    bank: 'SBI',
    pattern: /(?:SBI|sbi).*?(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:debited|withdrawn).*?(?:on|dated?)\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})?/i,
    extract: (match) => ({
      amount: parseFloat(match[1].replace(/,/g, '')),
      date: match[2] || new Date().toISOString().split('T')[0],
      description: 'SBI Transaction'
    })
  },
  // UPI Pattern
  {
    bank: 'UPI',
    pattern: /(?:UPI|upi).*?(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:sent|paid|debited).*?(?:to)\s*([A-Za-z0-9\s@]+)/i,
    extract: (match) => ({
      amount: parseFloat(match[1].replace(/,/g, '')),
      date: new Date().toISOString().split('T')[0],
      description: `UPI to ${match[2]?.trim() || 'Unknown'}`
    })
  },
  // Generic debit pattern
  {
    bank: 'Generic',
    pattern: /(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:debited|spent|withdrawn|paid)/i,
    extract: (match) => ({
      amount: parseFloat(match[1].replace(/,/g, '')),
      date: new Date().toISOString().split('T')[0],
      description: 'Bank Transaction'
    })
  }
];

// Category detection based on keywords
const CATEGORY_KEYWORDS = {
  'Food': ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'pizza', 'dominos', 'mcdonalds', 'kfc', 'burger', 'dining', 'eat', 'lunch', 'dinner', 'breakfast'],
  'Groceries': ['grocery', 'groceries', 'bigbasket', 'blinkit', 'zepto', 'dmart', 'reliance', 'more', 'supermarket', 'vegetables', 'fruits'],
  'Utilities': ['electricity', 'electric', 'power', 'water', 'gas', 'wifi', 'internet', 'broadband', 'airtel', 'jio', 'bsnl', 'bill'],
  'Rent': ['rent', 'housing', 'landlord', 'flat', 'apartment'],
  'Entertainment': ['netflix', 'prime', 'hotstar', 'spotify', 'movie', 'cinema', 'pvr', 'inox', 'gaming', 'game'],
  'Transport': ['uber', 'ola', 'rapido', 'metro', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'cab', 'taxi'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'shopping', 'mall', 'clothes', 'fashion'],
  'Household': ['cleaning', 'repair', 'maintenance', 'pest', 'plumber', 'electrician', 'furniture']
};

const detectCategory = (description) => {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lowerDesc.includes(kw))) {
      return category;
    }
  }
  
  return 'Other';
};

const parseDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Handle various date formats
  const formats = [
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/, // DD-MM-YYYY or DD/MM/YYYY
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,   // YYYY-MM-DD
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let day, month, year;
      if (match[1].length === 4) {
        [, year, month, day] = match;
      } else {
        [, day, month, year] = match;
      }
      if (year.length === 2) year = '20' + year;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  return new Date().toISOString().split('T')[0];
};

export const parseSMS = (text) => {
  const transactions = [];
  const lines = text.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    for (const { bank, pattern, extract } of SMS_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const parsed = extract(match);
        if (parsed.amount > 0) {
          transactions.push({
            ...parsed,
            date: parseDate(parsed.date),
            category: detectCategory(parsed.description),
            source: `SMS (${bank})`
          });
        }
        break; // Found a match, move to next line
      }
    }
  }
  
  return transactions;
};

export const parseCSVStatement = (content) => {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const transactions = [];
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  
  // Find column indices
  const dateIdx = header.findIndex(h => h.includes('date'));
  const descIdx = header.findIndex(h => h.includes('desc') || h.includes('narration') || h.includes('particular'));
  const amountIdx = header.findIndex(h => h.includes('amount') || h.includes('debit') || h.includes('withdrawal'));
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    const amount = parseFloat(values[amountIdx]?.replace(/,/g, ''));
    if (amount > 0) {
      transactions.push({
        date: parseDate(values[dateIdx]),
        description: values[descIdx] || 'Bank Transaction',
        amount,
        category: detectCategory(values[descIdx] || ''),
        source: 'CSV Statement'
      });
    }
  }
  
  return transactions;
};

export const parseEmailAlert = (text) => {
  // Similar to SMS but handles email formats
  const transactions = [];
  
  // Look for transaction amounts
  const amountPatterns = [
    /(?:amount|transaction|paid|debited|spent)[:\s]*(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi,
    /(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:has been|was)\s*(?:debited|paid|spent)/gi
  ];
  
  for (const pattern of amountPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (amount > 0) {
        transactions.push({
          date: new Date().toISOString().split('T')[0],
          description: 'Email Transaction Alert',
          amount,
          category: detectCategory(text),
          source: 'Email'
        });
      }
    }
  }
  
  return transactions;
};

export const detectAnomalies = (transactions, roommates) => {
  const anomalies = [];
  
  if (!transactions || transactions.length < 5) return anomalies;
  
  // Calculate averages by category
  const categoryStats = {};
  transactions.forEach(t => {
    if (!categoryStats[t.category]) {
      categoryStats[t.category] = { amounts: [], total: 0 };
    }
    categoryStats[t.category].amounts.push(t.amount);
    categoryStats[t.category].total += t.amount;
  });
  
  // Calculate average per category
  Object.keys(categoryStats).forEach(cat => {
    const stats = categoryStats[cat];
    stats.average = stats.total / stats.amounts.length;
    stats.max = Math.max(...stats.amounts);
    stats.min = Math.min(...stats.amounts);
  });
  
  // Check recent transactions for anomalies
  const recentTxns = transactions.slice(-10);
  
  recentTxns.forEach(txn => {
    const stats = categoryStats[txn.category];
    if (!stats) return;
    
    const deviation = ((txn.amount - stats.average) / stats.average) * 100;
    
    // High spending anomaly (>50% above average)
    if (deviation > 50 && txn.amount > 500) {
      anomalies.push({
        id: `anomaly_${txn.id || Date.now()}_high`,
        type: 'spike',
        severity: deviation > 100 ? 'high' : 'medium',
        title: `Unusual ${txn.category} Expense`,
        description: `"${txn.description}" is ${deviation.toFixed(0)}% higher than your average ${txn.category} spending`,
        stats: {
          expected: Math.round(stats.average),
          actual: txn.amount,
          diff: txn.amount - stats.average,
          diffPercent: deviation.toFixed(0)
        },
        suggestion: `Review this transaction. Is this a one-time expense or recurring?`,
        transaction: txn
      });
    }
  });
  
  // Check for category spikes (this month vs average)
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTxns = transactions.filter(t => t.date?.startsWith(thisMonth));
  
  const thisMonthByCategory = {};
  thisMonthTxns.forEach(t => {
    thisMonthByCategory[t.category] = (thisMonthByCategory[t.category] || 0) + t.amount;
  });
  
  Object.entries(thisMonthByCategory).forEach(([category, total]) => {
    const stats = categoryStats[category];
    if (!stats || stats.amounts.length < 3) return;
    
    const monthlyAvg = stats.total / Math.max(1, Math.ceil(transactions.length / 30) * stats.amounts.length);
    const deviation = ((total - monthlyAvg) / monthlyAvg) * 100;
    
    if (deviation > 40 && total > 1000) {
      anomalies.push({
        id: `anomaly_category_${category}`,
        type: 'category_spike',
        severity: deviation > 80 ? 'high' : 'medium',
        title: `${category} Spending Up`,
        description: `Your ${category} spending this month is ${deviation.toFixed(0)}% higher than usual`,
        stats: {
          expected: Math.round(monthlyAvg),
          actual: total,
          diff: total - monthlyAvg,
          diffPercent: deviation.toFixed(0)
        },
        suggestion: `Consider reviewing your ${category} expenses to identify savings opportunities.`
      });
    }
  });
  
  // Check for unsettled amount buildup
  const unsettled = transactions.filter(t => !t.settled);
  const unsettledAmount = unsettled.reduce((sum, t) => sum + t.amount, 0);
  
  if (unsettledAmount > 10000) {
    anomalies.push({
      id: 'anomaly_unsettled',
      type: 'warning',
      severity: unsettledAmount > 20000 ? 'high' : 'medium',
      title: 'Large Unsettled Balance',
      description: `You have ₹${unsettledAmount.toLocaleString()} in unsettled transactions across ${unsettled.length} bills`,
      stats: {
        expected: 0,
        actual: unsettledAmount,
        diff: unsettledAmount,
        diffPercent: 100
      },
      suggestion: 'Consider settling up soon to keep finances clear and avoid confusion.'
    });
  }
  
  return anomalies.slice(0, 5); // Return top 5 anomalies
};

export const generateComparison = (transactions, period1, period2) => {
  // Filter transactions by period
  const filterByPeriod = (txns, period) => {
    if (period.type === 'month') {
      return txns.filter(t => t.date?.startsWith(period.value));
    }
    if (period.type === 'week') {
      const weekStart = new Date(period.value);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return txns.filter(t => {
        const d = new Date(t.date);
        return d >= weekStart && d < weekEnd;
      });
    }
    return txns;
  };
  
  const txns1 = filterByPeriod(transactions, period1);
  const txns2 = filterByPeriod(transactions, period2);
  
  // Aggregate by category
  const aggregate = (txns) => {
    const result = {};
    txns.forEach(t => {
      result[t.category] = (result[t.category] || 0) + t.amount;
    });
    return result;
  };
  
  const agg1 = aggregate(txns1);
  const agg2 = aggregate(txns2);
  
  // Get all categories
  const allCategories = [...new Set([...Object.keys(agg1), ...Object.keys(agg2)])];
  
  const comparison = allCategories.map(category => {
    const amount1 = agg1[category] || 0;
    const amount2 = agg2[category] || 0;
    const change = amount2 - amount1;
    const changePercent = amount1 > 0 ? ((change / amount1) * 100).toFixed(1) : (amount2 > 0 ? 100 : 0);
    
    return {
      category,
      amount1,
      amount2,
      change,
      changePercent: parseFloat(changePercent)
    };
  }).sort((a, b) => b.amount2 - a.amount2);
  
  // Generate insights
  const insights = [];
  const total1 = Object.values(agg1).reduce((a, b) => a + b, 0);
  const total2 = Object.values(agg2).reduce((a, b) => a + b, 0);
  
  if (total2 > total1) {
    insights.push(`Overall spending increased by ₹${(total2 - total1).toLocaleString()} (${((total2 - total1) / total1 * 100).toFixed(0)}%)`);
  } else if (total2 < total1) {
    insights.push(`Great job! You spent ₹${(total1 - total2).toLocaleString()} less this period`);
  }
  
  // Find biggest increase
  const biggestIncrease = comparison.filter(c => c.change > 0).sort((a, b) => b.change - a.change)[0];
  if (biggestIncrease && biggestIncrease.change > 500) {
    insights.push(`${biggestIncrease.category} saw the biggest increase: +₹${biggestIncrease.change.toLocaleString()}`);
  }
  
  // Find biggest decrease
  const biggestDecrease = comparison.filter(c => c.change < 0).sort((a, b) => a.change - b.change)[0];
  if (biggestDecrease && biggestDecrease.change < -500) {
    insights.push(`${biggestDecrease.category} spending decreased by ₹${Math.abs(biggestDecrease.change).toLocaleString()}`);
  }
  
  return {
    period1: { ...period1, total: total1 },
    period2: { ...period2, total: total2 },
    comparison,
    insights
  };
};
