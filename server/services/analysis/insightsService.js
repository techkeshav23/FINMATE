/**
 * Insights Engine Service - Proactive insights and intelligent suggestions
 * Handles welcome messages, daily insights, and proactive notifications
 */

import { detectAnomalies } from '../parsers/statementParser.js';

/**
 * Generate proactive insights - PERSONA-AWARE
 */
export const generateProactiveInsights = (data) => {
  const { transactions, config } = data;
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  const currency = config?.currency || '₹';
  
  const insights = [];
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // This month's transactions
  const thisMonthTxns = transactions.filter(t => new Date(t.date) >= thisMonth);
  const thisMonthTotal = thisMonthTxns.reduce((sum, t) => sum + t.amount, 0);
  
  // Pending settlements (for group personas)
  const pending = transactions.filter(t => !t.settled);
  const pendingTotal = pending.reduce((sum, t) => sum + t.amount, 0);
  
  // Generate persona-specific insights
  switch (persona) {
    case 'group':
      // Group-specific insights
      if (pending.length > 5) {
        insights.push({
          type: 'settlement',
          priority: 'high',
          title: 'Settlement Reminder',
          message: `You have ${pending.length} unsettled expenses (${currency}${pendingTotal.toLocaleString()}). Time to settle up?`,
          action: 'settle'
        });
      }
      
      // Check for imbalanced spending
      const payerTotals = {};
      pending.forEach(t => {
        if (t.payer) {
          payerTotals[t.payer] = (payerTotals[t.payer] || 0) + t.amount;
        }
      });
      
      const totalPending = Object.values(payerTotals).reduce((a, b) => a + b, 0);
      const avgPerPerson = totalPending / participants.length;
      
      Object.entries(payerTotals).forEach(([name, amount]) => {
        if (amount > avgPerPerson * 1.5) {
          insights.push({
            type: 'balance',
            priority: 'medium',
            title: 'Spending Imbalance',
            message: `${name} has covered ${currency}${amount.toLocaleString()} recently - ${((amount/totalPending)*100).toFixed(0)}% of group expenses.`,
            action: 'balance'
          });
        }
      });
      break;
      
    case 'solo':
      // Personal finance insights
      const categoryTotals = {};
      thisMonthTxns.forEach(t => {
        const cat = t.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
      });
      
      const topCategory = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (topCategory && topCategory[1] > thisMonthTotal * 0.4) {
        insights.push({
          type: 'spending',
          priority: 'medium',
          title: 'Category Alert',
          message: `${topCategory[0]} accounts for ${((topCategory[1]/thisMonthTotal)*100).toFixed(0)}% of your spending this month.`,
          action: 'analyze'
        });
      }
      break;
      
    case 'vendor':
      // Business insights
      const recentSales = thisMonthTxns.filter(t => t.type === 'income');
      const recentExpenses = thisMonthTxns.filter(t => t.type !== 'income');
      
      insights.push({
        type: 'business',
        priority: 'info',
        title: 'Monthly Overview',
        message: `This month: ${recentSales.length} sales, ${recentExpenses.length} expenses.`,
        action: 'report'
      });
      break;
      
    case 'traveler':
      // Travel-specific insights - ENHANCED
      const trips = [...new Set(transactions.map(t => t.trip).filter(Boolean))];
      if (trips.length > 0) {
        const tripTotals = {};
        const tripDays = {};
        
        transactions.forEach(t => {
          if (t.trip) {
            tripTotals[t.trip] = (tripTotals[t.trip] || 0) + t.amount;
            if (!tripDays[t.trip]) tripDays[t.trip] = new Set();
            tripDays[t.trip].add(t.date?.split('T')[0]);
          }
        });
        
        const expensiveTrip = Object.entries(tripTotals)
          .sort((a, b) => b[1] - a[1])[0];
        
        if (expensiveTrip) {
          const days = tripDays[expensiveTrip[0]]?.size || 1;
          const dailyAvg = expensiveTrip[1] / days;
          
          insights.push({
            type: 'travel',
            priority: 'info',
            title: 'Trip Summary',
            message: `Your most expensive trip "${expensiveTrip[0]}" cost ${currency}${expensiveTrip[1].toLocaleString()} over ${days} days (${currency}${Math.round(dailyAvg).toLocaleString()}/day).`,
            action: 'compare'
          });
        }
        
        // Daily budget tracking for active trip
        const today = new Date().toISOString().split('T')[0];
        const recentTripTxns = transactions.filter(t => 
          t.trip && new Date(t.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        
        if (recentTripTxns.length > 0) {
          const tripName = recentTripTxns[0].trip;
          const tripTotal = recentTripTxns.reduce((sum, t) => sum + t.amount, 0);
          const tripDayCount = new Set(recentTripTxns.map(t => t.date?.split('T')[0])).size || 1;
          const dailyAvg = tripTotal / tripDayCount;
          
          // Check against typical daily budget (default ₹2000)
          const typicalDaily = 2000;
          if (dailyAvg > typicalDaily * 1.5) {
            insights.push({
              type: 'travel_budget',
              priority: 'medium',
              title: 'Daily Budget Alert',
              message: `"${tripName}" is averaging ${currency}${Math.round(dailyAvg).toLocaleString()}/day - ${((dailyAvg / typicalDaily - 1) * 100).toFixed(0)}% above typical.`,
              action: 'adjust_budget'
            });
          }
        }
      }
      break;
      
    case 'household':
      // Household-specific insights
      if (pending.length > 0) {
        insights.push({
          type: 'household',
          priority: 'medium',
          title: 'Household Expenses',
          message: `${pending.length} household bills need attention (${currency}${pendingTotal.toLocaleString()}).`,
          action: 'review'
        });
      }
      break;
  }
  
  // Universal insights
  
  // Anomaly check
  const anomalies = detectAnomalies(transactions, config);
  if (anomalies.length > 0) {
    insights.push({
      type: 'anomaly',
      priority: 'high',
      title: 'Unusual Activity',
      message: `${anomalies.length} unusual ${anomalies.length === 1 ? 'expense' : 'expenses'} detected.`,
      action: 'review_anomalies'
    });
  }
  
  // Monthly spending trend
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthTxns = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= lastMonth && d <= lastMonthEnd;
  });
  const lastMonthTotal = lastMonthTxns.reduce((sum, t) => sum + t.amount, 0);
  
  if (lastMonthTotal > 0) {
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedTotal = (thisMonthTotal / dayOfMonth) * daysInMonth;
    
    if (projectedTotal > lastMonthTotal * 1.2) {
      insights.push({
        type: 'trend',
        priority: 'medium',
        title: 'Spending Pace',
        message: `At this rate, you'll spend ${((projectedTotal/lastMonthTotal - 1)*100).toFixed(0)}% more than last month.`,
        action: 'slow_down'
      });
    }
  }
  
  return {
    insights,
    summary: {
      thisMonth: thisMonthTotal,
      pending: pendingTotal,
      anomalyCount: anomalies.length,
      transactionCount: transactions.length
    }
  };
};

