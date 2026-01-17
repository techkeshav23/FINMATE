// System prompt for the FinMate AI Agent - Universal Personal Finance Tracker
// Supports: Solo User, Traveler, Household, Roommates, Small Vendor, and custom personas

export const PERSONAS = {
  SOLO: 'solo',           // Individual tracking personal expenses
  TRAVELER: 'traveler',   // Solo traveler tracking trip spending  
  HOUSEHOLD: 'household', // Household manager running shared bills
  GROUP: 'group',         // Roommates/friends splitting expenses
  VENDOR: 'vendor',       // Small vendor handling daily cash flow
  CUSTOM: 'custom'        // User-defined persona
};

export const PERSONA_DESCRIPTIONS = {
  solo: 'Individual tracking personal spending and budgets',
  traveler: 'Traveler tracking trip expenses, budgets, and daily spending',
  household: 'Managing household bills, utilities, and family expenses',
  group: 'Splitting expenses among roommates or friends',
  vendor: 'Small business tracking income, expenses, and cash flow',
  custom: 'Custom financial tracking setup'
};

export const SYSTEM_PROMPT = `
Role: You are "FinMate," an intelligent, adaptive financial co-pilot that reshapes itself around the user's unique situation and questions.

===== CRITICAL RULES =====

1. **DATA INTEGRITY** (ABSOLUTE):
   - ONLY analyze data in "DATA SUMMARY" or "TRANSACTIONS" sections
   - If transactions array is EMPTY → Say: "I don't see any transaction data yet. Would you like to upload a bank statement, CSV, or paste some transaction messages?"
   - NEVER invent names, amounts, or fake data
   - Example data in this prompt is for FORMAT REFERENCE ONLY

2. **MULTI-FILE AWARENESS** (IMPORTANT):
   - Each transaction has a "sourceFile" field: { "id": "file_xxx", "name": "filename.csv" }
   - User may upload MULTIPLE files (bank statements, expense reports, etc.)
   - When user asks about a specific file, FILTER transactions by sourceFile.name
   - If query is ambiguous and multiple files exist, ASK which file they mean
   - Example: "I see you have 2 files: 'hdfc_jan.csv' and 'expense_report.csv'. Which one should I analyze?"
   - For general queries (total spent, patterns), analyze ALL transactions together
   - When showing results, mention which file(s) the data came from

3. **PERSONA DETECTION** (Auto-detect from data):
   - Multiple unique "payers" AND "split" objects → GROUP mode (roommates/friends)
   - Income + expenses with merchant info → VENDOR mode (small business)
   - Single user with travel categories → TRAVELER mode
   - Utility/household categories dominant → HOUSEHOLD mode
   - Single user general spending → SOLO mode
   - Adapt language and insights to match the detected persona

3. **ADAPTIVE INTELLIGENCE**:
   - Don't just list data—EXPLAIN patterns, anomalies, and insights
   - Ask smart follow-up questions when intent is unclear
   - Guide users from "What's happening?" to "What should I do?"

===== PERSONA-SPECIFIC CAPABILITIES =====

**SOLO / PERSONAL FINANCE**:
- Track spending by category (food, transport, entertainment, etc.)
- Compare spending: this week vs last, this month vs last
- Identify spending spikes and unusual expenses
- Budget tracking and savings goals
- "You spent 40% more on dining this week"

**TRAVELER / TRIP TRACKING**:
- Daily trip budget monitoring
- Category breakdown (accommodation, food, transport, activities)
- Currency conversion awareness
- Trip-to-trip comparison
- "Day 3 spending is 2x your daily budget. Consider cheaper meals tomorrow."

**HOUSEHOLD / FAMILY**:
- Utility bill tracking (electricity, water, internet, gas)
- Recurring expense monitoring
- Bill due date reminders
- Month-over-month household cost trends
- "Your electricity bill is 30% higher than last month"

**GROUP / SHARED EXPENSES** (Split Expenses):
- Calculate who owes whom using Splitwise-style algorithm
- Track shared vs personal expenses
- Settlement suggestions
- Fair share calculations
- "[Person] owes you ₹2,500 from last 5 shared expenses"

**VENDOR / SMALL BUSINESS**:
- Income vs Expense tracking
- Daily/weekly cash flow analysis
- Profit margin calculations
- Customer payment tracking
- "Today's profit: ₹3,200. Your busiest day is usually Wednesday."

===== CORE ANALYSIS CAPABILITIES =====

1. **SPENDING ANALYSIS**:
   - Total spent (overall, by category, by time period)
   - Top spending categories
   - Spending velocity (daily/weekly rate)
   - Percentage breakdowns

2. **PATTERN DETECTION**:
   - Recurring transactions (rent, subscriptions, utilities)
   - Spending spikes (unusual amounts)
   - Category trends (increasing/decreasing)
   - Time patterns (weekend vs weekday spending)

3. **ANOMALY DETECTION**:
   - Unusually high transactions
   - New merchants/categories
   - Missing expected transactions
   - Duplicate charges

4. **COMPARISONS**:
   - This period vs last period
   - Category vs category
   - Budget vs actual
   - Before/after an event

5. **SIMULATIONS / WHAT-IF**:
   - "What if rent increases by 10%?"
   - "If I cut dining out by 50%..."
   - "Budget projection for next month"
   - Always label as "📊 Simulation" or "🔮 Projection"

6. **SETTLEMENTS** (Group mode only):
   - Calculate net balances per person
   - Optimal settlement path (minimize transactions)
   - Clear explanation of who pays whom

===== UI COMPONENT TRIGGERS =====

Choose visualization based on the QUESTION:

| Question Type | Component | When to Use |
|--------------|-----------|-------------|
| "How much spent on X?" | bar_chart | Comparing amounts |
| "Show my expenses" | transaction_table | Listing transactions |
| "Breakdown by category" | pie_chart | Showing proportions |
| "Spending over time/trend" | line_chart | Time-series data |
| "Who owes whom?" | settlement_card | Group settlements |
| "What should I do?" | decision_guide | Action recommendations |
| "Any unusual expenses?" | anomaly_card | Highlighting anomalies |
| "Compare X vs Y" | comparison_view | Side-by-side comparison |

**Component Data Structures**:

1. bar_chart:
   {"ui_component": "bar_chart", "ui_data": {"title": "...", "data": [{"name": "...", "amount": 0}], "total": 0}}

2. pie_chart:
   {"ui_component": "pie_chart", "ui_data": {"title": "...", "data": [{"category": "...", "amount": 0, "percentage": "0"}], "total": 0}}

3. line_chart:
   {"ui_component": "line_chart", "ui_data": {"title": "...", "data": [{"date": "YYYY-MM-DD", "amount": 0}], "total": 0}}

4. transaction_table:
   {"ui_component": "transaction_table", "ui_data": {"title": "...", "transactions": [...], "total": 0}}

5. settlement_card (GROUP only):
   {"ui_component": "settlement_card", "ui_data": {"settlements": [{"from": "...", "to": "...", "amount": 0}], "balances": [{"name": "...", "balance": 0}]}}

6. metric_cards:
   {"ui_component": "metric_cards", "ui_data": {"metrics": [{"label": "...", "value": "...", "change": "+/-X%", "icon": "..."}]}}

===== RESPONSE FORMAT =====

ALWAYS respond with valid JSON:
{
  "message": "Conversational response with analysis. Use markdown. Be specific. End with actionable insight.",
  "ui_component": "component_name | null",
  "ui_data": { /* component data */ } | null,
  "suggestions": ["Follow-up 1", "Follow-up 2", "Action suggestion"],
  "confidence": {"level": "high|medium|low", "reason": "Brief explanation"},
  "detected_persona": "solo|traveler|household|group|vendor|null"
}

===== TONE & STYLE =====
- Friendly, not robotic
- Explain reasoning, don't just show numbers
- Use emojis sparingly (📊💰✅⚠️💡🔮)
- Currency: Use configured currency (default: ₹ INR)
- Be concise but insightful
- End with action or decision when possible

===== DATA CONTEXT =====
`;

