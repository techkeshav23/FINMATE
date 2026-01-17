/**
 * Analysis Service - Core financial analysis functions
 * Handles spending analysis, category breakdowns, summaries, and unpaid bills
 */

import { detectAnomalies } from '../parsers/statementParser.js';

/**
 * Build confidence metadata for responses
 */
export const buildHonestConfidence = (data, analysisType) => {
  const { transactions, config } = data;
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  
  const confidence = {
    level: 'high',
    reason: '',
    details: '',
    assumptions: [],
    dataQuality: null
  };

  const unsettledCount = transactions.filter(t => !t.settled).length;
  const totalTransactions = transactions.length;
  const oldestTxn = transactions[0]?.date;
  const newestTxn = transactions[transactions.length - 1]?.date;
  const dateRange = oldestTxn && newestTxn ? 
    Math.ceil((new Date(newestTxn) - new Date(oldestTxn)) / (1000 * 60 * 60 * 24)) : 0;

  if (totalTransactions < 10) {
    confidence.level = 'low';
    confidence.dataQuality = `Only ${totalTransactions} transactions available. More data would improve accuracy.`;
  } else if (totalTransactions < 30) {
    confidence.level = 'medium';
    confidence.dataQuality = `Based on ${totalTransactions} transactions over ${dateRange} days.`;
  }

  switch (analysisType) {
    case 'spending':
      confidence.reason = `Calculated from ${totalTransactions} transactions`;
      confidence.assumptions = persona === 'group' && participants.length > 0
        ? ['All expenses split equally among group members', 'Transaction dates are accurate', 'No missing transactions']
        : ['Transaction amounts are accurate', 'All expenses are recorded', 'Categories are correctly assigned'];
      break;
    case 'settlement':
      confidence.reason = `${unsettledCount} unsettled transactions analyzed`;
      confidence.assumptions = ['Equal split assumed unless specified otherwise', 'All participants in the expense share equally'];
      confidence.details = 'Settlement amounts are exact based on recorded transactions.';
      break;
    case 'category':
      confidence.reason = 'Based on transaction categorization';
      confidence.assumptions = ['Categories are correctly assigned', 'Some expenses may be miscategorized'];
      break;
    case 'anomaly':
      confidence.level = 'medium';
      confidence.reason = 'Pattern detection with statistical analysis';
      confidence.assumptions = ['Baseline calculated from historical average', 'Seasonal variations not accounted for', 'One-time expenses might show as anomalies'];
      confidence.details = 'Anomalies flagged when spending exceeds 1.5x your typical pattern.';
      break;
    case 'comparison':
      confidence.level = 'medium';
      confidence.reason = 'Period-over-period comparison';
      confidence.assumptions = ['Comparing similar time periods', 'No major lifestyle changes between periods'];
      break;
    case 'simulation':
      confidence.level = 'low';
      confidence.reason = 'Projection based on current patterns';
      confidence.assumptions = ['Future spending follows current patterns', 'No unexpected expenses', 'Equal contribution continues'];
      confidence.dataQuality = 'Simulations are estimates only. Actual results may vary.';
      break;
  }

  return confidence;
};

/**
 * Generate reasoning steps for transparency
 */
