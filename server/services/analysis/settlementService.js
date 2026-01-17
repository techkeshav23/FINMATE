/**
 * Settlement Service - Handles all settlement and debt calculations
 * Includes settlement analysis, confirmations, and justifications
 */

import { buildHonestConfidence, generateReasoningSteps, addConfidence } from './analysisService.js';

/**
 * Generate settlement analysis - WHO OWES WHOM - PERSONA-AWARE
 */
export const generateSettlementAnalysis = (data) => {
  const { transactions, config } = data;
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  const currency = config?.currency || '₹';
  
  // Settlement only makes sense for group personas
  if (persona === 'solo' || participants.length <= 1) {
    return {
      message: "ℹ️ Settlement analysis is for group expenses.\n\nSince you're tracking personal finances, there's no one to settle with! Would you like to see your spending analysis instead?",
      ui_component: null,
      ui_data: null,
      suggestions: ["Show spending analysis", "Show category breakdown", "Show summary"]
    };
  }
  
  const unsettled = transactions.filter(t => !t.settled);
  
  if (unsettled.length === 0) {
    return {
      message: "🎉 **All Settled!**\n\nNo pending expenses to settle. Everyone is square!",
      ui_component: null,
      ui_data: null,
      suggestions: ["Show spending analysis", "Add new expense", "View history"]
    };
  }
  
  // Calculate balances
  const balances = {};
  participants.forEach(name => balances[name] = 0);
  
  unsettled.forEach(txn => {
    if (!txn.payer || !participants.includes(txn.payer)) return;
    
    // Payer gets credit
    balances[txn.payer] += txn.amount;
    
    // Split equally among participants (or specified splitAmong)
    const splitAmong = txn.splitAmong || participants;
    const sharePerPerson = txn.amount / splitAmong.length;
    
    splitAmong.forEach(person => {
      if (balances[person] !== undefined) {
        balances[person] -= sharePerPerson;
      }
    });
  });
  
  // Calculate settlements
  const creditors = [];
  const debtors = [];
  
  Object.entries(balances).forEach(([name, balance]) => {
    if (balance > 1) creditors.push({ name, amount: balance });
    else if (balance < -1) debtors.push({ name, amount: -balance });
  });
  
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  
  const settlements = [];
  let creditorIdx = 0;
  let debtorIdx = 0;
  
  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx];
    const debtor = debtors[debtorIdx];
    const amount = Math.min(creditor.amount, debtor.amount);
    
    if (amount > 1) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amount)
      });
    }
    
    creditor.amount -= amount;
    debtor.amount -= amount;
    
    if (creditor.amount < 1) creditorIdx++;
    if (debtor.amount < 1) debtorIdx++;
  }
  
  if (settlements.length === 0) {
    return {
      message: "✨ **Almost Balanced!**\n\nThe differences are so small (less than ₹1) that no settlement is needed.",
      ui_component: null,
      ui_data: null,
      suggestions: ["Show spending breakdown", "View all transactions", "Add new expense"]
    };
  }
  
  const totalToSettle = settlements.reduce((sum, s) => sum + s.amount, 0);
  
  let message = `💸 **Settlement Analysis**\n\nBased on ${unsettled.length} unsettled transactions:\n\n`;
  settlements.forEach(s => {
    message += `• **${s.from}** → **${s.to}**: ${currency}${s.amount.toLocaleString()}\n`;
  });
  message += `\nTotal to settle: ${currency}${totalToSettle.toLocaleString()}`;
  
  return addConfidence({
    message,
    ui_component: "settlement_view",
    ui_data: { title: "Settlement Summary", settlements, total: totalToSettle, balances },
    suggestions: ["Confirm settlement", "Show how this was calculated", "View unsettled expenses"],
    requiresConfirmation: true,
    confirmationType: 'settlement',
    settlementData: settlements
  }, null, null, data, 'settlement');
};

/**
 * Generate settlement analysis WITH justification steps
 */
