/**
 * Decision Engine Service - Decision guides and recommendations
 * Handles purchase decisions, budget advice, and financial recommendations
 */

import { addConfidence } from './analysisService.js';

/**
 * Generate basic decision guide
 */
export const generateDecisionGuide = (data, options = {}) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  
  const { item, amount, category } = options;
  
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const monthlyAvg = total / Math.max(1, getMonthsOfData(transactions));
  
  // Get category spending
  const categoryTotal = transactions
    .filter(t => (t.category || 'Other') === (category || 'Other'))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const categoryMonthlyAvg = categoryTotal / Math.max(1, getMonthsOfData(transactions));
  
  // Decision factors
  const factors = [];
  let recommendation = 'consider';
  let confidence = 'medium';
  
  // Factor 1: Percentage of monthly budget
  const percentOfMonthly = (amount / monthlyAvg) * 100;
  if (percentOfMonthly > 50) {
    factors.push({
      type: 'warning',
      text: `This is ${percentOfMonthly.toFixed(0)}% of your monthly average spending`,
      impact: 'high'
    });
    recommendation = 'careful';
    confidence = 'high';
  } else if (percentOfMonthly > 25) {
    factors.push({
      type: 'caution',
      text: `This is ${percentOfMonthly.toFixed(0)}% of your monthly average`,
      impact: 'medium'
    });
  } else {
    factors.push({
      type: 'positive',
      text: `This is only ${percentOfMonthly.toFixed(0)}% of your monthly average`,
      impact: 'low'
    });
    recommendation = 'okay';
  }
  
  // Factor 2: Category impact
  if (amount > categoryMonthlyAvg * 2) {
    factors.push({
      type: 'warning',
      text: `This would double your ${category || 'typical'} spending`,
      impact: 'high'
    });
  }
  
  // Factor 3: Group impact
  if (persona === 'group' && participants.length > 1) {
    const perPersonShare = amount / participants.length;
    factors.push({
      type: 'info',
      text: `Split ${participants.length} ways: ${currency}${Math.round(perPersonShare).toLocaleString()} per person`,
      impact: 'neutral'
    });
  }
  
  let message = `🤔 **Decision Guide: ${item || 'This Purchase'}**\n\n`;
  message += `**Amount**: ${currency}${amount.toLocaleString()}\n\n`;
  
  message += `**Factors to consider:**\n`;
  factors.forEach(f => {
    const emoji = f.type === 'warning' ? '⚠️' : f.type === 'caution' ? '⚡' : f.type === 'positive' ? '✅' : 'ℹ️';
    message += `${emoji} ${f.text}\n`;
  });
  
  message += `\n**Recommendation**: `;
  switch (recommendation) {
    case 'okay':
      message += '✅ Looks reasonable within your budget';
      break;
    case 'consider':
      message += '🤔 Consider if this is a need vs want';
      break;
    case 'careful':
      message += '⚠️ This is a significant expense - think it through';
      break;
  }
  
  return {
    message,
    ui_component: "decision_guide",
    ui_data: {
      title: `Decision: ${item || 'Purchase'}`,
      amount,
      factors,
      recommendation,
      confidence,
      percentOfBudget: percentOfMonthly
    },
    suggestions: [
      "What if I wait a month?",
      "Show my budget status",
      "Compare alternatives"
    ]
  };
};

/**
 * Generate detailed decision guide with justification
 */
