// Thesys GenUI Service - True Runtime UI Generation
// This service calls Thesys API to generate dynamic UI specifications at runtime

import axios from 'axios';
import { generatePromptWithData } from '../config/systemPrompt.js';

// Thesys API endpoint
const THESYS_API_URL = process.env.THESYS_API_URL || 'https://api.thesys.dev/v1/chat/completions';

// GenUI System Prompt - Instructs Thesys to generate UI component specifications
const GENUI_SYSTEM_PROMPT = `You are a GENERATIVE UI engine for FairShare, a roommate expense sharing app.

Your job is to GENERATE dynamic UI specifications that will be rendered in real-time. You don't select from pre-built components - you CREATE the exact UI structure needed for each unique query.

OUTPUT FORMAT - You must return a JSON object with this structure:
{
  "message": "Your conversational response",
  "generated_ui": [/* Array of UI component specifications */],
  "suggestions": ["Follow-up 1", "Follow-up 2"],
  "reasoning": { /* Optional chain of thought */ },
  "confidence": { "level": "high|medium|low", "reason": "..." }
}

AVAILABLE COMPONENT TYPES for generated_ui:

1. METRIC CARD - For key numbers:
{
  "component": "metric",
  "label": "Total Spent",
  "value": 45000,
  "change": 12,
  "changeType": "positive|negative|neutral",
  "icon": "rupee|wallet|trending-up|trending-down",
  "subtext": "This month",
  "comparison": "15% higher than last month",
  "action": { "query": "Show details", "label": "View breakdown" }
}

2. DYNAMIC CHART - Generate exact data for visualization:
{
  "component": "chart",
  "type": "bar|pie|line|area",
  "title": "Spending by Person",
  "subtitle": "January 2026",
  "data": [
    { "name": "Rahul", "value": 25000, "percentage": 42 },
    { "name": "Priya", "value": 18000, "percentage": 30 }
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

3. DYNAMIC LIST - For settlements, transactions, insights:
{
  "component": "list",
  "title": "Settlements Needed",
  "type": "settlements|transactions|insights",
  "showIndex": true,
  "items": [
    {
      "title": "Priya → Rahul",
      "subtitle": "For shared expenses",
      "value": 3500,
      "valueColor": "text-red-400",
      "icon": "wallet",
      "iconBg": "bg-red-500/10",
      "iconColor": "text-red-400",
      "badge": "Pending",
      "badgeColor": "bg-amber-500/20 text-amber-400",
      "action": { "query": "Settle Priya to Rahul" }
    }
  ],
  "emptyMessage": "All settled up! 🎉"
}

4. INSIGHT CARD - For AI-generated discoveries:
{
  "component": "insight",
  "type": "info|success|warning|idea|highlight",
  "insight": "Your food spending increased 34% this week",
  "explanation": "You ordered from Swiggy 8 times compared to 3 times last week",
  "confidence": "high",
  "action": { "query": "Show food transactions", "label": "View details" }
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
  "title": "Settle Up Guide",
  "allowSkip": false,
  "steps": [
    { "title": "Review balances", "detail": "Check who owes what", "action": { "query": "Show balances" } },
    { "title": "Confirm settlement", "action": { "query": "Confirm settlement" } },
    { "title": "Mark as paid", "action": { "query": "Mark settled" } }
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

GENERATION RULES:
1. ALWAYS use actual data from the context - never use placeholder values
2. Calculate real numbers, percentages, and comparisons
3. Generate insights by analyzing patterns in the data
4. Choose the BEST visualization for the user's question
5. Make UI interactive with drill-down actions where appropriate
6. Include helpful follow-up suggestions based on the analysis
7. Add reasoning when confidence isn't high

EXAMPLE for "Who spent the most?":
{
  "message": "Looking at your expenses, **Rahul** has spent the most at ₹25,000, followed by Priya at ₹18,000.",
  "generated_ui": [
    {
      "component": "chart",
      "type": "bar",
      "title": "Spending by Roommate",
      "data": [
        { "name": "Rahul", "value": 25000 },
        { "name": "Priya", "value": 18000 },
        { "name": "Amit", "value": 15000 }
      ],
      "drillDownEnabled": true
    },
    {
      "component": "insight",
      "type": "highlight",
      "insight": "Rahul paid for 43% of all shared expenses",
      "explanation": "Mainly due to the ₹15,000 rent payment on Jan 2nd"
    }
  ],
  "suggestions": ["Show Rahul's transactions", "Who owes Rahul?", "Break down by category"]
}`;

