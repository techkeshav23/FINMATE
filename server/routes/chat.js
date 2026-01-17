import express from 'express';
import { generatePromptWithData } from '../config/systemPrompt.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateThesysResponse } from '../services/thesys.js';
import { generateDynamicUI } from '../services/thesysGenUI.js';
import { detectAnomalies, generateComparison } from '../services/statementParser.js';
import { detectIntent, generateClarifyingResponse } from '../services/nlpEngine.js';
import { 
  learnFromTransactions, 
  detectAnomaliesWithLearning, 
  getJustification,
  recordAnomaly,
  recordSettlement,
  loadPatterns
} from '../services/patternLearning.js';
import {
  extractEntities,
  resolveContext,
  updateContext,
  getContextSummary,
  clearContext,
  needsContextResolution
} from '../services/conversationMemory.js';

const router = express.Router();

// In-memory chat history (for demo purposes)
let chatHistory = [];

// Track if we're waiting for a clarification response
let pendingClarification = null;

// Track pending settlement confirmation
let pendingSettlementConfirmation = null;

// AI Response Strategy: Thesys GenUI -> Thesys -> Gemini -> Local Rule-Based
const generateAIResponse = async (userMessage, transactions) => {
  // Step -1: Check if this is a settlement confirmation response
  if (pendingSettlementConfirmation) {
    const confirmation = pendingSettlementConfirmation;
    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes('yes') || lowerMsg.includes('confirm') || lowerMsg.includes('proceed') || lowerMsg.includes('do it')) {
      pendingSettlementConfirmation = null;
      // Execute the settlement
      return generateSettlementConfirmed(confirmation, transactions);
    } else if (lowerMsg.includes('no') || lowerMsg.includes('cancel') || lowerMsg.includes('wait') || lowerMsg.includes('later')) {
      pendingSettlementConfirmation = null;
      return {
        message: "No problem! I've cancelled the settlement. Let me know when you're ready to settle up. 👍",
        ui_component: null,
        ui_data: null,
        suggestions: ["Show balances instead", "Show spending breakdown", "What should I do next?"],
        confidence: { level: 'high', reason: 'User cancelled settlement' }
      };
    }
    // If unclear, ask again
    return {
      message: "I didn't quite catch that. Do you want to proceed with the settlement?\n\nPlease say **Yes** to confirm or **No** to cancel.",
      ui_component: null,
      ui_data: null,
      suggestions: ["Yes, settle now", "No, cancel"],
      confidence: { level: 'high', reason: 'Awaiting confirmation' }
    };
  }
  
  // Step 0: Check if this is a response to a clarifying question
  if (pendingClarification) {
    const clarification = pendingClarification;
    pendingClarification = null;
    
    // Find the matching option
    const matchedOption = clarification.options.find(opt => 
      userMessage.toLowerCase().includes(opt.label.toLowerCase()) ||
      opt.label.toLowerCase().includes(userMessage.toLowerCase())
    );
    
    if (matchedOption) {
      // Use the refined query from the option
      userMessage = matchedOption.query;
    }
  }
  
  // Step 0.5: Extract entities and resolve context for follow-up questions
  const entities = extractEntities(userMessage);
  
  if (needsContextResolution(userMessage)) {
    const contextResolution = resolveContext(userMessage, entities);
    if (contextResolution.usedContext) {
      console.log(`Context resolved: ${contextResolution.contextUsed.join(', ')}`);
      userMessage = contextResolution.resolvedMessage;
    }
  }
  
  // Step 1: Use NLP engine for intent detection with clarifying questions
  const intentResult = await detectIntent(userMessage, transactions);
  
  // If query needs clarification, return the clarifying question
  if (intentResult.needsClarification && intentResult.clarification) {
    pendingClarification = intentResult.clarification;
    return generateClarifyingResponse(intentResult.clarification, userMessage);
  }
  
  // Step 2: Try Thesys GenUI - TRUE RUNTIME UI GENERATION
  // This is the key differentiator - UI is generated dynamically, not selected from templates
  try {
    console.log('🎨 Attempting Thesys GenUI for dynamic UI generation...');
    const contextSummary = getContextSummary();
    const genUIResult = await generateDynamicUI(userMessage, transactions, contextSummary);
    
    // Update conversation context
    updateContext(intentResult.intent, entities, genUIResult);
    
    // Return with generated_ui for runtime rendering
    return {
      message: genUIResult.message,
      ui_component: 'thesys_genui', // Special component type for runtime generation
      ui_data: {
        generated_ui: genUIResult.generated_ui,
        source: genUIResult._source || 'thesys'
      },
      suggestions: genUIResult.suggestions,
      confidence: genUIResult.confidence,
      reasoning: genUIResult.reasoning
    };
  } catch (error) {
    console.warn('GenUI failed, falling back to Gemini...', error.message);
  }
  
  // Step 2b: Legacy Thesys API fallback
  if (process.env.THESYS_API_KEY) {
    try {
      console.log('Attempting legacy Thesys API...');
      const contextSummary = getContextSummary();
      const thesysResult = await generateThesysResponse(userMessage, transactions, contextSummary);
      
      // Update conversation context
      updateContext(intentResult.intent, entities, thesysResult);
      
      return thesysResult;
    } catch (error) {
      console.warn('Thesys API failed, falling back to Gemini...');
    }
  }

  // Step 3: Try Gemini API (If Key Exists)
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-lite",
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const systemPrompt = generatePromptWithData(transactions);
      const contextSummary = getContextSummary();
      const prompt = `${systemPrompt}\n\nConversation Context: ${contextSummary}\n\nUser Question: ${userMessage}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const parsedResponse = JSON.parse(response.text());
      
      // Update conversation context
      updateContext(intentResult.intent, entities, parsedResponse);
      
      return parsedResponse;
    } catch (error) {
      console.error("Gemini API Error (falling back to local logic):", error);
    }
  }
  
  // Step 4: Fallback to local heuristic logic with intent from NLP
  const localResponse = generateLocalResponse(userMessage, transactions, intentResult, entities);
  
  // Update conversation context
  updateContext(intentResult.intent, entities, localResponse);
  
  return localResponse;
};

// Enhanced confidence builder with honest uncertainty
const buildHonestConfidence = (data, analysisType) => {
  const { transactions, roommates } = data;
  const confidence = {
    level: 'high',
    reason: '',
    details: '',
    assumptions: [],
    dataQuality: null
  };

  // Check data completeness
  const unsettledCount = transactions.filter(t => !t.settled).length;
  const totalTransactions = transactions.length;
  const oldestTxn = transactions[0]?.date;
  const newestTxn = transactions[transactions.length - 1]?.date;
  const dateRange = oldestTxn && newestTxn ? 
    Math.ceil((new Date(newestTxn) - new Date(oldestTxn)) / (1000 * 60 * 60 * 24)) : 0;

  // Adjust confidence based on data
  if (totalTransactions < 10) {
    confidence.level = 'low';
    confidence.dataQuality = `Only ${totalTransactions} transactions available. More data would improve accuracy.`;
  } else if (totalTransactions < 30) {
    confidence.level = 'medium';
    confidence.dataQuality = `Based on ${totalTransactions} transactions over ${dateRange} days.`;
  }

  // Add assumptions based on analysis type
  switch (analysisType) {
    case 'spending':
      confidence.reason = `Calculated from ${totalTransactions} transactions`;
      confidence.assumptions = [
        'All expenses split equally among roommates',
        'Transaction dates are accurate',
        'No missing transactions'
      ];
      break;
    case 'settlement':
      confidence.reason = `${unsettledCount} unsettled transactions analyzed`;
      confidence.assumptions = [
        'Equal split assumed unless specified otherwise',
        'All roommates participate in all shared expenses'
      ];
      confidence.details = 'Settlement amounts are exact based on recorded transactions.';
      break;
    case 'category':
      confidence.reason = 'Based on transaction categorization';
      confidence.assumptions = [
        'Categories are correctly assigned',
        'Some expenses may be miscategorized'
      ];
      break;
    case 'anomaly':
      confidence.level = 'medium';
      confidence.reason = 'Pattern detection with statistical analysis';
      confidence.assumptions = [
        'Baseline calculated from historical average',
        'Seasonal variations not accounted for',
        'One-time expenses might show as anomalies'
      ];
      confidence.details = 'Anomalies flagged when spending exceeds 1.5x your typical pattern.';
      break;
    case 'comparison':
      confidence.level = 'medium';
      confidence.reason = 'Period-over-period comparison';
      confidence.assumptions = [
        'Comparing similar time periods',
        'No major lifestyle changes between periods'
      ];
      break;
    case 'simulation':
      confidence.level = 'low';
      confidence.reason = 'Projection based on current patterns';
      confidence.assumptions = [
        'Future spending follows current patterns',
        'No unexpected expenses',
        'Equal contribution continues'
      ];
      confidence.dataQuality = 'Simulations are estimates only. Actual results may vary.';
      break;
  }

  return confidence;
};

// Generate reasoning steps for transparency
const generateReasoningSteps = (analysisType, data, result) => {
  const reasoning = {
    steps: [],
    conclusion: '',
    assumptions: [],
    uncertainties: []
  };

  switch (analysisType) {
    case 'spending':
      reasoning.steps = [
        { type: 'observation', text: `Found ${data.transactions.length} total transactions` },
        { type: 'analysis', text: 'Grouped transactions by payer to calculate individual totals' },
        { type: 'analysis', text: 'Calculated percentage share for each roommate', data: `Total: ₹${result.ui_data?.total?.toLocaleString()}` },
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

// Add confidence level to response (enhanced version)
const addConfidence = (response, level = 'high', reason = null, data = null, analysisType = null) => {
  if (data && analysisType) {
    response.confidence = buildHonestConfidence(data, analysisType);
    response.reasoning = generateReasoningSteps(analysisType, data, response);
  } else {
    response.confidence = {
      level,
      reason: reason || (level === 'high' ? 'Based on complete transaction data' : 
                        level === 'medium' ? 'Some assumptions were made' : 
                        'Limited data available')
    };
  }
  return response;
};

const generateLocalResponse = (userMessage, transactions, intentResult = null, entities = null) => {
  // Analyze the message and generate appropriate response
  const lowerMessage = userMessage.toLowerCase();
  
  // Use NLP intent if available
  if (intentResult && intentResult.intent && intentResult.confidence > 0.5) {
    switch (intentResult.intent) {
      case 'spending_analysis':
      case 'spending_by_person':
        return addConfidence(generateSpendingAnalysis(transactions), 'high', null, transactions, 'spending');
      case 'spending_by_category':
      case 'category_breakdown':
        return addConfidence(generateCategoryBreakdown(transactions), 'high', null, transactions, 'category');
      case 'settlement':
        return addConfidence(generateSettlementAnalysisWithJustification(transactions), 'high', null, transactions, 'settlement');
      case 'unpaid_bills':
        return addConfidence(generateUnpaidBills(transactions), 'high', null, transactions, 'spending');
      case 'timeline':
      case 'spending_timeline':
        return addConfidence(generateTimeline(transactions), 'high', null, transactions, 'spending');
      case 'comparison':
        return addConfidence(generateComparisonResponse(userMessage, transactions), 'medium', null, transactions, 'comparison');
      case 'anomaly':
        return addConfidence(generateAnomalyResponseWithLearning(transactions), 'medium', null, transactions, 'anomaly');
      case 'simulation':
      case 'simulation_budget':
        return addConfidence(generateSimulationWithSlider(userMessage, transactions), 'medium', null, transactions, 'simulation');
      case 'decision':
        return addConfidence(generateDecisionGuideWithJustification(transactions), 'medium', null, transactions, 'spending');
    }
    
    // Handle filter intents
    if (intentResult.intent.startsWith('filter_')) {
      const category = intentResult.intent.replace('filter_', '');
      return addConfidence(generateFilteredList(transactions, category), 'high', null, transactions, 'category');
    }
  }
  
  // Fall back to keyword matching
  // Smart response logic based on keywords
  if (lowerMessage.includes('who spent') || lowerMessage.includes('spending')) {
    return addConfidence(generateSpendingAnalysis(transactions), 'high', null, transactions, 'spending');
  }
  
  if (lowerMessage.includes('owe') || lowerMessage.includes('debt') || lowerMessage.includes('settle')) {
    return addConfidence(generateSettlementAnalysis(transactions), 'high', null, transactions, 'settlement');
  }
  
  if (lowerMessage.includes('category') || lowerMessage.includes('breakdown')) {
    return addConfidence(generateCategoryBreakdown(transactions), 'high', null, transactions, 'category');
  }
  
  if (lowerMessage.includes('unpaid') || lowerMessage.includes('pending') || lowerMessage.includes('unsettled')) {
    return addConfidence(generateUnpaidBills(transactions), 'high');
  }
  
  if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
    return addConfidence(generateSummary(transactions), 'high');
  }

  // Timeline (Timeline Chart)
  if (lowerMessage.includes('timeline') || lowerMessage.includes('trend') || lowerMessage.includes('over time') || lowerMessage.includes('history')) {
    return addConfidence(generateTimeline(transactions), 'high');
  }

  // Comparison queries
  if (lowerMessage.includes('compare') || lowerMessage.includes('versus') || lowerMessage.includes(' vs ') || lowerMessage.includes('difference between')) {
    return addConfidence(generateComparisonResponse(userMessage, transactions), 'medium', 'Comparison based on available periods');
  }

  // Anomaly queries
  if (lowerMessage.includes('unusual') || lowerMessage.includes('anomal') || lowerMessage.includes('weird') || lowerMessage.includes('strange') || lowerMessage.includes('problem')) {
    return addConfidence(generateAnomalyResponse(transactions), 'medium', 'Based on statistical analysis');
  }

  // Decision/Action queries
  if (lowerMessage.includes('what should') || lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('help me') || lowerMessage.includes('next step')) {
    return addConfidence(generateDecisionGuide(transactions), 'medium', 'Recommendations based on current state');
  }

  // Filtered Views (Zoom In)
  const categories = ['food', 'grocery', 'groceries', 'utilities', 'bills', 'rent', 'entertainment', 'household'];
  const foundCategory = categories.find(c => lowerMessage.includes(c));
  
  if (foundCategory && (lowerMessage.includes('show') || lowerMessage.includes('list') || lowerMessage.includes('transactions'))) {
    let targetCategory = foundCategory.charAt(0).toUpperCase() + foundCategory.slice(1);
    if (foundCategory === 'grocery') targetCategory = 'Groceries';
    if (foundCategory === 'bills') targetCategory = 'Utilities';
    
    return addConfidence(generateFilteredList(transactions, targetCategory), 'high');
  }

  // Simulation and What-If scenarios
  if (lowerMessage.includes('what if') || lowerMessage.includes('simulate') || lowerMessage.includes('plan') || lowerMessage.includes('budget') || lowerMessage.includes('project') || lowerMessage.includes('increase') || lowerMessage.includes('decrease')) {
    return addConfidence(generateSimulation(userMessage, transactions), 'medium', 'Projection based on assumptions');
  }
  
  // Default welcome/help response
  return {
    message: "Hey there! 👋 I'm FairShare, your financial co-pilot for managing roommate expenses. I can help you with:\n\n• **Spending analysis** - Who's spending what?\n• **Settlement tracking** - Who owes whom?\n• **Category breakdown** - Where's the money going?\n• **Comparisons** - Compare periods side-by-side\n• **Anomaly detection** - Find unusual spending\n• **Simulations** - What-if scenarios & budget planning\n• **Decision guidance** - What should you do next?\n\nJust ask me anything about your shared expenses!",
    ui_component: null,
    ui_data: null,
    suggestions: [
      "Who spent the most this month?",
      "Show me unusual spending",
      "What should I do next?"
    ],
    confidence: { level: 'high', reason: 'Informational response' }
  };
};

// Helper functions for analysis
const generateSpendingAnalysis = (data) => {
  const { transactions, roommates } = data;
  const spending = {};
  const utilitySpending = {};
  
  roommates.forEach(name => {
    spending[name] = 0;
    utilitySpending[name] = 0;
  });
  
  transactions.forEach(txn => {
    spending[txn.payer] += txn.amount;
    if (txn.category === 'Utilities') {
      utilitySpending[txn.payer] += txn.amount;
    }
  });
  
  const total = Object.values(spending).reduce((a, b) => a + b, 0);
  const totalUtilities = Object.values(utilitySpending).reduce((a, b) => a + b, 0);
  const maxSpender = Object.entries(spending).sort((a, b) => b[1] - a[1])[0];
  const maxUtilitySpender = Object.entries(utilitySpending).sort((a, b) => b[1] - a[1])[0];
  
  const chartData = Object.entries(spending).map(([name, amount]) => ({
    name,
    amount,
    percentage: ((amount / total) * 100).toFixed(1)
  }));

  // Generate Insight
  let insight = `${maxSpender[0]} is carrying most of the financial load. Consider settling up to balance things out!`;
  
  // Proactive Insight for utilities (if one person pays > 70%)
  if (totalUtilities > 0 && (maxUtilitySpender[1] / totalUtilities) > 0.7) {
    insight = `It looks like ${maxUtilitySpender[0]} pays ${(maxUtilitySpender[1]/totalUtilities*100).toFixed(0)}% of the utility bills. Should we settle up for those?`;
  }
  
  return {
    message: `📊 **Spending Analysis**\n\n**${maxSpender[0]}** has paid the most with ₹${maxSpender[1].toLocaleString()} (${((maxSpender[1]/total)*100).toFixed(1)}% of total expenses).\n\nTotal expenses so far: ₹${total.toLocaleString()}\n\n💡 **Insight**: ${insight}`,
    ui_component: "bar_chart",
    ui_data: {
      title: "Spending by Roommate",
      data: chartData,
      total: total
    },
    suggestions: [
      "Who owes money to whom?",
      "Show category breakdown",
      "List unpaid bills"
    ]
  };
};

const generateSettlementAnalysis = (data) => {
  const { transactions, roommates } = data;
  const balances = {};
  
  // Initialize all balances to 0
  roommates.forEach(name => balances[name] = 0);
  
  // Calculate balances using Splitwise-style math
  // Only consider UNSETTLED transactions
  transactions.filter(txn => !txn.settled).forEach(txn => {
    // Payer gets CREDIT for the full amount they paid
    balances[txn.payer] += txn.amount;
    // Everyone (including payer) gets DEBITED their share
    Object.entries(txn.split).forEach(([person, share]) => {
      balances[person] -= share;
    });
  });
  
  // Round balances to avoid floating point issues
  Object.keys(balances).forEach(name => {
    balances[name] = Math.round(balances[name]);
  });
  
  // Generate optimal settlements (minimize number of transactions)
  const settlements = [];
  const debtors = Object.entries(balances)
    .filter(([_, bal]) => bal < 0)
    .map(([name, bal]) => ({ name, amount: Math.abs(bal) }))
    .sort((a, b) => b.amount - a.amount);
  
  const creditors = Object.entries(balances)
    .filter(([_, bal]) => bal > 0)
    .map(([name, bal]) => ({ name, amount: bal }))
    .sort((a, b) => b.amount - a.amount);
  
  // Match debtors with creditors
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const settleAmount = Math.min(debtor.amount, creditor.amount);
    
    if (settleAmount > 0) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: settleAmount
      });
    }
    
    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;
    
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }
  
  // Calculate total unsettled amount
  const totalUnsettled = transactions.filter(t => !t.settled).reduce((sum, t) => sum + t.amount, 0);
  
  // Generate readable settlement text with explanation
  const settlementText = settlements.length > 0 
    ? settlements.map(s => `• **${s.from}** → **${s.to}**: ₹${s.amount.toLocaleString()}`).join('\n')
    : "Everyone is settled up! 🎉";
  
  // Add balance explanation
  const balanceExplanation = Object.entries(balances)
    .filter(([_, bal]) => bal !== 0)
    .map(([name, bal]) => {
      if (bal > 0) return `• ${name} is owed ₹${bal.toLocaleString()}`;
      return `• ${name} owes ₹${Math.abs(bal).toLocaleString()}`;
    })
    .join('\n');
  
  return {
    message: `💰 **Settlement Summary**\n\n**Current Balances**:\n${balanceExplanation || "All balances are at zero!"}\n\n**Required Payments**:\n${settlementText}\n\n${settlements.length > 0 ? `💡 **Total unsettled**: ₹${totalUnsettled.toLocaleString()} across ${transactions.filter(t => !t.settled).length} transactions.\nOnce these ${settlements.length} payment(s) are made, everyone will be even!` : "Great job keeping things balanced!"}`,
    ui_component: "settlement_card",
    ui_data: {
      settlements,
      balances: Object.entries(balances).map(([name, balance]) => ({ name, balance: Math.round(balance) }))
    },
    suggestions: [
      "Show all transactions",
      "Who paid for utilities?",
      "What's our monthly total?"
    ]
  };
};

const generateCategoryBreakdown = (data) => {
  const { transactions } = data;
  const categories = {};
  
  transactions.forEach(txn => {
    categories[txn.category] = (categories[txn.category] || 0) + txn.amount;
  });
  
  const total = Object.values(categories).reduce((a, b) => a + b, 0);
  const chartData = Object.entries(categories)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: ((amount / total) * 100).toFixed(1)
    }))
    .sort((a, b) => b.amount - a.amount);
  
  const topCategory = chartData[0];
  
  return {
    message: `📈 **Category Breakdown**\n\n**${topCategory.category}** takes up the largest chunk at ₹${topCategory.amount.toLocaleString()} (${topCategory.percentage}%).\n\nHere's where your money is going:\n${chartData.map(c => `• ${c.category}: ₹${c.amount.toLocaleString()} (${c.percentage}%)`).join('\n')}\n\n💡 **Tip**: ${topCategory.category === 'Rent' ? 'Rent is typically the biggest expense - that\'s normal!' : `Consider reviewing ${topCategory.category} expenses to see if there's room to save.`}`,
    ui_component: "pie_chart",
    ui_data: {
      title: "Expenses by Category",
      data: chartData,
      total
    },
    suggestions: [
      "Show food expenses only",
      "Who pays for utilities most?",
      "Compare this month to last"
    ]
  };
};

const generateUnpaidBills = (data) => {
  const { transactions } = data;
  const unpaid = transactions.filter(txn => !txn.settled);
  const totalUnpaid = unpaid.reduce((sum, txn) => sum + txn.amount, 0);
  
  return {
    message: `📋 **Unpaid Bills**\n\nYou have **${unpaid.length} unsettled transactions** totaling ₹${totalUnpaid.toLocaleString()}.\n\n${unpaid.length > 5 ? '⚠️ That\'s quite a backlog! Consider settling up soon to avoid confusion.' : 'Not too bad! Try to clear these when you get a chance.'}`,
    ui_component: "transaction_table",
    ui_data: {
      title: "Pending Settlements",
      transactions: unpaid.map(txn => ({
        id: txn.id,
        date: txn.date,
        description: txn.description,
        amount: txn.amount,
        payer: txn.payer,
        category: txn.category,
        settled: txn.settled
      })),
      total: totalUnpaid
    },
    suggestions: [
      "Who should pay whom?",
      "Mark a bill as paid",
      "Show all transactions"
    ]
  };
};

const generateSummary = (data) => {
  const { transactions, roommates } = data;
  const total = transactions.reduce((sum, txn) => sum + txn.amount, 0);
  const settled = transactions.filter(t => t.settled).length;
  const pending = transactions.filter(t => !t.settled).length;
  
  return {
    message: `📊 **Monthly Summary**\n\n👥 **Roommates**: ${roommates.join(', ')}\n💰 **Total Expenses**: ₹${total.toLocaleString()}\n✅ **Settled**: ${settled} transactions\n⏳ **Pending**: ${pending} transactions\n\nEveryone's fair share would be approximately ₹${Math.round(total / roommates.length).toLocaleString()} per person.`,
    ui_component: null,
    ui_data: null,
    suggestions: [
      "Show spending breakdown",
      "Who owes what?",
      "List pending bills"
    ]
  };
};