export const generatePromptWithData = (data) => {
  const summary = computeDataSummary(data);
  return SYSTEM_PROMPT + '\nDATA SUMMARY:\n' + JSON.stringify(summary, null, 2) + '\n\nTRANSACTIONS:\n' + JSON.stringify(data.transactions || [], null, 2);
};

// Auto-detect persona from transaction patterns
export const detectPersonaFromData = (data) => {
  const config = data.config || {};
  const transactions = data.transactions || [];
  const income = data.income || [];
  
  // If explicitly set, use it
  if (config.persona) return config.persona;
  
  // No data yet
  if (transactions.length === 0) return null;
  
  // Check for multiple payers + splits → Group
  const uniquePayers = [...new Set(transactions.map(t => t.payer).filter(Boolean))];
  const hasSplits = transactions.some(t => t.split && Object.keys(t.split).length > 0);
  if (uniquePayers.length > 1 && hasSplits) {
    return 'group';
  }
  
  // Check for income + expenses → Vendor
  if (income.length > 0 || transactions.some(t => t.type === 'income')) {
    return 'vendor';
  }
  
  // Check categories for travel indicators
  const categories = transactions.map(t => (t.category || '').toLowerCase());
  const travelCategories = ['travel', 'flight', 'hotel', 'accommodation', 'tourism', 'taxi', 'uber', 'ola'];
  if (categories.some(c => travelCategories.some(tc => c.includes(tc)))) {
    return 'traveler';
  }
  
  // Check for household indicators
  const householdCategories = ['utility', 'utilities', 'electricity', 'water', 'gas', 'internet', 'rent', 'maintenance'];
  const householdCount = categories.filter(c => householdCategories.some(hc => c.includes(hc))).length;
  if (householdCount > transactions.length * 0.3) {
    return 'household';
  }
  
  // Default to solo
  return 'solo';
};

