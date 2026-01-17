/**
 * Simulation Service - What-if scenarios and financial projections
 * Handles budget simulations, sliders, and forecasting
 */

import { addConfidence } from './analysisService.js';

/**
 * Generate basic simulation - PERSONA-AWARE
 */
export const generateSimulation = (data, simulationParams = {}) => {
  const { transactions, config } = data;
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  const currency = config?.currency || '₹';
  
  const currentTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const months = simulationParams.months || 3;
  const categories = {};
  
  transactions.forEach(t => {
    const cat = t.category || 'Other';
    categories[cat] = (categories[cat] || 0) + t.amount;
  });
  
  // Project based on current spending
  const avgMonthly = currentTotal / Math.max(1, getMonthsOfData(transactions));
  const projection = avgMonthly * months;
  
  let message = `🔮 **${months}-Month Projection**\n\n`;
  
  switch (persona) {
    case 'group':
      const perPerson = Math.round(projection / participants.length);
      message += `Based on current spending patterns:\n\n`;
      message += `💰 **Total projected**: ${currency}${Math.round(projection).toLocaleString()}\n`;
      message += `👥 **Per person**: ${currency}${perPerson.toLocaleString()}\n\n`;
      message += `This assumes spending continues at the current rate of ${currency}${Math.round(avgMonthly).toLocaleString()}/month.\n`;
      break;
      
    case 'vendor':
      const projectedExpenses = projection;
      const avgIncome = (data.income || []).reduce((sum, i) => sum + i.amount, 0) / 
                        Math.max(1, getMonthsOfData(data.income || []));
      const projectedIncome = avgIncome * months;
      const projectedProfit = projectedIncome - projectedExpenses;
      
      message += `Based on current trends:\n\n`;
      message += `💵 **Projected Income**: ${currency}${Math.round(projectedIncome).toLocaleString()}\n`;
      message += `💸 **Projected Expenses**: ${currency}${Math.round(projectedExpenses).toLocaleString()}\n`;
      message += `📈 **Projected Profit**: ${currency}${Math.round(projectedProfit).toLocaleString()}\n`;
      break;
      
    case 'traveler':
      message += `Based on your travel spending:\n\n`;
      message += `💰 **Projected travel expenses**: ${currency}${Math.round(projection).toLocaleString()}\n`;
      message += `📊 **Average per trip**: ${currency}${Math.round(avgMonthly).toLocaleString()}\n`;
      break;
      
    default:
      message += `Based on current spending:\n\n`;
      message += `💰 **Projected expenses**: ${currency}${Math.round(projection).toLocaleString()}\n`;
      message += `📅 **Monthly average**: ${currency}${Math.round(avgMonthly).toLocaleString()}\n`;
  }
  
  const projectionData = Object.entries(categories).map(([category, amount]) => ({
    category,
    current: amount,
    projected: Math.round((amount / currentTotal) * projection)
  }));
  
  return addConfidence({
    message,
    ui_component: "projection_chart",
    ui_data: {
      title: `${months}-Month Projection`,
      currentTotal,
      projectedTotal: Math.round(projection),
      monthlyAverage: Math.round(avgMonthly),
      byCategory: projectionData,
      months
    },
    suggestions: [
      "What if I cut spending by 20%?",
      "Simulate 6 months",
      "Show category projections"
    ]
  }, null, null, data, 'simulation');
};

/**
 * Generate simulation with interactive slider
 */