// NEW: Simulation & What-If Scenarios
const generateSimulation = (userMessage, data) => {
  const { transactions, roommates } = data;
  const lowerMessage = userMessage.toLowerCase();
  
  // Get current totals for comparison
  const currentTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const currentRent = transactions.filter(t => t.category === 'Rent').reduce((sum, t) => sum + t.amount, 0);
  
  // Detect simulation type
  if (lowerMessage.includes('rent') && (lowerMessage.includes('increase') || lowerMessage.includes('hike'))) {
    // Extract percentage (default to 10% if not specified)
    const percentMatch = lowerMessage.match(/(\d+)%?/);
    const increasePercent = percentMatch ? parseInt(percentMatch[1]) : 10;
    
    const newRent = Math.round(currentRent * (1 + increasePercent / 100));
    const rentDiff = newRent - currentRent;
    const newPerPerson = Math.round(newRent / roommates.length);
    const currentPerPerson = Math.round(currentRent / roommates.length);
    
    return {
      message: `🔮 **Simulation: ${increasePercent}% Rent Increase**\n\n**Current Rent**: ₹${currentRent.toLocaleString()}\n**Projected Rent**: ₹${newRent.toLocaleString()} (+₹${rentDiff.toLocaleString()})\n\n**Per Person Impact**:\n• Current share: ₹${currentPerPerson.toLocaleString()}\n• New share: ₹${newPerPerson.toLocaleString()}\n• Extra per person: ₹${(newPerPerson - currentPerPerson).toLocaleString()}/month\n\n💡 **Insight**: Each roommate would pay ₹${(newPerPerson - currentPerPerson).toLocaleString()} more per month. Over a year, that's ₹${((newPerPerson - currentPerPerson) * 12).toLocaleString()} extra per person.`,
      ui_component: "bar_chart",
      ui_data: {
        title: `📊 Rent Comparison (Simulated ${increasePercent}% Increase)`,
        data: [
          { name: "Current Rent", amount: currentRent },
          { name: "Projected Rent", amount: newRent }
        ],
        total: newRent
      },
      suggestions: [
        "What if we get a 4th roommate?",
        "Show current spending breakdown",
        "What's our monthly average?"
      ]
    };
  }
  
  // Simulate new roommate
  if (lowerMessage.includes('roommate') && (lowerMessage.includes('new') || lowerMessage.includes('add') || lowerMessage.includes('4th') || lowerMessage.includes('fourth'))) {
    const newRoommateCount = roommates.length + 1;
    const newPerPerson = Math.round(currentTotal / newRoommateCount);
    const currentPerPerson = Math.round(currentTotal / roommates.length);
    const savings = currentPerPerson - newPerPerson;
    
    return {
      message: `🔮 **Simulation: Adding a New Roommate**\n\n**Current Setup**: ${roommates.length} roommates\n**Projected Setup**: ${newRoommateCount} roommates\n\n**Monthly Expenses**: ₹${currentTotal.toLocaleString()}\n\n**Per Person Share**:\n• Current (${roommates.length} people): ₹${currentPerPerson.toLocaleString()}\n• With new roommate: ₹${newPerPerson.toLocaleString()}\n• **Savings per person**: ₹${savings.toLocaleString()}/month\n\n💡 **Insight**: Adding a 4th roommate would save each of you ₹${savings.toLocaleString()} per month (₹${(savings * 12).toLocaleString()}/year)!`,
      ui_component: "bar_chart",
      ui_data: {
        title: "📊 Per-Person Cost Comparison",
        data: roommates.map(name => ({ name, amount: currentPerPerson })).concat([{ name: "With 4th Person", amount: newPerPerson }]),
        total: currentTotal
      },
      suggestions: [
        "What if rent increases instead?",
        "Who currently pays the most?",
        "Show settlement summary"
      ]
    };
  }
  
  // Simulate roommate leaving
  if (lowerMessage.includes('moves out') || lowerMessage.includes('leaves') || lowerMessage.includes('move out')) {
    const newRoommateCount = Math.max(1, roommates.length - 1);
    const newPerPerson = Math.round(currentTotal / newRoommateCount);
    const currentPerPerson = Math.round(currentTotal / roommates.length);
    const extraCost = newPerPerson - currentPerPerson;
    
    return {
      message: `🔮 **Simulation: If Someone Moves Out**\n\n**Current Setup**: ${roommates.length} roommates (${roommates.join(', ')})\n**Projected Setup**: ${newRoommateCount} roommates\n\n**Monthly Expenses**: ₹${currentTotal.toLocaleString()}\n\n**Per Person Share**:\n• Current (${roommates.length} people): ₹${currentPerPerson.toLocaleString()}\n• With ${newRoommateCount} people: ₹${newPerPerson.toLocaleString()}\n• **Extra cost per person**: ₹${extraCost.toLocaleString()}/month\n\n⚠️ **Warning**: If a roommate leaves, each remaining person would pay ₹${extraCost.toLocaleString()} more per month!`,
      ui_component: "bar_chart",
      ui_data: {
        title: "📊 Cost Impact if Roommate Leaves",
        data: [
          { name: `Current (${roommates.length})`, amount: currentPerPerson },
          { name: `After (${newRoommateCount})`, amount: newPerPerson }
        ],
        total: currentTotal
      },
      suggestions: [
        "What if we add a roommate instead?",
        "Show current balances",
        "What's our biggest expense?"
      ]
    };
  }
  
  // Budget planning / next month projection
  if (lowerMessage.includes('budget') || lowerMessage.includes('next month') || lowerMessage.includes('plan')) {
    const categories = {};
    transactions.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    
    const projectedTotal = Math.round(currentTotal * 1.05); // Assume 5% increase
    const perPersonBudget = Math.round(projectedTotal / roommates.length);
    
    const chartData = Object.entries(categories)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 1.05), // Project 5% increase
        percentage: ((amount / currentTotal) * 100).toFixed(1)
      }))
      .sort((a, b) => b.amount - a.amount);
    
    return {
      message: `🔮 **Budget Projection: Next Month**\n\nBased on your current spending patterns, here's a projected budget:\n\n**Current Month Total**: ₹${currentTotal.toLocaleString()}\n**Projected Next Month**: ₹${projectedTotal.toLocaleString()} (assuming 5% buffer)\n\n**Recommended Per-Person Budget**: ₹${perPersonBudget.toLocaleString()}\n\n**Category-wise Projection**:\n${chartData.map(c => `• ${c.category}: ₹${c.amount.toLocaleString()}`).join('\n')}\n\n💡 **Tip**: Set aside ₹${perPersonBudget.toLocaleString()} each at the start of the month to avoid surprises!`,
      ui_component: "pie_chart",
      ui_data: {
        title: "📊 Projected Budget by Category",
        data: chartData,
        total: projectedTotal
      },
      suggestions: [
        "What if rent increases?",
        "Show actual spending so far",
        "Who needs to pay whom?"
      ]
    };
  }
  
  // Generic simulation fallback - now shows slider UI
  return generateSimulationWithSlider(userMessage, data);
};