export const generateSettlementAnalysisWithJustification = (data) => {
  const { transactions, config } = data;
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  const currency = config?.currency || '₹';
  
  // Settlement only for groups
  if (persona === 'solo' || participants.length <= 1) {
    return {
      message: "ℹ️ Settlement analysis is designed for group expenses. Since you're tracking personal finances, there's no settlement needed!\n\nWould you like to see your spending breakdown instead?",
      ui_component: null,
      ui_data: null,
      suggestions: ["Show spending analysis", "Category breakdown", "Monthly summary"]
    };
  }
  
  const unsettled = transactions.filter(t => !t.settled);
  
  if (unsettled.length === 0) {
    return {
      message: "🎉 **All Settled!**\n\nNo pending transactions. Everyone is square!",
      ui_component: null,
      ui_data: null,
      suggestions: ["Show spending analysis", "View history", "Add expense"]
    };
  }
  
  // Build justification data
  const justification = {
    steps: [],
    breakdown: {},
    unsettledCount: unsettled.length,
    totalAmount: unsettled.reduce((sum, t) => sum + t.amount, 0)
  };
  
  // Step 1: Calculate what each person paid
  const paid = {};
  const owes = {};
  participants.forEach(name => {
    paid[name] = 0;
    owes[name] = 0;
  });
  
  unsettled.forEach(txn => {
    if (txn.payer && paid[txn.payer] !== undefined) {
      paid[txn.payer] += txn.amount;
      
      const splitAmong = txn.splitAmong || participants;
      const share = txn.amount / splitAmong.length;
      splitAmong.forEach(person => {
        if (owes[person] !== undefined) {
          owes[person] += share;
        }
      });
    }
  });
  
  justification.steps.push({
    type: 'calculation',
    title: 'Step 1: What Each Person Paid',
    data: Object.entries(paid).map(([name, amount]) => ({ name, amount: Math.round(amount) }))
  });
  
  justification.steps.push({
    type: 'calculation',
    title: 'Step 2: What Each Person Owes (Their Fair Share)',
    data: Object.entries(owes).map(([name, amount]) => ({ name, amount: Math.round(amount) }))
  });
  
  // Step 3: Net balance
  const balances = {};
  participants.forEach(name => {
    balances[name] = Math.round(paid[name] - owes[name]);
  });
  
  justification.steps.push({
    type: 'balance',
    title: 'Step 3: Net Balance (Paid - Owed)',
    data: Object.entries(balances).map(([name, balance]) => ({
      name,
      balance,
      status: balance > 0 ? 'owed money' : balance < 0 ? 'owes money' : 'settled'
    }))
  });
  
  // Calculate settlements
  const creditors = [];
  const debtors = [];
  
  Object.entries(balances).forEach(([name, balance]) => {
    if (balance > 1) creditors.push({ name, amount: balance });
    else if (balance < -1) debtors.push({ name, amount: -balance });
  });
  
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  
  const settlements = [];
  let ci = 0, di = 0;
  
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);
    
    if (amount > 1) {
      settlements.push({ from: d.name, to: c.name, amount: Math.round(amount) });
    }
    
    c.amount -= amount;
    d.amount -= amount;
    
    if (c.amount < 1) ci++;
    if (d.amount < 1) di++;
  }
  
  justification.steps.push({
    type: 'settlement',
    title: 'Step 4: Optimized Settlements',
    description: 'Minimizing number of transactions needed',
    data: settlements
  });
  
  const totalToSettle = settlements.reduce((sum, s) => sum + s.amount, 0);
  
  let message = `💸 **Settlement Analysis with Justification**\n\n`;
  message += `📊 Analyzing **${unsettled.length}** unsettled transactions totaling ${currency}${justification.totalAmount.toLocaleString()}\n\n`;
  message += `**Final Settlements:**\n`;
  settlements.forEach(s => {
    message += `• **${s.from}** should pay **${s.to}**: ${currency}${s.amount.toLocaleString()}\n`;
  });
  
  return addConfidence({
    message,
    ui_component: "settlement_with_justification",
    ui_data: {
      title: "Settlement Breakdown",
      settlements,
      justification,
      total: totalToSettle
    },
    suggestions: ["Confirm settlement", "Show unsettled transactions", "Split differently"],
    requiresConfirmation: true,
    confirmationType: 'settlement',
    settlementData: settlements
  }, null, null, data, 'settlement');
};

/**
 * Confirm settlement and mark transactions as settled
 */
