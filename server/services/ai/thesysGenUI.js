// Thesys GenUI Service - True Runtime UI Generation
// This service calls Thesys API to generate dynamic UI specifications at runtime
// Universal - Works for all personas (solo, traveler, household, group, vendor)

import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generatePromptWithData, detectPersonaFromData } from '../../config/systemPrompt.js';

// Thesys API endpoint
const THESYS_API_URL = process.env.THESYS_API_URL || 'https://api.thesys.dev/v1/chat/completions';

// GenUI System Prompt - Instructs Thesys to generate UI component specifications
const GENUI_SYSTEM_PROMPT = `You are a GENERATIVE UI engine for FinMate, a Universal Financial Co-pilot that adapts to any user persona.

CRITICAL RULES:
1. ONLY use real data provided in the user's context
2. IF NO DATA provided/zero transactions, return null UI and ask for data upload
3. DO NOT use example names (Rahul, Priya) or numbers unless they exist in actual data

PERSONA DETECTION - Adapt UI based on detected persona:
- SOLO: Personal spending trends, budget tracking, savings goals, category breakdown
- TRAVELER: Daily trip budget, day-by-day spending, trip category breakdown
- HOUSEHOLD: Utility bills, recurring expenses, bill due dates, monthly comparisons
- GROUP: Splits, debts, settlements, who owes whom, fair share calculations
- VENDOR: Income vs expenses, profit margins, daily cash flow, customer payments

OUTPUT FORMAT - Return JSON:
{
  "message": "Your conversational response",
  "generated_ui": [/* Array of UI component specs */],
  "suggestions": ["Follow-up 1", "Follow-up 2"],
  "detected_persona": "solo|traveler|household|group|vendor",
  "confidence": { "level": "high|medium|low", "reason": "..." }
}

AVAILABLE COMPONENT TYPES:

1. METRIC CARD - For key numbers:
{
  "component": "metric",
  "label": "Total Spent",
  "value": 45000,
  "change": 12,
  "changeType": "positive|negative|neutral",
  "icon": "rupee|wallet|trending-up|trending-down|plane|home|store",
  "subtext": "This month",
  "comparison": "15% higher than last month",
  "action": { "query": "Show details", "label": "View breakdown" }
}

2. DYNAMIC CHART - Generate exact data for visualization:
{
  "component": "chart",
  "type": "bar|pie|line|area",
  "title": "Spending Overview",
  "subtitle": "January 2026",
  "data": [
    { "name": "Category/Person/Date", "value": 25000, "percentage": 42 }
  ],
  "config": {
    "xKey": "name",
    "yKey": "value",
    "colors": ["#22c55e", "#3b82f6"],
    "height": 220,
    "showLegend": true
  },
  "drillDownEnabled": true
}

3. DYNAMIC LIST - For transactions, insights, settlements (group only):
{
  "component": "list",
  "title": "Recent Transactions",
  "type": "transactions|insights|settlements",
  "showIndex": true,
  "items": [
    {
      "title": "Description",
      "subtitle": "Category • Date",
      "value": 3500,
      "valueColor": "text-red-400",
      "icon": "wallet|food|travel|home|store",
      "action": { "query": "More details" }
    }
  ],
  "emptyMessage": "No transactions found"
}

4. INSIGHT CARD - For AI-generated discoveries:
{
  "component": "insight",
  "type": "info|success|warning|idea|highlight",
  "insight": "Key finding about the user's finances",
  "explanation": "Detailed explanation with numbers",
  "confidence": "high",
  "action": { "query": "Explore more", "label": "View details" }
}

5. COMPARISON - Side by side:
{
  "component": "comparison",
  "title": "This Week vs Last Week",
  "left": { "label": "This Week", "value": 12500 },
  "right": { "label": "Last Week", "value": 9800 },
  "metrics": [
    { "label": "Food", "change": 28, "direction": "higher" },
    { "label": "Transport", "change": -15, "direction": "lower" }
  ]
}

6. FLOW/STEPS - Guided actions:
{
  "component": "flow",
  "title": "Action Guide",
  "allowSkip": false,
  "steps": [
    { "title": "Step 1", "detail": "Description", "action": { "query": "..." } }
  ]
}

7. GRID - Multiple items in grid:
{
  "component": "grid",
  "columns": 2,
  "gap": 3,
  "items": [/* Array of any component specs */]
}

8. CONTAINER - Wrapper with title:
{
  "component": "container",
  "title": "Summary",
  "children": [/* Nested component specs */]
}

PERSONA-SPECIFIC UI PATTERNS:

FOR SOLO/PERSONAL:
- Category pie charts
- Spending timelines
- Budget vs actual comparison
- Savings progress

FOR TRAVELER:
- Daily spend vs budget bar chart
- Trip expense categories
- Day-by-day timeline
- Remaining trip budget metric

FOR HOUSEHOLD:
- Utility bill trends
- Recurring expense list
- Monthly comparison
- Bill due dates

FOR GROUP (splits):
- Who owes whom settlement list
- Balance per person bar chart
- Shared vs personal split
- Settlement flow steps

FOR VENDOR:
- Income vs expense comparison
- Profit margin metric
- Daily cash flow line chart
- Top customers list

GENERATION RULES:
1. ALWAYS use actual data from context - never use placeholder values
2. Calculate real numbers, percentages, and comparisons
3. Generate insights by analyzing patterns in the data
4. Choose the BEST visualization for the user's question AND persona
5. Make UI interactive with drill-down actions
6. Include helpful follow-up suggestions
7. Detect and respect the user's persona`;