// NEW: Interactive Simulation with Sliders
const generateSimulationWithSlider = (userMessage, data) => {
  const { transactions, roommates } = data;
  
  // Calculate baseline data for the slider component
  const currentTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const categories = {};
  transactions.forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + t.amount;
  });
  
  const baseline = {
    rent: categories['Rent'] || 0,
    utilities: categories['Utilities'] || 0,
    food: (categories['Food'] || 0) + (categories['Groceries'] || 0),
    other: Object.entries(categories)
      .filter(([cat]) => !['Rent', 'Utilities', 'Food', 'Groceries'].includes(cat))
      .reduce((sum, [_, amt]) => sum + amt, 0),
    total: currentTotal,
    perPerson: Math.round(currentTotal / roommates.length),
    roommates: roommates.length
  };
  
  return {
    message: `🔮 **What-If Scenario Simulator**\n\nPlay with the sliders below to see how different changes would affect your monthly expenses and per-person share.\n\nThis helps you plan for rent increases, budget changes, or unexpected expenses!`,
    ui_component: "simulation_slider",
    ui_data: {
      title: "Interactive Budget Simulator",
      baseline,
      currentTotal,
      roommates: roommates.length,
      categories: Object.entries(categories).map(([name, amount]) => ({ name, amount }))
    },
    suggestions: [
      "What if rent increases by 10%?",
      "Simulate adding a 4th roommate",
      "Show current spending patterns"
    ]
  };
};