export const generateSimulationWithSlider = (data, options = {}) => {
  const { transactions, config } = data;
  const participants = config?.participants || [];
  const persona = config?.persona || 'solo';
  const currency = config?.currency || '₹';
  
  const currentTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgMonthly = currentTotal / Math.max(1, getMonthsOfData(transactions));
  
  // Default simulation scenarios
  const scenarios = [
    { label: 'Cut 30%', factor: 0.7, description: 'Aggressive saving' },
    { label: 'Cut 20%', factor: 0.8, description: 'Moderate saving' },
    { label: 'Cut 10%', factor: 0.9, description: 'Light saving' },
    { label: 'Current', factor: 1.0, description: 'No change' },
    { label: '+10%', factor: 1.1, description: 'Slight increase' },
    { label: '+20%', factor: 1.2, description: 'Higher spending' }
  ];
  
  const scenarioResults = scenarios.map(s => ({
    ...s,
    monthlyAmount: Math.round(avgMonthly * s.factor),
    yearlyAmount: Math.round(avgMonthly * s.factor * 12),
    perPerson: participants.length > 1 ? Math.round((avgMonthly * s.factor) / participants.length) : null
  }));
  
  let message = `🎚️ **Interactive Budget Simulator**\n\n`;
  message += `Current monthly average: ${currency}${Math.round(avgMonthly).toLocaleString()}\n\n`;
  message += `Use the slider to see how changes in spending affect your finances!\n`;
  
  if (persona === 'group' && participants.length > 1) {
    message += `\n💡 Results show per-person impact for your group of ${participants.length}.`;
  }
  
  return {
    message,
    ui_component: "simulation_slider",
    ui_data: {
      title: "Budget Simulator",
      currentMonthly: Math.round(avgMonthly),
      scenarios: scenarioResults,
      participants: participants.length,
      currency,
      sliderConfig: {
        min: 0.5,
        max: 1.5,
        step: 0.05,
        default: 1.0,
        labels: { 0.5: '-50%', 0.75: '-25%', 1.0: 'Current', 1.25: '+25%', 1.5: '+50%' }
      }
    },
    suggestions: [
      "What if we each contribute ₹5000/month?",
      "Show category-wise simulation",
      "Set a budget goal"
    ]
  };
};

/**
 * Simulate specific scenario (e.g., "What if I spend 20% less")
 */
export const generateScenarioSimulation = (data, scenario) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  const participants = config?.participants || [];
  
  const currentTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgMonthly = currentTotal / Math.max(1, getMonthsOfData(transactions));
  
  // Parse scenario
  let factor = 1.0;
  let scenarioDescription = '';
  
  if (scenario.includes('cut') || scenario.includes('reduce') || scenario.includes('less')) {
    const match = scenario.match(/(\d+)/);
    const percentage = match ? parseInt(match[1]) : 20;
    factor = 1 - (percentage / 100);
    scenarioDescription = `${percentage}% reduction`;
  } else if (scenario.includes('increase') || scenario.includes('more')) {
    const match = scenario.match(/(\d+)/);
    const percentage = match ? parseInt(match[1]) : 20;
    factor = 1 + (percentage / 100);
    scenarioDescription = `${percentage}% increase`;
  } else if (scenario.includes('double')) {
    factor = 2.0;
    scenarioDescription = 'Doubled spending';
  } else if (scenario.includes('half')) {
    factor = 0.5;
    scenarioDescription = 'Halved spending';
  }
  
  const newMonthly = avgMonthly * factor;
  const yearlySavings = (avgMonthly - newMonthly) * 12;
  
  let message = `🔮 **Scenario: ${scenarioDescription}**\n\n`;
  message += `📊 **Current monthly**: ${currency}${Math.round(avgMonthly).toLocaleString()}\n`;
  message += `📈 **New monthly**: ${currency}${Math.round(newMonthly).toLocaleString()}\n`;
  message += `💰 **Yearly impact**: ${yearlySavings >= 0 ? 'Save' : 'Spend'} ${currency}${Math.abs(Math.round(yearlySavings)).toLocaleString()}\n`;
  
  if (participants.length > 1) {
    message += `\n👥 **Per person impact**: ${currency}${Math.round((avgMonthly - newMonthly) / participants.length).toLocaleString()}/month`;
  }
  
  return {
    message,
    ui_component: "scenario_comparison",
    ui_data: {
      title: `Scenario: ${scenarioDescription}`,
      current: { monthly: Math.round(avgMonthly), yearly: Math.round(avgMonthly * 12) },
      projected: { monthly: Math.round(newMonthly), yearly: Math.round(newMonthly * 12) },
      savings: Math.round(yearlySavings),
      factor
    },
    suggestions: [
      "Try different percentage",
      "Show by category",
      "How to achieve this?"
    ]
  };
};

