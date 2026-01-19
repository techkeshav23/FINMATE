import express from 'express';
import db from '../services/db.js';
import llmService from '../services/llm.js';

const router = express.Router();

// GET /api/chat/sessions - Get all chat sessions for sidebar
router.get('/sessions', (req, res) => {
  const sessions = db.getSessions();
  // Return simplified session list for sidebar
  const sessionList = sessions.map(s => ({
    id: s.id,
    title: s.title,
    messageCount: s.messages?.length || 0,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  }));
  res.json(sessionList);
});

// GET /api/chat/sessions/:id - Get a specific session with all messages
router.get('/sessions/:id', (req, res) => {
  const session = db.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// POST /api/chat/sessions - Create a new session
router.post('/sessions', (req, res) => {
  const { title } = req.body;
  const session = db.createSession(title || 'New Chat');
  res.json(session);
});

// DELETE /api/chat/sessions/:id - Delete a session
router.delete('/sessions/:id', (req, res) => {
  db.deleteSession(req.params.id);
  res.json({ message: 'Session deleted' });
});

// GET /api/chat/history (Legacy - returns current session messages)
router.get('/history', (req, res) => {
  const history = db.getHistory();
  res.json(history);
});

// POST /api/chat - Send message (with session support)
router.post('/', async (req, res) => {
  const { message, context, sessionId } = req.body;
  const lowerMsg = message.toLowerCase();
  
  // Get or create session
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    const sessions = db.getSessions();
    if (sessions.length === 0) {
      const newSession = db.createSession('New Chat');
      currentSessionId = newSession.id;
    } else {
      currentSessionId = sessions[0].id;
    }
  }
  
  // 1. Save User Message to session
  db.addMessageToSession(currentSessionId, { role: 'user', content: message });

  // Fix #2: Detect simulation/what-if queries and handle locally for faster response
  const isSimulationQuery = lowerMsg.includes('what if') || 
                            lowerMsg.includes('simulate') || 
                            lowerMsg.includes('if sales drop') ||
                            lowerMsg.includes('if i reduce') ||
                            lowerMsg.includes('scenario');
  
  let aiResponse;
  
  if (isSimulationQuery) {
    // Handle simulation queries directly
    const stats = db.getStats();
    const baseline = stats.total_income || 5000;
    
    // Parse percentage from query
    let percent = 10; // default
    const percentMatch = message.match(/(\d+)%/);
    if (percentMatch) percent = parseInt(percentMatch[1]);
    
    const isDecrease = lowerMsg.includes('drop') || lowerMsg.includes('reduce') || lowerMsg.includes('down') || lowerMsg.includes('less');
    const multiplier = isDecrease ? (1 - percent/100) : (1 + percent/100);
    const simulated = Math.round(baseline * multiplier);
    const impact = simulated - baseline;
    
    aiResponse = {
      reasoning: ["Detected simulation query", `Applied ${percent}% ${isDecrease ? 'decrease' : 'increase'}`, "Generated comparison"],
      response: `Here's what happens if your sales ${isDecrease ? 'drop' : 'increase'} by ${percent}%:`,
      components: [
        {
          type: "grid",
          children: [
            {
              type: "metric_card",
              props: { label: "Current Sales", value: `₹${baseline.toLocaleString()}`, trend: "neutral", icon: "rupee" }
            },
            {
              type: "metric_card", 
              props: { label: "Simulated", value: `₹${simulated.toLocaleString()}`, trend: isDecrease ? "down" : "up", icon: "trending-" + (isDecrease ? "down" : "up") }
            }
          ]
        },
        {
          type: "bar_chart",
          data: {
            title: `Impact: ${isDecrease ? '-' : '+'}₹${Math.abs(impact).toLocaleString()}`,
            data: [
              { name: "Current", amount: baseline },
              { name: "Simulated", amount: simulated }
            ]
          }
        },
        {
          type: "simulation",
          props: {
            label: "Adjust Sales Change",
            min: -50,
            max: 50,
            defaultValue: isDecrease ? -percent : percent,
            unit: "%"
          }
        }
      ],
      confidence: "high",
      suggestions: ["What if expenses increase 15%?", "Show current profit margin", "Compare with last month"]
    };
  } else {
    // 2. Get AI Response for non-simulation queries
    aiResponse = await llmService.processQuery(message, { history: [] });
  }
  
  // 3. Save AI Response
  const aiMsg = {
    role: 'assistant',
    content: aiResponse.response,
    components: aiResponse.components,
    confidence: aiResponse.confidence,
    reasoning: aiResponse.reasoning,
    suggestions: aiResponse.suggestions,
    timestamp: new Date().toISOString()
  };
  
  // Save to session
  db.addMessageToSession(currentSessionId, aiMsg);

  res.json({ ...aiMsg, sessionId: currentSessionId });
});

// POST /api/chat/new - Create new chat session
router.post('/new', (req, res) => {
  const session = db.createSession('New Chat');
  res.json({ message: 'New chat created', session });
});

// DELETE /api/chat/history - Clear all sessions
router.delete('/history', (req, res) => {
  db.clearAllSessions();
  res.json({ message: 'All chat history cleared' });
});

// GET /api/chat/insights (Proactive)
router.get('/insights', async (req, res) => {
  const stats = db.getStats();
  const anomalies = db.getAnomalies();
  const txnCount = db.getCollection('transactions').length;
  
  // Check if we have data
  if (txnCount === 0) {
    return res.json({
      hasData: false,
      message: "Welcome to FinMate! Upload your transaction data to get started.",
      suggestions: ["Upload CSV", "Add transaction manually"]
    });
  }
  
  const profit = (stats.total_income || 0) - (stats.total_expense || 0);
  
  // Generate contextual insight
  let insight = {
    hasData: true,
    message: "",
    ui_component: "metric_card",
    ui_data: {},
    suggestions: []
  };
  
  if (anomalies.length > 0) {
    // Prioritize anomaly alerts
    insight.message = `⚠️ I noticed unusual spending: ${anomalies[0].reason}`;
    insight.ui_component = "anomaly";
    insight.ui_data = {
      title: `Unusual ${anomalies[0].category || 'Expense'}`,
      amount: `₹${anomalies[0].amount}`,
      description: anomalies[0].reason,
      severity: "high"
    };
    insight.suggestions = ["Show details", "Ignore this", "Check all anomalies"];
  } else if (profit > 0) {
    insight.message = `Good news! You're in profit with ₹${profit.toLocaleString()} net gain.`;
    insight.ui_data = { label: "Net Profit", value: `₹${profit.toLocaleString()}`, trend: "up", icon: "rupee" };
    insight.suggestions = ["Show breakdown", "Weekly trend", "Compare with last week"];
  } else {
    insight.message = `Heads up: You're at a loss of ₹${Math.abs(profit).toLocaleString()}. Let's analyze.`;
    insight.ui_data = { label: "Net Loss", value: `₹${Math.abs(profit).toLocaleString()}`, trend: "down", icon: "alert" };
    insight.suggestions = ["Find highest expenses", "Show expense breakdown", "What changed?"];
  }
  
  res.json(insight);
});

// GET /api/chat/what-changed
router.get('/what-changed', (req, res) => {
  // Fix #4: Real week comparison logic
  const comparison = db.getWeekComparison();
  const anomalies = db.getAnomalies();
  
  const { thisWeek, lastWeek, changes } = comparison;
  
  let message = '';
  const components = [];
  
  // Generate insight message
  if (changes.expense.percent > 10) {
    message = `⚠️ Your expenses increased by ${changes.expense.percent}% compared to last week (₹${lastWeek.expense} → ₹${thisWeek.expense}).`;
  } else if (changes.expense.percent < -10) {
    message = `✅ Great! Your expenses decreased by ${Math.abs(changes.expense.percent)}% compared to last week.`;
  } else if (changes.income.percent > 10) {
    message = `📈 Sales are up ${changes.income.percent}% compared to last week!`;
  } else {
    message = `Your spending is stable this week. Income: ₹${thisWeek.income}, Expenses: ₹${thisWeek.expense}.`;
  }
  
  // Add comparison chart
  components.push({
    type: "bar_chart",
    data: {
      title: "This Week vs Last Week",
      data: [
        { name: "Last Week Income", amount: lastWeek.income },
        { name: "This Week Income", amount: thisWeek.income },
        { name: "Last Week Expense", amount: lastWeek.expense },
        { name: "This Week Expense", amount: thisWeek.expense }
      ]
    }
  });
  
  // Add anomaly alerts if any
  if (anomalies.length > 0) {
    const topAnomaly = anomalies[0];
    components.push({
      type: "anomaly",
      props: {
        title: `Unusual ${topAnomaly.category || 'Expense'}`,
        amount: `₹${topAnomaly.amount}`,
        description: topAnomaly.reason,
        severity: "high"
      }
    });
  }
  
  res.json({ message, components, suggestions: ["Show expense breakdown", "Analyze by category"] });
});

// GET /api/chat/anomalies - Get detected anomalies
router.get('/anomalies', (req, res) => {
  const anomalies = db.getAnomalies();
  res.json({
    count: anomalies.length,
    anomalies: anomalies.map(a => ({
      ...a,
      component: {
        type: "anomaly",
        props: {
          title: `Unusual ${a.category || 'Expense'}`,
          amount: `₹${a.amount}`,
          description: a.reason,
          severity: "high"
        }
      }
    }))
  });
});

// POST /api/chat/decide - Decision guidance
router.post('/decide', (req, res) => {
  const { item, amount, category } = req.body;
  const stats = db.getStats();
  const budget = stats.total_income - stats.total_expense;
  
  const canAfford = budget >= (amount || 0);
  const percentOfBudget = budget > 0 ? Math.round((amount / budget) * 100) : 100;
  
  res.json({
    recommendation: canAfford ? 'proceed' : 'reconsider',
    message: canAfford 
      ? `You can afford this. It's ${percentOfBudget}% of your remaining budget.`
      : `This purchase would exceed your current budget by ₹${Math.abs(budget - amount)}.`,
    components: [
      {
        type: "metric_card",
        props: {
          label: "Available Budget",
          value: `₹${budget.toLocaleString()}`,
          trend: canAfford ? "up" : "down",
          icon: "rupee"
        }
      },
      {
        type: "decision",
        props: {
          question: `Should I spend ₹${amount} on ${item || 'this'}?`,
          options: [
            { label: "Yes, proceed", action: "proceed", variant: canAfford ? "primary" : "danger" },
            { label: "No, skip", action: "skip", variant: "secondary" }
          ],
          recommendation: canAfford ? "proceed" : "skip"
        }
      }
    ]
  });
});

// POST /api/chat/simulate
router.post('/simulate', (req, res) => {
    const { adjustments } = req.body; // e.g., { "Sales": -10, "Milk Cost": 5 }
    
    // 1. Get current baseline from DB
    const currentStats = db.getStats();
    
    const baselineSales = currentStats.total_income || 5000;
    
    // 2. Calculate Simulation
    // Supports parsing "10%" reduction or simple value changes if needed
    let simulatedSales = baselineSales;
    let description = "Current Projection";
    
    // Simple logic for hackathon demo:
    // If input string contains "-10%", reduce by 10%
    if (JSON.stringify(adjustments).includes('-10')) {
        simulatedSales = baselineSales * 0.9;
        description = "Values if Sales drop 10%";
    } else if (JSON.stringify(adjustments).includes('5')) {
         simulatedSales = baselineSales * 1.05;
         description = "Values if Growth is 5%";
    }

    res.json({
        message: `Logic: Applying simulation scenarios to your current data set.`,
        reasoning: ["Fetched current Sales", "Applied percentage adjustment", "Generated comparison view"],
        components: [
            {
                type: "grid",
                children: [
                    {
                        type: "bar_chart",
                        data: {
                            title: description,
                            data: [
                                { name: "Current", amount: baselineSales },
                                { name: "Simulated", amount: simulatedSales } 
                            ]
                        }
                    },
                    {
                        type: "metric_card",
                        props: { 
                            label: "Impact on Revenue", 
                            value: `₹${Math.round(simulatedSales - baselineSales)}`, 
                            trend: simulatedSales > baselineSales ? "up" : "down",
                            icon: "trending-up"
                        }
                    }
                ]
            }
        ]
    });
});

// POST /api/chat/save-goal - Save a financial goal
router.post('/save-goal', (req, res) => {
  const { name, targetAmount, deadline, category } = req.body;
  
  // Store goal (in a real app, this would persist)
  const goal = {
    id: `goal_${Date.now()}`,
    name: name || 'Savings Goal',
    targetAmount: targetAmount || 10000,
    currentAmount: 0,
    deadline: deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    category: category || 'savings',
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    goal,
    message: `Goal "${goal.name}" created! Target: ₹${goal.targetAmount}`,
    suggestions: ["Track progress", "Set reminders"]
  });
});

export default router;