// NEW: Automatic Change Detection for Proactive Insights
const detectChanges = (transactions, roommates) => {
  const changes = [];
  const now = new Date();
  
  // Group transactions by week
  const getWeekStart = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  };
  
  const weeklyData = {};
  transactions.forEach(txn => {
    const weekStart = getWeekStart(txn.date);
    if (!weeklyData[weekStart]) {
      weeklyData[weekStart] = { total: 0, categories: {}, count: 0 };
    }
    weeklyData[weekStart].total += txn.amount;
    weeklyData[weekStart].categories[txn.category] = (weeklyData[weekStart].categories[txn.category] || 0) + txn.amount;
    weeklyData[weekStart].count++;
  });
  
  const weeks = Object.keys(weeklyData).sort().reverse();
  
  if (weeks.length >= 2) {
    const thisWeek = weeklyData[weeks[0]];
    const lastWeek = weeklyData[weeks[1]];
    
    // Overall spending change
    const weekChange = thisWeek.total - lastWeek.total;
    const weekChangePercent = lastWeek.total > 0 ? Math.round((weekChange / lastWeek.total) * 100) : 0;
    
    if (Math.abs(weekChangePercent) > 25) {
      changes.push({
        type: 'trend',
        direction: weekChange > 0 ? 'up' : 'down',
        title: `Weekly spending ${weekChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(weekChangePercent)}%`,
        description: `Your total spending this week (₹${thisWeek.total.toLocaleString()}) is ${weekChange > 0 ? 'higher' : 'lower'} than last week.`,
        stats: {
          before: lastWeek.total,
          after: thisWeek.total,
          changePercent: weekChangePercent
        },
        reason: weekChange > 0 
          ? 'This could indicate unexpected expenses or seasonal spending.' 
          : 'Great job cutting back! Check if any bills were missed.',
        exploreQuery: 'Compare this week vs last week'
      });
    }
    
    // Category-specific changes
    const allCategories = [...new Set([...Object.keys(thisWeek.categories), ...Object.keys(lastWeek.categories)])];
    
    allCategories.forEach(category => {
      const thisCat = thisWeek.categories[category] || 0;
      const lastCat = lastWeek.categories[category] || 0;
      
      if (lastCat > 0) {
        const catChange = thisCat - lastCat;
        const catChangePercent = Math.round((catChange / lastCat) * 100);
        
        if (catChangePercent > 50 && Math.abs(catChange) > 500) {
          changes.push({
            type: 'category',
            direction: 'up',
            title: `${category} spending jumped by ${catChangePercent}%`,
            description: `Your ${category} expenses this week (₹${thisCat.toLocaleString()}) are significantly higher than usual.`,
            stats: {
              before: lastCat,
              after: thisCat,
              changePercent: catChangePercent
            },
            reason: `Review recent ${category.toLowerCase()} transactions to understand this spike.`,
            exploreQuery: `Show me ${category} transactions`
          });
        } else if (catChangePercent < -40 && lastCat > 1000) {
          changes.push({
            type: 'category',
            direction: 'down',
            title: `${category} spending dropped by ${Math.abs(catChangePercent)}%`,
            description: `You spent much less on ${category} this week.`,
            stats: {
              before: lastCat,
              after: thisCat,
              changePercent: catChangePercent
            },
            reason: `Either you saved money or a bill might be pending.`,
            exploreQuery: `Show me ${category} transactions`
          });
        }
      }
    });
  }
  
  // Check for new spending patterns
  const recentTransactions = transactions.slice(-10);
  const newCategories = new Set();
  recentTransactions.forEach(txn => {
    const olderTxns = transactions.slice(0, -10).filter(t => t.category === txn.category);
    if (olderTxns.length === 0) {
      newCategories.add(txn.category);
    }
  });
  
  if (newCategories.size > 0) {
    changes.push({
      type: 'anomaly',
      direction: 'neutral',
      title: `New spending category: ${[...newCategories].join(', ')}`,
      description: `You recently started spending in categories you haven't used before.`,
      reason: 'New categories may indicate lifestyle changes or one-time purchases.',
      exploreQuery: `Show me ${[...newCategories][0]} transactions`
    });
  }
  
  return changes;
};