export const generateSettlementConfirmed = (data, settlementData, saveDataCallback) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  
  // Mark all unsettled transactions as settled
  let settledCount = 0;
  transactions.forEach(txn => {
    if (!txn.settled) {
      txn.settled = true;
      txn.settledAt = new Date().toISOString();
      settledCount++;
    }
  });
  
  // Save to file
  if (saveDataCallback) {
    saveDataCallback(data);
  }
  
  const totalSettled = settlementData.reduce((sum, s) => sum + s.amount, 0);
  
  let message = `✅ **Settlement Confirmed!**\n\n`;
  message += `**${settledCount}** transactions have been marked as settled.\n\n`;
  message += `**Payments to make:**\n`;
  settlementData.forEach(s => {
    message += `✓ **${s.from}** → **${s.to}**: ${currency}${s.amount.toLocaleString()}\n`;
  });
  message += `\nTotal: ${currency}${totalSettled.toLocaleString()}\n\n`;
  message += `🎉 Great job keeping finances balanced!`;
  
  return {
    message,
    ui_component: "settlement_success",
    ui_data: {
      title: "Settlement Complete",
      settlements: settlementData,
      settledCount,
      total: totalSettled,
      settledAt: new Date().toISOString()
    },
    suggestions: ["Start fresh tracking", "View history", "Show spending analysis"]
  };
};

/**
 * Generate settlement reminder
 * PS Requirement: "Surface insights, surprises, and risks"
 */
export const generateSettlementReminder = (data) => {
  const { transactions, config } = data;
  const participants = config?.participants || [];
  const currency = config?.currency || '₹';
  
  const unsettled = transactions.filter(t => !t.settled);
  
  if (unsettled.length === 0) {
    return null; // No reminder needed
  }
  
  // Calculate how long since last settlement
  const settledTxns = transactions.filter(t => t.settled && t.settledAt);
  const lastSettlement = settledTxns.length > 0 
    ? new Date(Math.max(...settledTxns.map(t => new Date(t.settledAt))))
    : null;
  
  const daysSinceSettlement = lastSettlement 
    ? Math.floor((new Date() - lastSettlement) / (1000 * 60 * 60 * 24))
    : null;
  
  const totalPending = unsettled.reduce((sum, t) => sum + t.amount, 0);
  
  // Determine urgency
  let urgency = 'low';
  let reminderMessage = '';
  
  if (unsettled.length > 20 || totalPending > 50000) {
    urgency = 'high';
    reminderMessage = `⚠️ You have **${unsettled.length}** unsettled transactions totaling ${currency}${totalPending.toLocaleString()}. Time to settle up!`;
  } else if (unsettled.length > 10 || daysSinceSettlement > 14) {
    urgency = 'medium';
    reminderMessage = `📋 ${unsettled.length} transactions pending (${currency}${totalPending.toLocaleString()}). Consider settling soon.`;
  } else {
    urgency = 'low';
    reminderMessage = `ℹ️ ${unsettled.length} transactions to settle when you're ready.`;
  }
  
  return {
    type: 'settlement_reminder',
    urgency,
    message: reminderMessage,
    count: unsettled.length,
    amount: totalPending,
    daysSinceLastSettlement: daysSinceSettlement,
    action: 'Who owes money?'
  };
};

/**
 * Generate settlement history
 */
export const generateSettlementHistory = (data) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  
  const settled = transactions.filter(t => t.settled && t.settledAt);
  
  if (settled.length === 0) {
    return {
      message: "📋 **No Settlement History Yet**\n\nOnce you settle transactions, they'll appear here.",
      ui_component: null,
      ui_data: null,
      suggestions: ["Show current balances", "Add expense", "View spending"]
    };
  }
  
  // Group by settlement date
  const bySettlementDate = {};
  settled.forEach(t => {
    const date = t.settledAt.split('T')[0];
    if (!bySettlementDate[date]) {
      bySettlementDate[date] = { count: 0, amount: 0 };
    }
    bySettlementDate[date].count++;
    bySettlementDate[date].amount += t.amount;
  });
  
  const history = Object.entries(bySettlementDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 10)
    .map(([date, data]) => ({
      date,
      count: data.count,
      amount: data.amount
    }));
  
  const totalSettled = settled.reduce((sum, t) => sum + t.amount, 0);
  
  let message = `📊 **Settlement History**\n\n`;
  message += `Total settled: **${settled.length}** transactions (${currency}${totalSettled.toLocaleString()})\n\n`;
  message += `**Recent Settlements:**\n`;
  history.slice(0, 5).forEach(h => {
    message += `• ${h.date}: ${h.count} transactions (${currency}${h.amount.toLocaleString()})\n`;
  });
  
  return {
    message,
    ui_component: "settlement_history",
    ui_data: {
      title: "Settlement History",
      history,
      summary: {
        totalCount: settled.length,
        totalAmount: totalSettled
      }
    },
    suggestions: ["Current balances", "Show spending analysis", "Add expense"]
  };
};