/**
 * Generate budget goal simulation
 */
export const generateBudgetGoalSimulation = (data, targetAmount) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  const participants = config?.participants || [];
  
  const currentTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgMonthly = currentTotal / Math.max(1, getMonthsOfData(transactions));
  
  const reductionNeeded = avgMonthly - targetAmount;
  const reductionPercent = (reductionNeeded / avgMonthly) * 100;
  
  // Analyze which categories could be cut
  const categories = {};
  transactions.forEach(t => {
    const cat = t.category || 'Other';
    categories[cat] = (categories[cat] || 0) + t.amount;
  });
  
  const sortedCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      monthlyAvg: Math.round(amount / Math.max(1, getMonthsOfData(transactions))),
      percentOfTotal: ((amount / currentTotal) * 100).toFixed(1)
    }));
  
  let message = `🎯 **Budget Goal Analysis**\n\n`;
  message += `📊 **Current monthly**: ${currency}${Math.round(avgMonthly).toLocaleString()}\n`;
  message += `🎯 **Target**: ${currency}${targetAmount.toLocaleString()}\n`;
  message += `📉 **Reduction needed**: ${currency}${Math.round(reductionNeeded).toLocaleString()} (${reductionPercent.toFixed(1)}%)\n\n`;
  
  if (reductionNeeded > 0) {
    message += `💡 **Suggestions**: Focus on your top spending categories:\n`;
    sortedCategories.slice(0, 3).forEach(cat => {
      message += `• ${cat.category}: ${currency}${cat.monthlyAvg.toLocaleString()}/month\n`;
    });
  } else {
    message += `✨ Great news! You're already under your target budget!`;
  }
  
  return {
    message,
    ui_component: "budget_goal",
    ui_data: {
      title: "Budget Goal Analysis",
      current: Math.round(avgMonthly),
      target: targetAmount,
      gap: Math.round(reductionNeeded),
      categories: sortedCategories,
      achievable: reductionPercent <= 30
    },
    suggestions: [
      `Cut ${sortedCategories[0]?.category} by 20%`,
      "Show detailed breakdown",
      "Set different goal"
    ]
  };
};

/**
 * Generate category-wise simulation with individual sliders
 * PS Requirement: "Let users compare, simulate, and explore scenarios"
 */
export const generateCategoryWiseSimulation = (data, categoryAdjustments = {}) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  const participants = config?.participants || [];
  
  const months = Math.max(1, getMonthsOfData(transactions));
  
  // Calculate category-wise spending
  const categories = {};
  transactions.forEach(t => {
    const cat = t.category || 'Other';
    categories[cat] = (categories[cat] || 0) + t.amount;
  });
  
  // Apply adjustments and calculate new totals
  const categoryResults = Object.entries(categories).map(([category, total]) => {
    const monthlyAvg = total / months;
    const adjustment = categoryAdjustments[category] || 1.0; // Default: no change
    const newMonthly = monthlyAvg * adjustment;
    const savings = (monthlyAvg - newMonthly) * 12;
    
    return {
      category,
      current: Math.round(monthlyAvg),
      adjusted: Math.round(newMonthly),
      factor: adjustment,
      yearlySavings: Math.round(savings),
      percentOfTotal: ((total / Object.values(categories).reduce((a, b) => a + b, 0)) * 100).toFixed(1)
    };
  }).sort((a, b) => b.current - a.current);
  
  const currentTotal = categoryResults.reduce((sum, c) => sum + c.current, 0);
  const adjustedTotal = categoryResults.reduce((sum, c) => sum + c.adjusted, 0);
  const totalSavings = (currentTotal - adjustedTotal) * 12;
  
  let message = `🎚️ **Category-Wise Budget Simulator**\n\n`;
  message += `Adjust each category to see the impact on your finances.\n\n`;
  message += `📊 **Current Monthly**: ${currency}${currentTotal.toLocaleString()}\n`;
  message += `🎯 **After Adjustments**: ${currency}${adjustedTotal.toLocaleString()}\n`;
  message += `💰 **Yearly Savings**: ${currency}${totalSavings.toLocaleString()}\n`;
  
  if (participants.length > 1) {
    const perPersonSavings = Math.round(totalSavings / participants.length);
    message += `\n👥 **Per Person Savings**: ${currency}${perPersonSavings.toLocaleString()}/year`;
  }
  
  return {
    message,
    ui_component: "category_simulation_slider",
    ui_data: {
      title: "Category Budget Simulator",
      categories: categoryResults,
      summary: {
        currentMonthly: currentTotal,
        adjustedMonthly: adjustedTotal,
        yearlySavings: totalSavings,
        participantCount: participants.length
      },
      sliderConfig: {
        min: 0.0,
        max: 2.0,
        step: 0.1,
        default: 1.0,
        labels: { 0: '0%', 0.5: '50%', 1.0: '100%', 1.5: '150%', 2.0: '200%' }
      }
    },
    suggestions: [
      "Apply these changes",
      "Reset to current",
      "Show impact by person"
    ]
  };
};