// NEW: Timeline Logic
const generateTimeline = (data) => {
  const { transactions } = data;
  
  // Group by date
  const dailySpending = {};
  transactions.forEach(txn => {
    dailySpending[txn.date] = (dailySpending[txn.date] || 0) + txn.amount;
  });
  
  const chartData = Object.entries(dailySpending)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
    
  return {
    message: `📅 **Spending Timeline**\n\nHere is how your expenses have tracked over time. Use this to spot any unusual spikes!`,
    ui_component: "line_chart",
    ui_data: {
      title: "Daily Spending Trend",
      data: chartData,
      total: transactions.reduce((sum, t) => sum + t.amount, 0)
    },
    suggestions: [
      "What happened on the highest spending day?",
      "Show projected budget",
      "Compare renters"
    ]
  };
};

// NEW: Filtered List Logic
const generateFilteredList = (data, category) => {
  const { transactions } = data;
  
  // Fuzzy match category
  const filtered = transactions.filter(t => 
    t.category.toLowerCase().includes(category.toLowerCase()) || 
    t.description.toLowerCase().includes(category.toLowerCase())
  );
  
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);
  
  if (filtered.length === 0) {
    return {
      message: `I couldn't find any transactions for **${category}**. try checking the spelling or ask for "all transactions".`,
      ui_component: null,
      ui_data: null,
      suggestions: ["Show all transactions", "Show category breakdown"]
    };
  }

  return {
    message: `🔍 **Zoom In: ${category}**\n\nFound **${filtered.length} transactions** matching "${category}" totaling **₹${total.toLocaleString()}**.\n\nThis helps you isolate specific spending habits!`,
    ui_component: "transaction_table",
    ui_data: {
      title: `${category} Transactions`,
      transactions: filtered,
      total: total
    },
    suggestions: [
      "Show full timeline",
      "Who spent the most on this?",
      "Back to summary"
    ]
  };
};

// Comparison Response Generator
const generateComparisonResponse = (userMessage, data) => {
  const { transactions } = data;
  const lowerMessage = userMessage.toLowerCase();
  
  // Determine comparison periods
  let period1, period2;
  
  // Check for month comparison
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthsShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  const foundMonths = [];
  months.forEach((month, idx) => {
    if (lowerMessage.includes(month) || lowerMessage.includes(monthsShort[idx])) {
      foundMonths.push({ month: idx + 1, name: month });
    }
  });
  
  if (foundMonths.length >= 2) {
    period1 = { type: 'month', value: `2026-${String(foundMonths[0].month).padStart(2, '0')}`, label: foundMonths[0].name };
    period2 = { type: 'month', value: `2026-${String(foundMonths[1].month).padStart(2, '0')}`, label: foundMonths[1].name };
  } else {
    // Default: this week vs last week
    const today = new Date();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    period1 = { type: 'week', value: lastWeekStart.toISOString().split('T')[0], label: 'Last Week' };
    period2 = { type: 'week', value: thisWeekStart.toISOString().split('T')[0], label: 'This Week' };
  }
  
  const comparisonData = generateComparison(transactions, period1, period2);
  
  return {
    message: `📊 **Comparison: ${comparisonData.period1.label} vs ${comparisonData.period2.label}**\n\n` +
             `Here's how your spending changed between the two periods.\n\n` +
             `${comparisonData.insights.map(i => `• ${i}`).join('\n')}\n\n` +
             `Use this to track your financial progress!`,
    ui_component: "comparison_view",
    ui_data: {
      title: `${comparisonData.period1.label} vs ${comparisonData.period2.label}`,
      ...comparisonData
    },
    suggestions: [
      "Why did spending change?",
      "Show category breakdown",
      "What should I do about this?"
    ]
  };
};