/**
 * Generate welcome message - PERSONA-AWARE
 */
export const generateWelcomeMessage = (data) => {
  const { config } = data;
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  const currency = config?.currency || '₹';
  
  const { insights, summary } = generateProactiveInsights(data);
  
  let greeting = '';
  const hour = new Date().getHours();
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else greeting = 'Good evening';
  
  let message = '';
  
  switch (persona) {
    case 'group':
      message = `${greeting}! 👋\n\nWelcome to your **group expense tracker** for ${participants.join(', ')}.\n\n`;
      if (summary.pending > 0) {
        message += `📊 **Quick Status**: ${currency}${summary.thisMonth.toLocaleString()} spent this month, ${currency}${summary.pending.toLocaleString()} pending settlement.\n\n`;
      }
      message += `How can I help you today?`;
      break;
      
    case 'solo':
      message = `${greeting}! 👋\n\nWelcome to **FinMate** - your personal finance assistant.\n\n`;
      message += `📊 **This Month**: ${currency}${summary.thisMonth.toLocaleString()} spent across ${summary.transactionCount} transactions.\n\n`;
      message += `What would you like to know about your finances?`;
      break;
      
    case 'vendor':
      message = `${greeting}! 👋\n\nWelcome to your **business finance tracker**.\n\n`;
      message += `📊 **Status**: Tracking ${summary.transactionCount} transactions.\n\n`;
      message += `How can I help with your business finances?`;
      break;
      
    case 'traveler':
      message = `${greeting}! 👋\n\nWelcome to your **travel expense tracker**.\n\n`;
      message += `📊 **Total Tracked**: ${currency}${summary.thisMonth.toLocaleString()} in travel expenses.\n\n`;
      message += `Ready to track your next adventure?`;
      break;
      
    case 'household':
      message = `${greeting}! 👋\n\nWelcome to your **household expense tracker** for ${participants.join(' & ')}.\n\n`;
      message += `📊 **This Month**: ${currency}${summary.thisMonth.toLocaleString()} in household expenses.\n\n`;
      message += `How can I help manage your household finances?`;
      break;
      
    case 'custom':
      message = `${greeting}! 👋\n\nWelcome to **FinMate**.\n\n`;
      message += `📊 **Status**: ${summary.transactionCount} transactions tracked.\n\n`;
      message += `How can I assist you today?`;
      break;
      
    default:
      message = `${greeting}! 👋\n\nWelcome to **FinMate** - your smart finance assistant.\n\n`;
      message += `I can help you track expenses, analyze spending, and manage your finances.\n\n`;
      message += `What would you like to do?`;
  }
  
  // Add high-priority insights
  const highPriorityInsights = insights.filter(i => i.priority === 'high');
  if (highPriorityInsights.length > 0) {
    message += `\n\n⚡ **Needs Attention:**\n`;
    highPriorityInsights.forEach(i => {
      message += `• ${i.message}\n`;
    });
  }
  
  // Generate smart suggestions based on persona
  let suggestions = [];
  switch (persona) {
    case 'group':
      suggestions = ["Who owes what?", "Show spending breakdown", "Add new expense", "Settle up"];
      break;
    case 'solo':
      suggestions = ["Show my spending", "Category breakdown", "Set a budget", "Find savings"];
      break;
    case 'vendor':
      suggestions = ["Show profit/loss", "Top expenses", "Revenue trend", "Tax summary"];
      break;
    case 'traveler':
      suggestions = ["Compare trips", "Add trip expense", "Budget next trip", "Category breakdown"];
      break;
    case 'household':
      suggestions = ["Show bills", "Who paid what?", "Monthly summary", "Set budget"];
      break;
    default:
      suggestions = ["Show spending", "Add expense", "Analyze trends", "Get insights"];
  }
  
  return {
    message,
    ui_component: "welcome",
    ui_data: {
      greeting,
      persona,
      summary,
      insights: insights.slice(0, 3),
      currency
    },
    suggestions
  };
};