export const generateDecisionGuideWithJustification = (data, options = {}) => {
  const { transactions, config, savingsGoal, income } = data;
  const currency = config?.currency || '₹';
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  
  const { item, amount, category, urgency } = options;
  
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const months = Math.max(1, getMonthsOfData(transactions));
  const monthlyAvg = total / months;
  const totalIncome = (income || []).reduce((sum, i) => sum + i.amount, 0);
  const monthlySavings = (totalIncome / months) - monthlyAvg;
  
  // Build comprehensive justification
  const justification = {
    steps: [],
    factors: [],
    score: 0, // -100 to +100
    maxScore: 100
  };
  
  // Step 1: Budget Analysis
  const percentOfBudget = (amount / monthlyAvg) * 100;
  justification.steps.push({
    title: 'Budget Impact',
    analysis: `This ${currency}${amount.toLocaleString()} expense is ${percentOfBudget.toFixed(1)}% of your monthly average (${currency}${Math.round(monthlyAvg).toLocaleString()})`,
    score: percentOfBudget > 50 ? -30 : percentOfBudget > 25 ? -15 : 10
  });
  justification.score += justification.steps[0].score;
  
  // Step 2: Savings Impact
  if (monthlySavings > 0) {
    const monthsToRecover = amount / monthlySavings;
    justification.steps.push({
      title: 'Savings Impact',
      analysis: `At your current savings rate, this would take ${monthsToRecover.toFixed(1)} months to recover`,
      score: monthsToRecover > 3 ? -20 : monthsToRecover > 1 ? -5 : 5
    });
    justification.score += justification.steps[1].score;
  }
  
  // Step 3: Category Analysis
  const categorySpending = transactions
    .filter(t => (t.category || 'Other') === category)
    .reduce((sum, t) => sum + t.amount, 0);
  const categoryMonthlyAvg = categorySpending / months;
  
  if (categoryMonthlyAvg > 0) {
    const categoryImpact = (amount / categoryMonthlyAvg) * 100;
    justification.steps.push({
      title: 'Category Impact',
      analysis: `This is ${categoryImpact.toFixed(0)}% of your typical ${category || 'category'} spending`,
      score: categoryImpact > 200 ? -25 : categoryImpact > 100 ? -10 : 5
    });
    justification.score += justification.steps[justification.steps.length - 1].score;
  }
  
  // Step 4: Urgency Factor
  if (urgency) {
    const urgencyScore = urgency === 'high' ? 20 : urgency === 'medium' ? 5 : -10;
    justification.steps.push({
      title: 'Urgency Assessment',
      analysis: `Urgency level: ${urgency}`,
      score: urgencyScore
    });
    justification.score += urgencyScore;
  }
  
  // Step 5: Group Split (if applicable)
  if (persona === 'group' && participants.length > 1) {
    const perPerson = amount / participants.length;
    const perPersonPercent = (perPerson / (monthlyAvg / participants.length)) * 100;
    justification.steps.push({
      title: 'Group Split Analysis',
      analysis: `Split ${participants.length} ways: ${currency}${Math.round(perPerson).toLocaleString()} per person (${perPersonPercent.toFixed(0)}% of individual monthly avg)`,
      score: perPersonPercent > 30 ? -10 : 10
    });
    justification.score += justification.steps[justification.steps.length - 1].score;
  }
  
  // Final recommendation
  let recommendation;
  let emoji;
  if (justification.score >= 20) {
    recommendation = 'Recommended';
    emoji = '✅';
  } else if (justification.score >= 0) {
    recommendation = 'Acceptable';
    emoji = '🤔';
  } else if (justification.score >= -30) {
    recommendation = 'Think Twice';
    emoji = '⚡';
  } else {
    recommendation = 'Not Recommended';
    emoji = '⚠️';
  }
  
  let message = `${emoji} **Decision Analysis: ${item || 'This Purchase'}**\n\n`;
  message += `**Amount**: ${currency}${amount.toLocaleString()}\n`;
  message += `**Recommendation**: ${recommendation} (Score: ${justification.score}/${justification.maxScore})\n\n`;
  
  message += `**Analysis Steps:**\n`;
  justification.steps.forEach((step, i) => {
    const stepEmoji = step.score > 0 ? '✅' : step.score < 0 ? '⚠️' : '➡️';
    message += `${i + 1}. ${stepEmoji} **${step.title}**: ${step.analysis}\n`;
  });
  
  return addConfidence({
    message,
    ui_component: "decision_guide_detailed",
    ui_data: {
      title: `Decision: ${item || 'Purchase'}`,
      amount,
      recommendation,
      score: justification.score,
      maxScore: justification.maxScore,
      steps: justification.steps,
      persona
    },
    suggestions: [
      "What would make this better?",
      "Show alternatives",
      "Add to wishlist instead"
    ]
  }, null, null, data, 'decision');
};

/**
 * Generate savings recommendation
 */
export const generateSavingsAdvice = (data, targetAmount) => {
  const { transactions, config, income } = data;
  const currency = config?.currency || '₹';
  
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const months = Math.max(1, getMonthsOfData(transactions));
  const monthlyExpenses = total / months;
  const totalIncome = (income || []).reduce((sum, i) => sum + i.amount, 0);
  const monthlyIncome = totalIncome / months;
  const currentSavings = monthlyIncome - monthlyExpenses;
  
  // Calculate how to reach target
  let message = `💰 **Savings Analysis**\n\n`;
  
  if (currentSavings <= 0) {
    message += `⚠️ Currently, you're spending more than you earn.\n\n`;
    message += `**Monthly income**: ${currency}${Math.round(monthlyIncome).toLocaleString()}\n`;
    message += `**Monthly expenses**: ${currency}${Math.round(monthlyExpenses).toLocaleString()}\n`;
    message += `**Gap**: ${currency}${Math.round(-currentSavings).toLocaleString()}\n\n`;
    message += `To save ${currency}${targetAmount.toLocaleString()}, you'll first need to balance your budget.`;
    
    return {
      message,
      ui_component: "savings_warning",
      ui_data: {
        title: "Budget Alert",
        income: monthlyIncome,
        expenses: monthlyExpenses,
        gap: currentSavings,
        target: targetAmount
      },
      suggestions: ["Show biggest expenses", "Set a budget", "Find ways to cut spending"]
    };
  }
  
  const monthsToTarget = targetAmount / currentSavings;
  
  message += `**Current savings rate**: ${currency}${Math.round(currentSavings).toLocaleString()}/month\n`;
  message += `**Target**: ${currency}${targetAmount.toLocaleString()}\n`;
  message += `**Time to reach**: ${monthsToTarget.toFixed(1)} months\n\n`;
  
  // Suggestions to speed up
  const categories = {};
  transactions.forEach(t => {
    const cat = t.category || 'Other';
    categories[cat] = (categories[cat] || 0) + t.amount;
  });
  
  const sortedCats = Object.entries(categories)
    .map(([cat, amt]) => ({ category: cat, amount: amt, monthly: amt / months }))
    .sort((a, b) => b.monthly - a.monthly);
  
  message += `**💡 Speed up by cutting:**\n`;
  sortedCats.slice(0, 3).forEach(c => {
    const potential = c.monthly * 0.2;
    message += `• 20% of ${c.category}: Save ${currency}${Math.round(potential).toLocaleString()}/month\n`;
  });
  
  return {
    message,
    ui_component: "savings_plan",
    ui_data: {
      title: "Savings Plan",
      currentSavings,
      target: targetAmount,
      monthsToTarget,
      topCategories: sortedCats.slice(0, 5)
    },
    suggestions: ["Show detailed plan", "Set up auto-save", "Track progress"]
  };
};

/**
 * Helper: Calculate months of data
 */
function getMonthsOfData(transactions) {
  if (!transactions || transactions.length === 0) return 1;
  
  const dates = transactions
    .filter(t => t.date)
    .map(t => new Date(t.date))
    .sort((a, b) => a - b);
  
  if (dates.length < 2) return 1;
  
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const diffMs = lastDate - firstDate;
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
  
  return Math.max(1, Math.round(diffMonths));
}