// Anomaly Response Generator
const generateAnomalyResponse = (data) => {
  const { transactions, roommates } = data;
  const anomalies = detectAnomalies(transactions, roommates);
  
  if (anomalies.length === 0) {
    return {
      message: `✅ **All Clear!**\n\nI didn't find any unusual spending patterns in your transactions. Your expenses look consistent with your typical spending habits.\n\nKeep up the good financial hygiene!`,
      ui_component: null,
      ui_data: null,
      suggestions: [
        "Show spending breakdown",
        "Who owes money?",
        "Plan next month's budget"
      ]
    };
  }
  
  const highSeverity = anomalies.filter(a => a.severity === 'high').length;
  const mediumSeverity = anomalies.filter(a => a.severity === 'medium').length;
  
  return {
    message: `⚠️ **Anomalies Detected**\n\nI found **${anomalies.length} unusual patterns** in your spending:\n` +
             (highSeverity > 0 ? `• ${highSeverity} high priority issue(s)\n` : '') +
             (mediumSeverity > 0 ? `• ${mediumSeverity} medium priority issue(s)\n` : '') +
             `\nReview these findings below and take action if needed.`,
    ui_component: "anomaly_card",
    ui_data: {
      anomalies,
      summary: {
        total: anomalies.length,
        high: highSeverity,
        medium: mediumSeverity
      }
    },
    suggestions: [
      "What should I do about this?",
      "Show all transactions",
      "Compare with last month"
    ]
  };
};

// ENHANCED: Anomaly Response with Pattern Learning
const generateAnomalyResponseWithLearning = (data) => {
  const { transactions, roommates } = data;
  const anomalies = detectAnomaliesWithLearning(transactions, roommates);
  
  if (anomalies.length === 0) {
    const patterns = loadPatterns();
    const baselineMsg = Object.keys(patterns.categoryAverages).length > 0
      ? `I've learned your spending patterns across ${Object.keys(patterns.categoryAverages).length} categories.`
      : '';
    
    return {
      message: `✅ **All Clear!**\n\nI analyzed your spending against your **learned patterns** and didn't find anything unusual. ${baselineMsg}\n\nYour expenses are consistent with your typical habits. Keep it up!`,
      ui_component: null,
      ui_data: null,
      suggestions: [
        "Show my spending patterns",
        "Who owes money?",
        "Plan next month's budget"
      ]
    };
  }
  
  const highSeverity = anomalies.filter(a => a.severity === 'high').length;
  const mediumSeverity = anomalies.filter(a => a.severity === 'medium').length;
  
  // Get justifications for anomalies
  const justifications = anomalies.slice(0, 2).map(a => {
    const just = getJustification('anomaly', { anomaly: a });
    return just.reasons[0];
  }).filter(Boolean);
  
  return {
    message: `⚠️ **Anomalies Detected (Using Learned Patterns)**\n\nI found **${anomalies.length} unusual patterns** based on your historical spending:\n` +
             (highSeverity > 0 ? `• ${highSeverity} high priority issue(s)\n` : '') +
             (mediumSeverity > 0 ? `• ${mediumSeverity} medium priority issue(s)\n` : '') +
             (justifications.length > 0 ? `\n**Why I flagged these:**\n• ${justifications.join('\n• ')}\n` : '') +
             `\nYou can mark any false positive to help me learn better!`,
    ui_component: "anomaly_card",
    ui_data: {
      anomalies,
      summary: {
        total: anomalies.length,
        high: highSeverity,
        medium: mediumSeverity
      },
      canProvideFeedback: true
    },
    suggestions: [
      "What should I do about this?",
      "Show my normal spending patterns",
      "Compare with last month"
    ]
  };
};