/**
 * Generate daily digest
 */
export const generateDailyDigest = (data) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  const persona = config?.persona || 'solo';
  
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const recentTxns = transactions.filter(t => new Date(t.date) >= weekAgo);
  const recentTotal = recentTxns.reduce((sum, t) => sum + t.amount, 0);
  
  const { insights } = generateProactiveInsights(data);
  
  let message = `📅 **Daily Digest**\n\n`;
  message += `**Last 7 days**: ${recentTxns.length} transactions totaling ${currency}${recentTotal.toLocaleString()}\n\n`;
  
  if (insights.length > 0) {
    message += `**Key Insights:**\n`;
    insights.slice(0, 3).forEach(i => {
      const emoji = i.priority === 'high' ? '🔴' : i.priority === 'medium' ? '🟡' : '🟢';
      message += `${emoji} ${i.message}\n`;
    });
  }
  
  return {
    message,
    ui_component: "daily_digest",
    ui_data: {
      period: { start: weekAgo.toISOString(), end: today.toISOString() },
      transactionCount: recentTxns.length,
      total: recentTotal,
      insights: insights.slice(0, 5)
    },
    suggestions: ["Show details", "Compare to last week", "Set weekly goal"]
  };
};

/**
 * Generate smart suggestions based on context
 */
export const generateSmartSuggestions = (data, context = {}) => {
  const { transactions, config } = data;
  const persona = config?.persona || 'solo';
  const participants = config?.participants || [];
  
  const suggestions = [];
  const pending = transactions.filter(t => !t.settled);
  
  // Context-aware suggestions
  if (context.lastAction === 'added_expense') {
    suggestions.push("Add another expense");
    if (persona === 'group') suggestions.push("Split differently");
    suggestions.push("Show today's expenses");
  } else if (context.lastAction === 'viewed_spending') {
    suggestions.push("Compare to last month");
    suggestions.push("Set a budget");
    suggestions.push("Show by category");
  } else if (context.lastAction === 'settlement') {
    suggestions.push("View history");
    suggestions.push("Add new expense");
    suggestions.push("Show spending analysis");
  }
  
  // Persona-specific suggestions
  if (suggestions.length < 4) {
    switch (persona) {
      case 'group':
        if (pending.length > 0) suggestions.push("Settle up");
        suggestions.push("Who spent most?");
        break;
      case 'solo':
        suggestions.push("Show savings tips");
        suggestions.push("Set financial goals");
        break;
      case 'vendor':
        suggestions.push("Profit analysis");
        suggestions.push("Expense report");
        break;
    }
  }
  
  return suggestions.slice(0, 4);
};