/**
 * Generate dynamic UI using Thesys API
 */
export const generateThesysUI = async (userMessage, transactions, conversationContext = '') => {
  if (!process.env.THESYS_API_KEY) {
    throw new Error('THESYS_API_KEY is required');
  }

  // Detect persona from data
  const persona = detectPersonaFromData(transactions);
  const dataContext = generatePromptWithData(transactions);

  const systemPrompt = `${GENUI_SYSTEM_PROMPT}

DETECTED PERSONA: ${persona || 'unknown (no data yet)'}

CURRENT DATA CONTEXT:
${dataContext}

CONVERSATION HISTORY:
${conversationContext || 'New conversation'}

NOW GENERATE A DYNAMIC UI RESPONSE FOR THE USER'S QUERY.
Remember: Generate ACTUAL values from the data, not placeholders! Adapt UI to the detected persona.`;

  try {
    console.log(`🎨 Generating UI via Thesys GenUI API... (Persona: ${persona || 'unknown'})`);
    
    const response = await axios.post(
      THESYS_API_URL,
      {
        model: process.env.THESYS_MODEL || 'thesys-genui-1.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 3000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.THESYS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Thesys UI generation complete');

    // Parse response
    let result;
    if (response.data.choices?.[0]?.message?.content) {
      result = JSON.parse(response.data.choices[0].message.content);
    } else if (response.data.generated_ui) {
      result = response.data;
    } else {
      result = response.data;
    }

    // Normalize response
    return {
      message: result.message || 'Here\'s what I found:',
      generated_ui: result.generated_ui || result.ui || null,
      suggestions: result.suggestions || [],
      confidence: result.confidence || { level: 'high', reason: 'Generated by Thesys' },
      reasoning: result.reasoning || null,
      // Mark as Thesys-generated for tracking
      _source: 'thesys_genui',
      _timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Thesys GenUI Error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Generate UI using Google Gemini directly (Fallback for Thesys)
 */
const generateGeminiUI = async (userMessage, transactions, conversationContext) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required for Gemini GenUI');
  }

  const dataContext = generatePromptWithData(transactions);

  const prompt = `${GENUI_SYSTEM_PROMPT}

CURRENT DATA CONTEXT:
${dataContext}

CONVERSATION HISTORY:
${conversationContext || 'New conversation'}

USER QUERY: ${userMessage}

NOW GENERATE A DYNAMIC UI RESPONSE FOR THE USER'S QUERY.
Return ONLY valid JSON.`;

  try {
    console.log('🎨 Generating UI via Google Gemini...');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log('✅ Gemini UI generation complete');
    return JSON.parse(text);

  } catch (error) {
    console.error('Gemini GenUI Error:', error.message);
    throw error;
  }
};

/**
 * Fallback: Generate UI locally when Thesys is unavailable
 * This mimics what Thesys would generate, proving the concept
 * Now persona-aware to support all user types
 */
export const generateLocalUI = (userMessage, transactionData) => {
  const { transactions: txns, config } = transactionData;
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  const currency = config?.currency || '₹';
  const lowerMessage = userMessage.toLowerCase();
  
  // Calculate common metrics
  const spending = {};
  const categoryTotals = {};
  let total = 0;
  
  txns.forEach(t => {
    // For group mode, track by payer; for solo, track by category only
    if (persona === 'group' && t.payer) {
      spending[t.payer] = (spending[t.payer] || 0) + t.amount;
    }
    const cat = t.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    total += t.amount;
  });

  const spendingData = Object.entries(spending)
    .map(([name, amount]) => ({
      name,
      value: amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0
    }))
    .sort((a, b) => b.value - a.value);

  const categoryData = Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      name,
      value: amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0
    }))
    .sort((a, b) => b.value - a.value);

  // Generate UI based on query type
  if (lowerMessage.includes('who spent') || lowerMessage.includes('spending')) {
    // For group mode, show spending by person
    if (persona === 'group' && spendingData.length > 0) {
      const topSpender = spendingData[0];
      return {
        message: `**${topSpender.name}** has spent the most at ${currency}${topSpender.value.toLocaleString()} (${topSpender.percentage}% of total).`,
        generated_ui: [
          {
            component: 'chart',
            type: 'bar',
            title: 'Spending by Member',
            subtitle: 'Click any bar to see their transactions',
            data: spendingData,
            config: { xKey: 'name', yKey: 'value' },
            drillDownEnabled: true
          },
          {
          component: 'insight',
          type: 'highlight',
          insight: `${topSpender.name} is covering ${topSpender.percentage}% of shared expenses`,
          explanation: `Total shared spending: ${currency}${total.toLocaleString()}`,
          action: { query: `Show ${topSpender.name}'s transactions`, label: 'View details' }
        }
      ],
      suggestions: [`Show ${topSpender.name}'s transactions`, 'Who owes money?', 'Break down by category'],
      confidence: { level: 'high', reason: 'Calculated from transaction data' },
      _source: 'local_genui'
    };
    }
    
    // For solo mode, show category breakdown instead
    const topCategory = categoryData[0] || { name: 'Unknown', value: 0, percentage: 0 };
    return {
      message: `Your biggest expense category is **${topCategory.name}** at ${currency}${topCategory.value.toLocaleString()} (${topCategory.percentage}%).`,
      generated_ui: [
        {
          component: 'chart',
          type: 'pie',
          title: 'Spending by Category',
          data: categoryData,
          config: { xKey: 'name', yKey: 'value', showLegend: true },
          drillDownEnabled: true
        }
      ],
      suggestions: [`Show ${topCategory.name} transactions`, 'Set budget limits', 'View spending trends'],
      confidence: { level: 'high', reason: 'Calculated from transaction data' },
      _source: 'local_genui'
    };
  }

  if (lowerMessage.includes('category') || lowerMessage.includes('breakdown')) {
    const topCategory = categoryData[0] || { name: 'Unknown', value: 0, percentage: 0 };
    return {
      message: `Your biggest expense category is **${topCategory.name}** at ${currency}${topCategory.value.toLocaleString()} (${topCategory.percentage}%).`,
      generated_ui: [
        {
          component: 'chart',
          type: 'pie',
          title: 'Expenses by Category',
          data: categoryData,
          config: { xKey: 'name', yKey: 'value', showLegend: true },
          drillDownEnabled: true
        },
        {
          component: 'grid',
          columns: 2,
          gap: 3,
          items: categoryData.slice(0, 4).map(c => ({
            component: 'metric',
            label: c.name,
            value: c.value,
            subtext: `${c.percentage}% of total`,
            icon: c.name === 'Food' ? 'wallet' : c.name === 'Rent' ? 'target' : 'rupee',
            action: { query: `Show ${c.name} expenses`, label: 'Details' }
          }))
        }
      ],
      suggestions: [`Show ${topCategory.name} transactions`, 'Compare to last month', 'Set budget'],
      confidence: { level: 'high', reason: 'Calculated from transaction data' },
      _source: 'local_genui'
    };
  }

  if (lowerMessage.includes('owe') || lowerMessage.includes('settle')) {
    // Settlement only makes sense for GROUP persona
    if (persona !== 'group' || participants.length === 0) {
      return {
        message: `Settlement tracking is designed for group expenses. You're currently in **${persona}** mode.`,
        generated_ui: [],
        suggestions: ['Show spending breakdown', 'Set a budget', 'View trends'],
        _source: 'local_genui'
      };
    }
    
    // Calculate balances
    const balances = {};
    participants.forEach(name => { balances[name] = 0; });
    
    txns.filter(t => !t.settled).forEach(t => {
      if (t.payer && balances[t.payer] !== undefined) {
        balances[t.payer] += t.amount;
      }
      if (t.split) {
        Object.entries(t.split).forEach(([person, share]) => {
          if (balances[person] !== undefined) {
            balances[person] -= share;
          }
        });
      }
    });

    const settlements = [];
    const debtors = Object.entries(balances).filter(([_, b]) => b < 0).sort((a, b) => a[1] - b[1]);
    const creditors = Object.entries(balances).filter(([_, b]) => b > 0).sort((a, b) => b[1] - a[1]);

    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const [debtor, debt] = debtors[di];
      const [creditor, credit] = creditors[ci];
      const amount = Math.min(-debt, credit);
      
      if (amount > 0) {
        settlements.push({
          title: `${debtor} → ${creditor}`,
          subtitle: 'Settlement needed',
          value: Math.round(amount),
          valueColor: 'text-amber-400',
          icon: 'wallet',
          iconBg: 'bg-amber-500/10',
          iconColor: 'text-amber-400',
          action: { query: `Settle ${debtor} to ${creditor}` }
        });
      }
      
      debtors[di] = [debtor, debt + amount];
      creditors[ci] = [creditor, credit - amount];
      
      if (debtors[di][1] >= 0) di++;
      if (creditors[ci][1] <= 0) ci++;
    }

    const totalOwed = settlements.reduce((sum, s) => sum + s.value, 0);

    return {
      message: settlements.length > 0 
        ? `There are **${settlements.length} settlements** needed totaling ${currency}${totalOwed.toLocaleString()}.`
        : `🎉 Everyone is settled up! No payments needed.`,
      generated_ui: [
        {
          component: 'list',
          title: 'Required Settlements',
          type: 'settlements',
          showIndex: true,
          items: settlements,
          emptyMessage: 'All settled up! No payments needed. 🎉'
        },
        settlements.length > 0 ? {
          component: 'flow',
          title: 'Settlement Steps',
          allowSkip: false,
          steps: [
            { title: 'Review settlements above', detail: `Total: ₹${totalOwed.toLocaleString()}` },
            { title: 'Make payments', detail: 'Use UPI/Cash to settle' },
            { title: 'Mark as settled', action: { query: 'Confirm all settled', label: 'Mark Done' } }
          ]
        } : null
      ].filter(Boolean),
      suggestions: ['Show transaction history', 'Why does Priya owe?', 'What should I do next?'],
      confidence: { level: 'high', reason: 'Calculated using Splitwise algorithm' },
      _source: 'local_genui'
    };
  }

  // Timeline / trend queries
  if (lowerMessage.includes('timeline') || lowerMessage.includes('trend') || lowerMessage.includes('over time') || lowerMessage.includes('history')) {
    // Group transactions by date
    const byDate = {};
    txns.forEach(t => {
      const date = t.date.split('T')[0];
      byDate[date] = (byDate[date] || 0) + t.amount;
    });
    
    const timelineData = Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ name: date, value: amount }));
    
    return {
      message: `Here's your spending trend over time. Total: ₹${total.toLocaleString()} across ${Object.keys(byDate).length} days.`,
      generated_ui: [
        {
          component: 'chart',
          type: 'area',
          title: 'Spending Over Time',
          subtitle: 'Click any point to see that day\'s transactions',
          data: timelineData,
          config: { xKey: 'name', yKey: 'value' },
          drillDownEnabled: true
        },
        {
          component: 'insight',
          type: 'info',
          insight: `Average daily spending: ₹${Math.round(total / Object.keys(byDate).length).toLocaleString()}`,
          explanation: `Based on ${txns.length} transactions over ${Object.keys(byDate).length} days`
        }
      ],
      suggestions: ['Show unusual spending days', 'Compare to last week', 'Who spent on which days?'],
      confidence: { level: 'high', reason: 'Calculated from transaction dates' },
      _source: 'local_genui'
    };
  }

  // Anomaly / unusual queries
  if (lowerMessage.includes('unusual') || lowerMessage.includes('anomal') || lowerMessage.includes('strange') || lowerMessage.includes('weird')) {
    // Find unusual transactions (> 2x average)
    const avgAmount = total / txns.length;
    const anomalies = txns.filter(t => t.amount > avgAmount * 2);
    
    if (anomalies.length === 0) {
      return {
        message: `✅ No unusual spending detected! All transactions are within normal range.`,
        generated_ui: [
          {
            component: 'insight',
            type: 'success',
            insight: 'Your spending looks consistent',
            explanation: `Average transaction: ₹${Math.round(avgAmount).toLocaleString()}. Nothing significantly above this.`
          }
        ],
        suggestions: ['Show spending breakdown', 'Who spent the most?', 'Show timeline'],
        confidence: { level: 'high', reason: 'Statistical analysis of transaction amounts' },
        _source: 'local_genui'
      };
    }
    
    return {
      message: `Found **${anomalies.length} unusual transactions** that are significantly higher than average (₹${Math.round(avgAmount).toLocaleString()}).`,
      generated_ui: [
        {
          component: 'list',
          title: 'Unusual Transactions',
          type: 'transactions',
          items: anomalies.map(t => ({
            title: t.description,
            subtitle: `${t.payer} on ${t.date}`,
            value: t.amount,
            valueColor: 'text-amber-400',
            icon: 'alert',
            iconBg: 'bg-amber-500/10',
            iconColor: 'text-amber-400',
            badge: `${Math.round((t.amount / avgAmount) * 100)}% of avg`,
            action: { query: `Tell me about ${t.description}` }
          }))
        },
        {
          component: 'insight',
          type: 'warning',
          insight: `These ${anomalies.length} transactions total ₹${anomalies.reduce((s, t) => s + t.amount, 0).toLocaleString()}`,
          explanation: `That's ${Math.round((anomalies.reduce((s, t) => s + t.amount, 0) / total) * 100)}% of all spending`
        }
      ],
      suggestions: ['Show all transactions', 'Who made these payments?', 'Is this normal?'],
      confidence: { level: 'medium', reason: 'Based on statistical deviation from average' },
      _source: 'local_genui'
    };
  }

  // What should I do / recommendation queries
  if (lowerMessage.includes('what should') || lowerMessage.includes('recommend') || lowerMessage.includes('next') || lowerMessage.includes('advice')) {
    // Calculate balances for recommendations
    const balances = {};
    roommates.forEach(name => { balances[name] = 0; });
    txns.forEach(t => {
      balances[t.payer] += t.amount;
      Object.entries(t.split).forEach(([person, share]) => {
        balances[person] -= share;
      });
    });
    
    const needsSettlement = Object.values(balances).some(b => Math.abs(b) > 100);
    const unsettled = txns.filter(t => !t.settled).length;
    
    const steps = [];
    if (needsSettlement) {
      steps.push({ title: 'Settle outstanding balances', detail: 'Some roommates owe money', action: { query: 'Who owes money?', label: 'Check' } });
    }
    if (unsettled > 0) {
      steps.push({ title: `Review ${unsettled} unsettled transactions`, detail: 'Mark them as settled once paid', action: { query: 'Show unsettled transactions', label: 'Review' } });
    }
    steps.push({ title: 'Check for unusual spending', action: { query: 'Show unusual spending', label: 'Analyze' } });
    steps.push({ title: 'Review category breakdown', detail: 'Understand where money is going', action: { query: 'Show category breakdown', label: 'View' } });
    
    return {
      message: needsSettlement 
        ? `You have some outstanding balances to settle. Here's what I recommend:`
        : `Your finances look good! Here are some suggested actions:`,
      generated_ui: [
        {
          component: 'flow',
          title: 'Recommended Actions',
          allowSkip: true,
          steps
        },
        {
          component: 'insight',
          type: needsSettlement ? 'warning' : 'success',
          insight: needsSettlement ? 'Priority: Settle balances first' : 'Great job staying on top of expenses!',
          explanation: `${unsettled} transactions pending, ₹${total.toLocaleString()} total tracked`
        }
      ],
      suggestions: ['Who owes money?', 'Show spending summary', 'Simulate budget changes'],
      confidence: { level: 'high', reason: 'Based on current financial state' },
      _source: 'local_genui'
    };
  }

  // Default: Summary view
  return {
    message: `Here's an overview of your shared expenses: ₹${total.toLocaleString()} total across ${txns.length} transactions.`,
    generated_ui: [
      {
        component: 'grid',
        columns: 3,
        items: [
          { component: 'metric', label: 'Total Spent', value: total, icon: 'rupee' },
          { component: 'metric', label: 'Transactions', value: txns.length, icon: 'calendar' },
          { component: 'metric', label: 'Roommates', value: roommates.length, icon: 'users' }
        ]
      },
      {
        component: 'chart',
        type: 'bar',
        title: 'Spending by Person',
        data: spendingData,
        drillDownEnabled: true
      }
    ],
    suggestions: ['Who spent the most?', 'Who owes money?', 'Show category breakdown'],
    confidence: { level: 'high', reason: 'Overview of all data' },
    _source: 'local_genui'
  };
};

/**
 * Main export: Generate UI with Thesys, fallback to Gemini/Local
 */
export const generateDynamicUI = async (userMessage, transactions, context = '') => {
  // 1. Try Thesys API First (REQUIRED by Problem Statement)
  if (process.env.THESYS_API_KEY) {
    try {
      console.log('🎨 Generating UI via Thesys GenUI API (Primary)...');
      return await generateThesysUI(userMessage, transactions, context);
    } catch (error) {
      console.warn('Thesys GenUI failed, trying fallback...', error.message);
    }
  } else {
    console.warn('⚠️ THESYS_API_KEY missing! Skipping primary GenUI provider.');
  }

  // 2. Fallback to Google Gemini (Reliable backup)
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('🤖 Using Google Gemini as GenUI fallback...');
      return await generateGeminiUI(userMessage, transactions, context);
    } catch (error) {
      console.warn('Gemini GenUI failed:', error.message);
    }
  }
  
  // 3. Fallback to local generation
  console.log('⚠️ Using Local UI Generation fallback');
  return generateLocalUI(userMessage, transactions);
};

export default {
  generateThesysUI,
  generateLocalUI,
  generateDynamicUI
};