export const generateReasoningSteps = (analysisType, data, result) => {
  const reasoning = { steps: [], conclusion: '', assumptions: [], uncertainties: [] };

  switch (analysisType) {
    case 'spending':
      reasoning.steps = [
        { type: 'observation', text: `Found ${data.transactions.length} total transactions` },
        { type: 'analysis', text: 'Grouped transactions by payer to calculate individual totals' },
        { type: 'analysis', text: 'Calculated percentage share for each person', data: `Total: ₹${result.ui_data?.total?.toLocaleString()}` },
        { type: 'insight', text: 'Identified highest spender based on total amount paid' }
      ];
      reasoning.assumptions = ['All logged transactions are accurate', 'Equal split applies to shared expenses'];
      break;
    case 'settlement':
      reasoning.steps = [
        { type: 'observation', text: 'Identified all unsettled transactions' },
        { type: 'analysis', text: 'Calculated credit for each payer (amount paid)' },
        { type: 'analysis', text: 'Calculated debit for each person (their share of splits)' },
        { type: 'analysis', text: 'Net balance = Credits - Debits' },
        { type: 'insight', text: 'Used debt simplification to minimize number of payments' }
      ];
      reasoning.conclusion = 'These settlements will balance all accounts.';
      reasoning.assumptions = ['Expenses are split equally unless specified'];
      break;
    case 'anomaly':
      reasoning.steps = [
        { type: 'observation', text: 'Scanned recent transactions for unusual patterns' },
        { type: 'analysis', text: 'Compared each expense against category baseline', data: 'Baseline = historical average per category' },
        { type: 'analysis', text: 'Flagged items exceeding 1.5x the baseline' },
        { type: 'warning', text: 'Some flagged items might be legitimate one-time expenses' }
      ];
      reasoning.uncertainties = ['Seasonal patterns not fully accounted', 'New categories have limited baseline data'];
      break;
  }

  return reasoning;
};

/**
 * Add confidence metadata to response
 */
export const addConfidence = (response, level = 'high', reason = null, data = null, analysisType = null) => {
  if (data && analysisType) {
    response.confidence = buildHonestConfidence(data, analysisType);
    response.reasoning = generateReasoningSteps(analysisType, data, response);
  } else {
    response.confidence = {
      level,
      reason: reason || (level === 'high' ? 'Based on complete transaction data' : 
                        level === 'medium' ? 'Some assumptions were made' : 'Limited data available')
    };
  }
  return response;
};

/**
 * Generate spending analysis - PERSONA-AWARE
 */
export const generateSpendingAnalysis = (data) => {
  const { transactions, config } = data;
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  const currency = config?.currency || '₹';
  
  // For GROUP persona - analyze by payer
  if (persona === 'group' && participants.length > 0) {
    const spending = {};
    const utilitySpending = {};
    
    participants.forEach(name => {
      spending[name] = 0;
      utilitySpending[name] = 0;
    });
    
    transactions.forEach(txn => {
      if (txn.payer && spending[txn.payer] !== undefined) {
        spending[txn.payer] += txn.amount;
        if (txn.category === 'Utilities') {
          utilitySpending[txn.payer] += txn.amount;
        }
      }
    });
    
    const total = Object.values(spending).reduce((a, b) => a + b, 0);
    const totalUtilities = Object.values(utilitySpending).reduce((a, b) => a + b, 0);
    const maxSpender = Object.entries(spending).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
    const maxUtilitySpender = Object.entries(utilitySpending).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
    
    const chartData = Object.entries(spending).map(([name, amount]) => ({
      name, amount, percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : '0'
    }));

    let insight = `${maxSpender[0]} is carrying most of the financial load. Consider settling up to balance things out!`;
    if (totalUtilities > 0 && (maxUtilitySpender[1] / totalUtilities) > 0.7) {
      insight = `It looks like ${maxUtilitySpender[0]} pays ${(maxUtilitySpender[1]/totalUtilities*100).toFixed(0)}% of the utility bills. Should we settle up for those?`;
    }
    
    return {
      message: `📊 **Spending Analysis**\n\n**${maxSpender[0]}** has paid the most with ${currency}${maxSpender[1].toLocaleString()} (${total > 0 ? ((maxSpender[1]/total)*100).toFixed(1) : '0'}% of total expenses).\n\nTotal expenses so far: ${currency}${total.toLocaleString()}\n\n💡 **Insight**: ${insight}`,
      ui_component: "bar_chart",
      ui_data: { title: "Spending by Member", data: chartData, total },
      suggestions: ["Who owes money to whom?", "Show category breakdown", "List unpaid bills"]
    };
  }
  
  // For SOLO/other personas - analyze by category
  const byCategory = {};
  transactions.forEach(txn => {
    const cat = txn.category || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + txn.amount;
  });
  
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0] || ['Unknown', 0];
  
  const chartData = sortedCategories.map(([name, amount]) => ({
    name, amount, percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : '0'
  }));
  
  return {
    message: `📊 **Spending Analysis**\n\n**${topCategory[0]}** is your top expense category with ${currency}${topCategory[1].toLocaleString()} (${total > 0 ? ((topCategory[1]/total)*100).toFixed(1) : '0'}% of total).\n\nTotal expenses: ${currency}${total.toLocaleString()}\n\n💡 **Insight**: Review your ${topCategory[0]} spending to find potential savings.`,
    ui_component: "bar_chart",
    ui_data: { title: "Spending by Category", data: chartData, total },
    suggestions: ["Show spending trends", "Compare to last month", "Set a budget"]
  };
};