// ENHANCED: Settlement Analysis with Deep Justification
const generateSettlementAnalysisWithJustification = (data, skipConfirmation = false) => {
  const { transactions, roommates } = data;
  const balances = {};
  
  roommates.forEach(name => balances[name] = 0);
  
  const unsettled = transactions.filter(txn => !txn.settled);
  unsettled.forEach(txn => {
    balances[txn.payer] += txn.amount;
    Object.entries(txn.split).forEach(([person, share]) => {
      balances[person] -= share;
    });
  });
  
  Object.keys(balances).forEach(name => {
    balances[name] = Math.round(balances[name]);
  });
  
  const settlements = [];
  const debtors = Object.entries(balances)
    .filter(([_, bal]) => bal < 0)
    .map(([name, bal]) => ({ name, amount: Math.abs(bal), balance: bal }))
    .sort((a, b) => b.amount - a.amount);
  
  const creditors = Object.entries(balances)
    .filter(([_, bal]) => bal > 0)
    .map(([name, bal]) => ({ name, amount: bal, balance: bal }))
    .sort((a, b) => b.amount - a.amount);
  
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const settleAmount = Math.min(debtors[i].amount, creditors[j].amount);
    if (settleAmount > 0) {
      settlements.push({ from: debtors[i].name, to: creditors[j].name, amount: settleAmount });
    }
    debtors[i].amount -= settleAmount;
    creditors[j].amount -= settleAmount;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  
  const totalUnsettled = unsettled.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate days since oldest unsettled transaction
  const oldestUnsettled = unsettled.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const daysSinceOldest = oldestUnsettled 
    ? Math.floor((new Date() - new Date(oldestUnsettled.date)) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Get deep justification
  const owesMax = debtors[0];
  const owedMax = creditors[0];
  const justification = getJustification('settlement', {
    owesMax: owesMax ? { name: owesMax.name, balance: owesMax.balance } : null,
    owedMax: owedMax ? { name: owedMax.name, balance: owedMax.balance } : null,
    unsettledAmount: totalUnsettled,
    daysSinceLastSettlement: daysSinceOldest
  });
  
  // Build justification message
  let justificationMsg = '';
  if (justification.reasons.length > 0 && totalUnsettled > 5000) {
    justificationMsg = `\n\n📋 **Why settle now?**\n${justification.reasons.map(r => `• ${r}`).join('\n')}`;
  }
  
  const settlementText = settlements.length > 0 
    ? settlements.map(s => `• **${s.from}** → **${s.to}**: ₹${s.amount.toLocaleString()}`).join('\n')
    : "Everyone is settled up! 🎉";
  
  const balanceExplanation = Object.entries(balances)
    .filter(([_, bal]) => bal !== 0)
    .map(([name, bal]) => {
      if (bal > 0) return `• ${name} is owed ₹${bal.toLocaleString()}`;
      return `• ${name} owes ₹${Math.abs(bal).toLocaleString()}`;
    })
    .join('\n');
  
  // If settlements exist and not skipping confirmation, ask for confirmation
  if (settlements.length > 0 && !skipConfirmation && totalUnsettled > 2000) {
    // Store pending settlement for confirmation
    pendingSettlementConfirmation = {
      settlements,
      balances,
      totalUnsettled,
      transactionCount: unsettled.length
    };
    
    return {
      message: `💰 **Settlement Preview**\n\n**Current Balances**:\n${balanceExplanation}\n\n**Proposed Payments**:\n${settlementText}${justificationMsg}\n\n⚠️ **Are you sure you want to mark these as settled?**\n\nThis will mark ${unsettled.length} transactions (₹${totalUnsettled.toLocaleString()}) as settled.`,
      ui_component: "settlement_confirmation",
      ui_data: {
        settlements,
        balances: Object.entries(balances).map(([name, balance]) => ({ name, balance })),
        justification,
        totalAmount: totalUnsettled,
        transactionCount: unsettled.length,
        needsConfirmation: true
      },
      suggestions: [
        "Yes, settle now",
        "No, show details first",
        "Cancel"
      ],
      confidence: { level: 'high', reason: 'Settlement requires your confirmation' }
    };
  }
  
  return {
    message: `💰 **Settlement Summary**\n\n**Current Balances**:\n${balanceExplanation || "All balances are at zero!"}\n\n**Required Payments**:\n${settlementText}${justificationMsg}\n\n${settlements.length > 0 ? `💡 **Total unsettled**: ₹${totalUnsettled.toLocaleString()} across ${unsettled.length} transactions (oldest: ${daysSinceOldest} days ago).` : "Great job keeping things balanced!"}`,
    ui_component: "settlement_card",
    ui_data: {
      settlements,
      balances: Object.entries(balances).map(([name, balance]) => ({ name, balance })),
      justification
    },
    suggestions: [
      "Show all transactions",
      "What should I do next?",
      "Compare spending by person"
    ]
  };
};

// Generate settlement confirmed response
const generateSettlementConfirmed = (confirmationData, data) => {
  const { settlements, totalUnsettled, transactionCount } = confirmationData;
  
  // Record the settlement
  recordSettlement(totalUnsettled, settlements.map(s => [s.from, s.to]).flat());
  
  const settlementText = settlements.map(s => 
    `✅ **${s.from}** paid **${s.to}** ₹${s.amount.toLocaleString()}`
  ).join('\n');
  
  return {
    message: `🎉 **Settlement Complete!**\n\n${settlementText}\n\n✨ **${transactionCount} transactions** totaling **₹${totalUnsettled.toLocaleString()}** have been marked as settled.\n\nEveryone is now even! Great teamwork keeping finances in order. 👏`,
    ui_component: "settlement_success",
    ui_data: {
      settlements,
      totalAmount: totalUnsettled,
      transactionCount,
      timestamp: new Date().toISOString()
    },
    suggestions: [
      "Show updated balances",
      "View settlement history",
      "What's next?"
    ],
    confidence: { level: 'high', reason: 'Settlement successfully recorded' }
  };
};

// ENHANCED: Decision Guide with Deep Justification
const generateDecisionGuideWithJustification = (data) => {
  const { transactions, roommates } = data;
  
  const unsettled = transactions.filter(t => !t.settled);
  const unsettledAmount = unsettled.reduce((sum, t) => sum + t.amount, 0);
  
  const balances = {};
  roommates.forEach(name => balances[name] = 0);
  unsettled.forEach(txn => {
    balances[txn.payer] += txn.amount;
    Object.entries(txn.split).forEach(([person, share]) => {
      balances[person] -= share;
    });
  });
  
  const sortedBalances = Object.entries(balances).sort((a, b) => a[1] - b[1]);
  const owesMax = { name: sortedBalances[0][0], balance: sortedBalances[0][1] };
  const owedMax = { name: sortedBalances[sortedBalances.length - 1][0], balance: sortedBalances[sortedBalances.length - 1][1] };
  
  // Get anomalies with learning
  const anomalies = detectAnomaliesWithLearning(transactions, roommates);
  
  // Calculate days since oldest unsettled
  const oldestUnsettled = unsettled.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const daysSinceOldest = oldestUnsettled 
    ? Math.floor((new Date() - new Date(oldestUnsettled.date)) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Get justifications
  const settlementJustification = getJustification('settlement', {
    owesMax, owedMax, unsettledAmount, daysSinceLastSettlement: daysSinceOldest
  });
  
  // Build prioritized steps with justifications
  const steps = [];
  
  // Step 1: Settlement (if significant)
  if (unsettledAmount > 5000 || daysSinceOldest > 14) {
    const reason = settlementJustification.reasons[0] || `₹${unsettledAmount.toLocaleString()} pending`;
    steps.push({
      id: 'settle',
      title: `Settle ₹${Math.abs(Math.round(owesMax.balance)).toLocaleString()} with ${owedMax.name}`,
      detail: `**Why?** ${reason}`,
      priority: settlementJustification.confidence === 'high' ? 'high' : 'medium',
      action: { type: 'settle', label: 'View Settlement Details', query: 'Who owes whom?' }
    });
  }
  
  // Step 2: Review anomalies (with justification)
  if (anomalies.length > 0) {
    const anomalyJust = getJustification('anomaly', { anomaly: anomalies[0] });
    steps.push({
      id: 'review_anomalies',
      title: `Review ${anomalies.length} unusual expense(s)`,
      detail: `**Why?** ${anomalyJust.reasons[0] || 'Spending deviates from your learned patterns'}`,
      priority: anomalies.some(a => a.severity === 'high') ? 'high' : 'medium',
      action: { type: 'review', label: 'View Anomalies', query: 'Show unusual spending' }
    });
  }
  
  // Step 3: Budget planning
  const categoryTotals = {};
  transactions.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  
  const budgetJust = getJustification('budget', {
    currentSpending: transactions.reduce((s, t) => s + t.amount, 0),
    projectedSpending: transactions.reduce((s, t) => s + t.amount, 0) * 1.05,
    topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null
  });
  
  steps.push({
    id: 'plan_budget',
    title: 'Plan next month\'s budget',
    detail: `**Why?** ${budgetJust.reasons[0] || 'Stay ahead of expenses with proactive planning'}`,
    priority: 'low',
    action: { type: 'budget', label: 'Create Budget', query: 'Plan next month budget' }
  });
  
  const quickActions = [
    { id: 'settle_now', type: 'settle', label: 'Settle Up', description: 'Clear pending balances' },
    { id: 'set_budget', type: 'budget', label: 'Set Budget', description: 'Plan monthly spending' },
    { id: 'view_patterns', type: 'patterns', label: 'My Patterns', description: 'See learned spending habits' },
    { id: 'plan_expense', type: 'plan', label: 'Plan Expense', description: 'Budget for a purchase' }
  ];
  
  let context = '';
  if (steps.some(s => s.priority === 'high')) {
    context = `⚠️ You have **${steps.filter(s => s.priority === 'high').length} high-priority action(s)** that need attention.`;
  } else if (unsettledAmount > 0) {
    context = `You have ₹${unsettledAmount.toLocaleString()} in unsettled expenses. Consider settling when convenient.`;
  } else {
    context = '✅ Your finances look healthy! Here are some optional next steps.';
  }
  
  return {
    message: `🎯 **Recommended Actions**\n\n${context}\n\nEach recommendation below includes a **justification** explaining why I'm suggesting it:`,
    ui_component: "decision_guide",
    ui_data: {
      title: 'What Should You Do Next?',
      context,
      steps,
      quickActions,
      insight: `These recommendations are based on your transaction history and learned spending patterns. The more you use FairShare, the smarter these suggestions become!`,
      hasJustifications: true
    },
    suggestions: [
      "Show settlement details",
      "Compare my spending",
      "Show my spending patterns"
    ]
  };
};

// Decision Guide Generator (basic version for fallback)
const generateDecisionGuide = (data) => {
  const { transactions, roommates } = data;
  
  // Calculate current state
  const unsettled = transactions.filter(t => !t.settled);
  const unsettledAmount = unsettled.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate balances
  const balances = {};
  roommates.forEach(name => balances[name] = 0);
  unsettled.forEach(txn => {
    balances[txn.payer] += txn.amount;
    Object.entries(txn.split).forEach(([person, share]) => {
      balances[person] -= share;
    });
  });
  
  const owesMax = Object.entries(balances).sort((a, b) => a[1] - b[1])[0];
  const owedMax = Object.entries(balances).sort((a, b) => b[1] - a[1])[0];
  
  // Detect anomalies
  const anomalies = detectAnomalies(transactions, roommates);
  
  // Build decision steps
  const steps = [];
  
  // Step 1: Settle up if needed
  if (unsettledAmount > 5000) {
    steps.push({
      id: 'settle',
      title: `Settle ₹${Math.abs(Math.round(owesMax[1])).toLocaleString()} with ${owedMax[0]}`,
      detail: `${owesMax[0]} currently owes ${owedMax[0]} the most. Settling up will clear the balances.`,
      action: { type: 'settle', label: 'View Settlement Details', query: 'Who owes whom?' }
    });
  }
  
  // Step 2: Review anomalies
  if (anomalies.length > 0) {
    steps.push({
      id: 'review_anomalies',
      title: `Review ${anomalies.length} unusual expense(s)`,
      detail: 'Some transactions deviate from your normal spending patterns.',
      action: { type: 'review', label: 'View Anomalies', query: 'Show unusual spending' }
    });
  }
  
  // Step 3: Budget planning
  steps.push({
    id: 'plan_budget',
    title: 'Plan next month\'s budget',
    detail: 'Set spending targets based on your current patterns to stay on track.',
    action: { type: 'budget', label: 'Create Budget', query: 'Plan next month budget' }
  });
  
  // Quick actions
  const quickActions = [
    { id: 'settle_now', type: 'settle', label: 'Settle Up', description: 'Clear pending balances' },
    { id: 'set_budget', type: 'budget', label: 'Set Budget', description: 'Plan monthly spending' },
    { id: 'add_reminder', type: 'reminder', label: 'Add Reminder', description: 'Never miss a bill' },
    { id: 'plan_expense', type: 'plan', label: 'Plan Expense', description: 'Budget for a purchase' }
  ];
  
  // Context message
  let context = '';
  if (unsettledAmount > 10000) {
    context = `You have ₹${unsettledAmount.toLocaleString()} in unsettled expenses. Prioritize settling up.`;
  } else if (anomalies.length > 0) {
    context = `${anomalies.length} unusual patterns detected. Review these to maintain budget control.`;
  } else {
    context = 'Your finances look healthy! Here are some recommended next steps.';
  }
  
  return {
    message: `🎯 **Recommended Actions**\n\n${context}\n\nFollow the steps below to keep your shared finances in order:`,
    ui_component: "decision_guide",
    ui_data: {
      title: 'What Should You Do Next?',
      context,
      steps,
      quickActions,
      insight: unsettledAmount > 0 
        ? `Tip: Settling up regularly prevents debt from piling up and keeps everyone happy!`
        : `Great job! You're all caught up. Consider setting a monthly budget to stay ahead.`
    },
    suggestions: [
      "Show settlement details",
      "Compare my spending",
      "Simulate a budget"
    ]
  };
};

// POST /api/chat - Send a message
router.post('/', async (req, res) => {
  try {
    // Learn patterns on first request
    if (!global.patternsInitialized) {
      learnFromTransactions(req.transactions.transactions, req.transactions.roommates);
      global.patternsInitialized = true;
    }
    
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Add user message to history
    chatHistory.push({
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    // Generate AI response
    const aiResponse = await generateAIResponse(message, req.transactions);
    
    // Add AI response to history
    const assistantMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: aiResponse.message,
      ui_component: aiResponse.ui_component,
      ui_data: aiResponse.ui_data,
      suggestions: aiResponse.suggestions,
      confidence: aiResponse.confidence || { level: 'high', reason: 'Analysis complete' },
      timestamp: new Date().toISOString()
    };
    
    chatHistory.push(assistantMessage);
    
    res.json(assistantMessage);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// GET /api/chat/history - Get chat history
router.get('/history', (req, res) => {
  res.json(chatHistory);
});

// DELETE /api/chat/history - Clear chat history
router.delete('/history', (req, res) => {
  chatHistory = [];
  // Clear conversation context for fresh start
  clearContext();
  pendingClarification = null;
  pendingSettlementConfirmation = null;
  res.json({ message: 'Chat history cleared' });
});

// GET /api/chat/insights - Get proactive insights on app load
router.get('/insights', (req, res) => {
  try {
    const insights = generateProactiveInsights(req.transactions);
    res.json(insights);
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Generate proactive insights for welcome message
const generateProactiveInsights = (data) => {
  const { transactions, roommates } = data;
  
  // Calculate key metrics
  const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
  const unsettled = transactions.filter(t => !t.settled);
  const unsettledAmount = unsettled.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate balances
  const balances = {};
  roommates.forEach(name => balances[name] = 0);
  unsettled.forEach(txn => {
    balances[txn.payer] += txn.amount;
    Object.entries(txn.split).forEach(([person, share]) => {
      balances[person] -= share;
    });
  });
  
  // Find who owes most and who is owed most
  const sortedBalances = Object.entries(balances).sort((a, b) => a[1] - b[1]);
  const owesMax = sortedBalances[0]; // Most negative = owes most
  const owedMax = sortedBalances[sortedBalances.length - 1]; // Most positive = owed most
  
  // Calculate spending by person
  const spending = {};
  roommates.forEach(name => spending[name] = 0);
  transactions.forEach(txn => spending[txn.payer] += txn.amount);
  const topSpender = Object.entries(spending).sort((a, b) => b[1] - a[1])[0];
  
  // Check for anomalies
  const avgPerTransaction = totalExpenses / transactions.length;
  const recentTxns = transactions.slice(-5);
  const recentAvg = recentTxns.reduce((sum, t) => sum + t.amount, 0) / recentTxns.length;
  const spendingTrend = recentAvg > avgPerTransaction * 1.3 ? 'increasing' : recentAvg < avgPerTransaction * 0.7 ? 'decreasing' : 'stable';
  
  // Detect anomalies
  const anomalies = detectAnomalies(transactions, roommates);
  
  // Build insights message
  let message = `👋 **Welcome back to FairShare!**\n\nHere's your financial snapshot:\n\n`;
  
  // Key metrics
  message += `💰 **Total Expenses**: ₹${totalExpenses.toLocaleString()}\n`;
  message += `📊 **Transactions**: ${transactions.length} total, ${unsettled.length} pending\n\n`;
  
  // Alert: Unsettled amount
  if (unsettledAmount > 5000) {
    message += `⚠️ **Alert**: You have ₹${unsettledAmount.toLocaleString()} in unsettled expenses!\n\n`;
  }
  
  // Anomaly alerts
  if (anomalies.length > 0) {
    const highPriority = anomalies.filter(a => a.severity === 'high');
    if (highPriority.length > 0) {
      message += `🚨 **Attention**: Found ${highPriority.length} unusual spending pattern(s) that need your review.\n\n`;
    } else {
      message += `📋 **Notice**: ${anomalies.length} spending pattern(s) worth reviewing.\n\n`;
    }
  }
  
  // Who owes whom insight
  if (owesMax[1] < -500 && owedMax[1] > 500) {
    message += `💡 **Quick Settlement**: ${owesMax[0]} owes ₹${Math.abs(Math.round(owesMax[1])).toLocaleString()}, mostly to ${owedMax[0]}.\n\n`;
  }
  
  // Top spender insight
  const spenderPercent = ((topSpender[1] / totalExpenses) * 100).toFixed(0);
  if (spenderPercent > 50) {
    message += `🏆 **Top Contributor**: ${topSpender[0]} has paid ${spenderPercent}% of all expenses (₹${topSpender[1].toLocaleString()}).\n\n`;
  }
  
  // Trend insight
  if (spendingTrend === 'increasing') {
    message += `📈 **Trend**: Spending has been higher than usual lately. Want to see where?\n\n`;
  }
  
  message += `Ask me anything about your shared finances!`;

  // Prepare chart data for quick visual
  const chartData = Object.entries(spending).map(([name, amount]) => ({
    name,
    amount,
    percentage: ((amount / totalExpenses) * 100).toFixed(1)
  }));

  // Determine best suggestions based on state
  const suggestions = [];
  if (anomalies.length > 0) {
    suggestions.push("Show unusual spending");
  }
  if (unsettled.length > 0) {
    suggestions.push("Who owes money to whom?");
  }
  suggestions.push("What should I do next?");

  // Detect automatic changes for proactive insight
  const detectedChanges = detectChanges(transactions, roommates);

  // If significant changes detected, show change detection component
  if (detectedChanges.length > 0) {
    return {
      message: message + `\n\n📊 **I also noticed some changes in your spending patterns:**`,
      ui_component: "change_detection",
      ui_data: {
        title: "Recent Changes Detected",
        changes: detectedChanges
      },
      suggestions,
      confidence: {
        level: 'high',
        reason: `Based on ${transactions.length} transactions over recent weeks`,
        details: 'Changes detected by comparing recent spending against your historical patterns.'
      },
      reasoning: {
        steps: [
          { type: 'observation', text: `Analyzed ${transactions.length} total transactions` },
          { type: 'analysis', text: 'Compared this week vs last week spending' },
          { type: 'analysis', text: 'Identified category-level changes' },
          { type: 'insight', text: `Found ${detectedChanges.length} notable change(s)` }
        ],
        assumptions: ['Comparing similar time periods', 'No major lifestyle changes assumed'],
        conclusion: 'These changes might indicate spending pattern shifts worth reviewing.'
      },
      anomalyCount: anomalies.length,
      changesCount: detectedChanges.length
    };
  }

  return {
    message,
    ui_component: "bar_chart",
    ui_data: {
      title: "Spending by Roommate",
      data: chartData,
      total: totalExpenses
    },
    suggestions,
    confidence: {
      level: 'high',
      reason: `Based on ${transactions.length} transactions`,
      details: 'All calculations use your complete transaction history.',
      assumptions: ['All expenses are shared equally', 'Transaction data is accurate']
    },
    anomalyCount: anomalies.length
  };
};

export default router;