/**
 * Generate trip budget simulation - TRAVELER PERSONA
 * PS Requirement: "Solo traveler tracking trip spending"
 */
export const generateTripBudgetSimulation = (data, tripParams = {}) => {
  const { transactions, config } = data;
  const currency = config?.currency || '₹';
  
  const { tripName, dailyBudget, days, categories } = tripParams;
  
  // Get historical trip data if available
  const tripTxns = transactions.filter(t => t.trip);
  const tripCategories = {};
  
  tripTxns.forEach(t => {
    const cat = t.category || 'Other';
    tripCategories[cat] = (tripCategories[cat] || 0) + t.amount;
  });
  
  const avgDailySpend = tripTxns.length > 0 
    ? tripTxns.reduce((sum, t) => sum + t.amount, 0) / Math.max(1, getUniqueDays(tripTxns))
    : 2000; // Default estimate
  
  const projectedDaily = dailyBudget || avgDailySpend;
  const projectedTotal = projectedDaily * (days || 7);
  
  // Category breakdown projection
  const categoryProjection = Object.entries(tripCategories).map(([category, amount]) => {
    const totalTrip = Object.values(tripCategories).reduce((a, b) => a + b, 0);
    const percent = totalTrip > 0 ? (amount / totalTrip) : 0;
    return {
      category,
      historical: Math.round(amount),
      projected: Math.round(projectedTotal * percent),
      percentOfBudget: (percent * 100).toFixed(1)
    };
  });
  
  let message = `✈️ **Trip Budget Planner${tripName ? `: ${tripName}` : ''}**\n\n`;
  message += `📅 **Duration**: ${days || 7} days\n`;
  message += `💰 **Daily Budget**: ${currency}${Math.round(projectedDaily).toLocaleString()}\n`;
  message += `📊 **Total Projected**: ${currency}${Math.round(projectedTotal).toLocaleString()}\n\n`;
  
  if (categoryProjection.length > 0) {
    message += `**Estimated Breakdown:**\n`;
    categoryProjection.slice(0, 4).forEach(c => {
      message += `• ${c.category}: ${currency}${c.projected.toLocaleString()} (${c.percentOfBudget}%)\n`;
    });
  }
  
  return {
    message,
    ui_component: "trip_budget_simulator",
    ui_data: {
      title: tripName || "Trip Budget",
      dailyBudget: Math.round(projectedDaily),
      days: days || 7,
      totalBudget: Math.round(projectedTotal),
      categories: categoryProjection,
      historicalAvgDaily: Math.round(avgDailySpend),
      sliderConfig: {
        dailyMin: 500,
        dailyMax: 10000,
        dailyStep: 100,
        daysMin: 1,
        daysMax: 30
      }
    },
    suggestions: [
      "Adjust daily budget",
      "Compare to past trips",
      "Set trip alerts"
    ]
  };
};

/**
 * Helper: Get unique days from transactions
 */
function getUniqueDays(transactions) {
  const uniqueDates = new Set(transactions.map(t => t.date?.split('T')[0]));
  return uniqueDates.size || 1;
}

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