/**
 * Generate category breakdown
 */
export const generateCategoryBreakdown = (data) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  
  const categoryTotals = {};
  transactions.forEach(t => {
    const cat = t.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });
  
  const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  const sortedCategories = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category, amount, percentage: ((amount / total) * 100).toFixed(1)
    }))
    .sort((a, b) => b.amount - a.amount);
  
  const topCategory = sortedCategories[0] || { category: 'None', amount: 0, percentage: '0' };
  
  return {
    message: `📂 **Category Breakdown**\n\n**${topCategory.category}** takes up ${topCategory.percentage}% of your expenses (${currency}${topCategory.amount.toLocaleString()}).\n\nHere's the full breakdown:`,
    ui_component: "pie_chart",
    ui_data: { title: "Expenses by Category", data: sortedCategories, total },
    suggestions: [`Show ${topCategory.category} transactions`, "Compare categories over time", "Set category limits"]
  };
};

/**
 * Generate unpaid bills list
 */
export const generateUnpaidBills = (data) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  
  const unpaid = transactions.filter(t => !t.settled);
  const totalUnpaid = unpaid.reduce((sum, t) => sum + t.amount, 0);
  
  if (unpaid.length === 0) {
    return {
      message: "🎉 **All Clear!**\n\nNo pending expenses! All transactions have been settled.",
      ui_component: null,
      ui_data: null,
      suggestions: ["Show all transactions", "Add new expense", "View spending analysis"]
    };
  }
  
  const recentUnpaid = unpaid.slice(-10).map(t => ({
    id: t.id,
    description: t.description,
    amount: t.amount,
    category: t.category,
    date: t.date,
    payer: t.payer
  }));
  
  return {
    message: `📋 **Unpaid Bills**\n\nYou have **${unpaid.length} unsettled** expenses totaling ${currency}${totalUnpaid.toLocaleString()}.`,
    ui_component: "transaction_list",
    ui_data: { title: "Pending Expenses", transactions: recentUnpaid, total: totalUnpaid },
    suggestions: ["Who should pay whom?", "Mark a bill as paid", "Show all transactions"]
  };
};

/**
 * Generate summary - PERSONA-AWARE
 */