/**
 * Generate dynamic UI using Thesys API
 */
export const generateThesysUI = async (userMessage, transactions, conversationContext = '') => {
  if (!process.env.THESYS_API_KEY) {
    throw new Error('THESYS_API_KEY is required');
  }

  const dataContext = generatePromptWithData(transactions);

  const systemPrompt = `${GENUI_SYSTEM_PROMPT}

CURRENT DATA CONTEXT:
${dataContext}

CONVERSATION HISTORY:
${conversationContext || 'New conversation'}

NOW GENERATE A DYNAMIC UI RESPONSE FOR THE USER'S QUERY.
Remember: Generate ACTUAL values from the data, not placeholders!`;

  try {
    console.log('🎨 Generating UI via Thesys GenUI API...');
    
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
 * Fallback: Generate UI locally when Thesys is unavailable
 * This mimics what Thesys would generate, proving the concept
 */
export const generateLocalUI = (userMessage, transactions) => {
  const { transactions: txns, roommates } = transactions;
  const lowerMessage = userMessage.toLowerCase();
  
  // Calculate common metrics
  const spending = {};
  const categoryTotals = {};
  let total = 0;
  
  txns.forEach(t => {
    spending[t.payer] = (spending[t.payer] || 0) + t.amount;
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    total += t.amount;
  });

  const spendingData = Object.entries(spending)
    .map(([name, amount]) => ({
      name,
      value: amount,
      percentage: Math.round((amount / total) * 100)
    }))
    .sort((a, b) => b.value - a.value);

  const categoryData = Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      name,
      value: amount,
      percentage: Math.round((amount / total) * 100)
    }))
    .sort((a, b) => b.value - a.value);

  // Generate UI based on query type
  if (lowerMessage.includes('who spent') || lowerMessage.includes('spending')) {
    const topSpender = spendingData[0];
    return {
      message: `**${topSpender.name}** has spent the most at ₹${topSpender.value.toLocaleString()} (${topSpender.percentage}% of total).`,
      generated_ui: [
        {
          component: 'chart',
          type: 'bar',
          title: 'Spending by Roommate',
          subtitle: 'Click any bar to see their transactions',
          data: spendingData,
          config: { xKey: 'name', yKey: 'value' },
          drillDownEnabled: true
        },
        {
          component: 'insight',
          type: 'highlight',
          insight: `${topSpender.name} is covering ${topSpender.percentage}% of shared expenses`,
          explanation: `Total shared spending: ₹${total.toLocaleString()}`,
          action: { query: `Show ${topSpender.name}'s transactions`, label: 'View details' }
        }
      ],
      suggestions: [`Show ${topSpender.name}'s transactions`, 'Who owes money?', 'Break down by category'],
      confidence: { level: 'high', reason: 'Calculated from transaction data' },
      _source: 'local_genui'
    };
  }

  if (lowerMessage.includes('category') || lowerMessage.includes('breakdown')) {
    const topCategory = categoryData[0];
    return {
      message: `Your biggest expense category is **${topCategory.name}** at ₹${topCategory.value.toLocaleString()} (${topCategory.percentage}%).`,
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
      suggestions: [`Show ${topCategory.name} transactions`, 'Compare to last month', 'Who pays for ${topCategory.name}?'],
      confidence: { level: 'high', reason: 'Calculated from transaction data' },
      _source: 'local_genui'
    };
  }

  if (lowerMessage.includes('owe') || lowerMessage.includes('settle')) {
    // Calculate balances
    const balances = {};
    roommates.forEach(name => { balances[name] = 0; });
    
    txns.forEach(t => {
      balances[t.payer] += t.amount;
      Object.entries(t.split).forEach(([person, share]) => {
        balances[person] -= share;
      });
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
        ? `There are **${settlements.length} settlements** needed totaling ₹${totalOwed.toLocaleString()}.`
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
 * Main export: Generate UI with Thesys, fallback to local generation
 */
export const generateDynamicUI = async (userMessage, transactions, context = '') => {
  // Try Thesys first
  if (process.env.THESYS_API_KEY) {
    try {
      return await generateThesysUI(userMessage, transactions, context);
    } catch (error) {
      console.warn('Thesys failed, using local UI generation:', error.message);
    }
  }
  
  // Fallback to local generation (same output format)
  return generateLocalUI(userMessage, transactions);
};

export default {
  generateThesysUI,
  generateLocalUI,
  generateDynamicUI
};