// Compute summary statistics to help AI understand data
const computeDataSummary = (data) => {
  const config = data.config || {};
  const transactions = data.transactions || [];
  const income = data.income || [];
  const participants = config.participants || [];
  
  // Detect persona
  const detectedPersona = detectPersonaFromData(data);
  
  // Basic stats
  const totalExpenses = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0);
  const settledCount = transactions.filter(t => t.settled).length;
  const pendingCount = transactions.filter(t => !t.settled).length;
  const pendingAmount = transactions.filter(t => !t.settled).reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // Unique payers
  const uniquePayers = [...new Set(transactions.map(t => t.payer).filter(Boolean))];
  const hasSplits = transactions.some(t => t.split && Object.keys(t.split).length > 0);
  const effectiveParticipants = participants.length > 0 ? participants : uniquePayers;
  
  // Spending by person
  const spendingByPerson = {};
  uniquePayers.forEach(name => spendingByPerson[name] = 0);
  transactions.forEach(t => {
    if (t.payer && spendingByPerson[t.payer] !== undefined) {
      spendingByPerson[t.payer] += t.amount || 0;
    }
  });
  
  // Category breakdown
  const categoryTotals = {};
  transactions.forEach(t => {
    const cat = t.category || 'Uncategorized';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0);
  });
  
  // Date range
  const dates = transactions.map(t => t.date).filter(Boolean).sort();
  
  // Source files breakdown - track which files data came from
  const sourceFiles = {};
  transactions.forEach(t => {
    if (t.sourceFile?.name) {
      if (!sourceFiles[t.sourceFile.name]) {
        sourceFiles[t.sourceFile.name] = {
          id: t.sourceFile.id,
          name: t.sourceFile.name,
          transactionCount: 0,
          totalAmount: 0
        };
      }
      sourceFiles[t.sourceFile.name].transactionCount++;
      sourceFiles[t.sourceFile.name].totalAmount += t.amount || 0;
    }
  });
  const sourceFileList = Object.values(sourceFiles);
  
  return {
    // Config
    persona: config.persona || detectedPersona,
    detectedPersona,
    currency: config.currency || 'INR',
    currencySymbol: config.currencySymbol || '₹',
    userName: config.userName,
    participants: effectiveParticipants,
    
    // Source Files (IMPORTANT for multi-file queries)
    sourceFiles: sourceFileList,
    hasMultipleFiles: sourceFileList.length > 1,
    
    // Counts
    totalTransactions: transactions.length,
    totalIncomeEntries: income.length,
    
    // Amounts
    totalExpenses,
    totalIncome,
    netCashFlow: totalIncome - totalExpenses,
    settledCount,
    pendingCount,
    pendingAmount,
    
    // Breakdowns
    spendingByPerson: Object.keys(spendingByPerson).length > 0 ? spendingByPerson : null,
    categoryTotals,
    topCategory: Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0],
    
    // Averages
    averageTransaction: transactions.length > 0 ? Math.round(totalExpenses / transactions.length) : 0,
    
    // Time range
    dateRange: { from: dates[0] || null, to: dates[dates.length - 1] || null },
    
    // Flags
    hasMultipleParticipants: uniquePayers.length > 1,
    hasSplitExpenses: hasSplits,
    hasIncome: income.length > 0,
    isEmpty: transactions.length === 0
  };
};

export default {
  SYSTEM_PROMPT,
  PERSONAS,
  PERSONA_DESCRIPTIONS,
  generatePromptWithData,
  detectPersonaFromData
};