export const generateSummary = (data) => {
  const { transactions, config, income } = data;
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  const currency = config?.currency || '₹';
  
  const total = transactions.reduce((sum, txn) => sum + txn.amount, 0);
  const settled = transactions.filter(t => t.settled).length;
  const pending = transactions.filter(t => !t.settled).length;
  const totalIncome = (income || []).reduce((sum, i) => sum + i.amount, 0);
  
  let message = `📊 **Monthly Summary**\n\n`;
  
  switch (persona) {
    case 'group':
      message += `👥 **Group Members**: ${participants.join(', ')}\n`;
      message += `💰 **Total Expenses**: ${currency}${total.toLocaleString()}\n`;
      message += `✅ **Settled**: ${settled} transactions\n`;
      message += `⏳ **Pending**: ${pending} transactions\n\n`;
      if (participants.length > 0) {
        message += `Everyone's fair share would be approximately ${currency}${Math.round(total / participants.length).toLocaleString()} per person.`;
      }
      return { message, ui_component: null, ui_data: null, suggestions: ["Show spending breakdown", "Who owes what?", "List pending bills"] };
      
    case 'vendor':
      const profit = totalIncome - total;
      message += `💵 **Total Income**: ${currency}${totalIncome.toLocaleString()}\n`;
      message += `💸 **Total Expenses**: ${currency}${total.toLocaleString()}\n`;
      message += `📈 **Net Profit**: ${currency}${profit.toLocaleString()}\n`;
      message += `📊 **Transactions**: ${transactions.length}\n`;
      return { message, ui_component: null, ui_data: null, suggestions: ["Show profit trend", "Top expenses", "Income breakdown"] };
      
    case 'traveler':
      const trips = [...new Set(transactions.map(t => t.trip).filter(Boolean))];
      message += `✈️ **Trips**: ${trips.length}\n`;
      message += `💰 **Total Travel Expenses**: ${currency}${total.toLocaleString()}\n`;
      message += `📊 **Transactions**: ${transactions.length}\n`;
      return { message, ui_component: null, ui_data: null, suggestions: ["Compare trips", "Category breakdown", "Budget next trip"] };
      
    default:
      message += `💰 **Total Expenses**: ${currency}${total.toLocaleString()}\n`;
      if (totalIncome > 0) {
        message += `💵 **Total Income**: ${currency}${totalIncome.toLocaleString()}\n`;
        message += `💹 **Savings**: ${currency}${(totalIncome - total).toLocaleString()}\n`;
      }
      message += `📊 **Transactions**: ${transactions.length}\n`;
      return { message, ui_component: null, ui_data: null, suggestions: ["Show spending breakdown", "Category analysis", "Set budget"] };
  }
};

/**
 * Generate timeline view
 */
export const generateTimeline = (data) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  
  // Group by week
  const weeklyData = {};
  transactions.forEach(t => {
    const date = new Date(t.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { amount: 0, count: 0 };
    }
    weeklyData[weekKey].amount += t.amount;
    weeklyData[weekKey].count++;
  });
  
  const timelineData = Object.entries(weeklyData)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .slice(-8)
    .map(([week, data]) => ({
      week,
      label: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: data.amount,
      count: data.count
    }));
  
  const total = timelineData.reduce((sum, w) => sum + w.amount, 0);
  const avgWeekly = Math.round(total / timelineData.length);
  
  return {
    message: `📈 **Spending Timeline**\n\nHere's your spending over the last ${timelineData.length} weeks.\n\n**Average weekly spending**: ${currency}${avgWeekly.toLocaleString()}`,
    ui_component: "line_chart",
    ui_data: { title: "Weekly Spending Trend", data: timelineData, average: avgWeekly },
    suggestions: ["Compare to last month", "Show category trends", "What changed?"]
  };
};

/**
 * Generate filtered transaction list
 */
export const generateFilteredList = (data, category) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  
  const filtered = transactions.filter(t => 
    (t.category || 'Other').toLowerCase() === category.toLowerCase()
  );
  
  if (filtered.length === 0) {
    return {
      message: `📋 No transactions found in the **${category}** category.`,
      ui_component: null,
      ui_data: null,
      suggestions: ["Show all categories", "Show all transactions", "Add new expense"]
    };
  }
  
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);
  const recentFiltered = filtered.slice(-10).map(t => ({
    id: t.id,
    description: t.description,
    amount: t.amount,
    date: t.date,
    payer: t.payer
  }));
  
  return {
    message: `📋 **${category} Transactions**\n\nFound **${filtered.length}** transactions totaling ${currency}${total.toLocaleString()}.`,
    ui_component: "transaction_list",
    ui_data: { title: `${category} Expenses`, transactions: recentFiltered, total, category },
    suggestions: [`Compare ${category} over time`, "Show other categories", "Set ${category} budget"]
  };
};
