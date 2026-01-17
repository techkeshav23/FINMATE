// Pattern Learning Service
// Stores and learns from user's spending patterns and anomalies

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PATTERNS_FILE = join(__dirname, '../../data/learned_patterns.json');

// Default pattern structure
const defaultPatterns = {
  userBaselines: {}, // Average spending by category per user
  categoryAverages: {}, // Overall average by category
  anomalyHistory: [], // Past detected anomalies
  settledHistory: [], // Settlement history for timing analysis
  frequencyPatterns: {}, // How often each category occurs
  lastUpdated: null,
  learningStartDate: new Date().toISOString()
};

// Load or initialize patterns
export const loadPatterns = () => {
  try {
    if (existsSync(PATTERNS_FILE)) {
      const data = readFileSync(PATTERNS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading patterns:', error.message);
  }
  return { ...defaultPatterns };
};

// Save patterns to disk
export const savePatterns = (patterns) => {
  try {
    patterns.lastUpdated = new Date().toISOString();
    writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving patterns:', error.message);
    return false;
  }
};

// Learn from transactions - build baseline patterns
// participants = array of participant names (for group mode) or empty array (solo mode)
export const learnFromTransactions = (transactions, participants = []) => {
  const patterns = loadPatterns();
  
  // Reset learning
  patterns.userBaselines = {};
  patterns.categoryAverages = {};
  patterns.frequencyPatterns = {};
  
  // For solo mode, use 'user' as the default participant
  const effectiveParticipants = participants.length > 0 ? participants : ['user'];
  
  effectiveParticipants.forEach(name => {
    patterns.userBaselines[name] = {};
  });
  
  // Group transactions by category and person
  const categoryTotals = {};
  const categoryCounts = {};
  const personCategoryTotals = {};
  
  transactions.forEach(txn => {
    const category = txn.category || 'Other';
    const payer = txn.payer || 'user'; // Default to 'user' for solo mode
    const amount = txn.amount || 0;
    
    // Category totals
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    
    // Person-category totals
    if (!personCategoryTotals[payer]) {
      personCategoryTotals[payer] = {};
    }
    personCategoryTotals[payer][category] = (personCategoryTotals[payer][category] || 0) + amount;
  });
  
  // Calculate averages
  Object.keys(categoryTotals).forEach(category => {
    patterns.categoryAverages[category] = {
      average: Math.round(categoryTotals[category] / categoryCounts[category]),
      total: categoryTotals[category],
      count: categoryCounts[category],
      frequency: categoryCounts[category] / transactions.length // How common is this category
    };
  });
  
  // User baselines per category
  effectiveParticipants.forEach(name => {
    if (personCategoryTotals[name]) {
      Object.keys(personCategoryTotals[name]).forEach(category => {
        const userCatTxns = transactions.filter(t => (t.payer || 'user') === name && (t.category || 'Other') === category);
        if (userCatTxns.length > 0) {
          patterns.userBaselines[name][category] = {
            average: Math.round(personCategoryTotals[name][category] / userCatTxns.length),
            total: personCategoryTotals[name][category],
            count: userCatTxns.length
          };
        }
      });
    }
  });
  
  // Frequency patterns (days between category transactions)
  const categoryDates = {};
  transactions.forEach(txn => {
    const category = txn.category || 'Other';
    if (!categoryDates[category]) {
      categoryDates[category] = [];
    }
    categoryDates[category].push(new Date(txn.date));
  });
  
  Object.keys(categoryDates).forEach(category => {
    const dates = categoryDates[category].sort((a, b) => a - b);
    if (dates.length > 1) {
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        const daysDiff = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
        gaps.push(daysDiff);
      }
      patterns.frequencyPatterns[category] = {
        averageDaysBetween: Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length),
        minDays: Math.min(...gaps),
        maxDays: Math.max(...gaps)
      };
    }
  });
  
  savePatterns(patterns);
  return patterns;
};

// Record an anomaly for learning
export const recordAnomaly = (anomaly, wasAccurate = null) => {
  const patterns = loadPatterns();
  
  patterns.anomalyHistory.push({
    ...anomaly,
    detectedAt: new Date().toISOString(),
    wasAccurate, // User can mark if anomaly was genuine or false positive
    id: `anomaly_${Date.now()}`
  });
  
  // Keep only last 100 anomalies
  if (patterns.anomalyHistory.length > 100) {
    patterns.anomalyHistory = patterns.anomalyHistory.slice(-100);
  }
  
  savePatterns(patterns);
  return patterns;
};

// Record settlement for timing analysis
export const recordSettlement = (amount, participants) => {
  const patterns = loadPatterns();
  
  patterns.settledHistory.push({
    amount,
    participants,
    date: new Date().toISOString()
  });
  
  // Keep only last 50 settlements
  if (patterns.settledHistory.length > 50) {
    patterns.settledHistory = patterns.settledHistory.slice(-50);
  }
  
  savePatterns(patterns);
};

// Get learned thresholds for anomaly detection
export const getLearnedThresholds = (category) => {
  const patterns = loadPatterns();
  const categoryData = patterns.categoryAverages[category];
  
  if (!categoryData) {
    return { threshold: 1.5, reason: 'default' }; // 50% above average
  }
  
  // Check anomaly history for this category
  const categoryAnomalies = patterns.anomalyHistory.filter(a => 
    a.category === category && a.wasAccurate !== false
  );
  
  // If we have feedback, adjust threshold
  const falsePositives = patterns.anomalyHistory.filter(a => 
    a.category === category && a.wasAccurate === false
  ).length;
  
  const truePositives = categoryAnomalies.filter(a => a.wasAccurate === true).length;
  
  // Increase threshold if many false positives
  let threshold = 1.5;
  if (falsePositives > 3 && falsePositives > truePositives) {
    threshold = 2.0; // Be more lenient
  } else if (truePositives > falsePositives * 2) {
    threshold = 1.3; // Be more strict
  }
  
  return {
    threshold,
    average: categoryData.average,
    frequency: categoryData.frequency,
    reason: falsePositives > 0 ? 'adjusted based on feedback' : 'learned from history'
  };
};

// Enhanced anomaly detection using learned patterns
// participants = array of participant names (for group mode) or empty array (solo mode)
export const detectAnomaliesWithLearning = (transactions, participants = []) => {
  const patterns = loadPatterns();
  const anomalies = [];
  
  // Ensure we have baselines
  if (Object.keys(patterns.categoryAverages).length === 0) {
    learnFromTransactions(transactions, participants);
  }
  
  // Get recent transactions
  const recentTxns = transactions.slice(-15);
  
  recentTxns.forEach(txn => {
    const category = txn.category || 'Other';
    const thresholdData = getLearnedThresholds(category);
    const baseline = patterns.categoryAverages[category];
    
    if (!baseline) return;
    
    const deviation = (txn.amount - baseline.average) / baseline.average;
    
    // Use learned threshold
    if (deviation > (thresholdData.threshold - 1) && txn.amount > 500) {
      const severity = deviation > 1.0 ? 'high' : deviation > 0.5 ? 'medium' : 'low';
      
      // Check if similar anomaly was marked as false positive
      const wasFalsePositiveBefore = patterns.anomalyHistory.some(a => 
        a.category === txn.category && 
        a.wasAccurate === false &&
        Math.abs(a.amount - txn.amount) < 500
      );
      
      if (!wasFalsePositiveBefore) {
        anomalies.push({
          id: `anomaly_${txn.id || Date.now()}`,
          type: 'learned_spike',
          severity,
          title: `${txn.category} expense above your normal`,
          description: `"${txn.description}" is ${(deviation * 100).toFixed(0)}% higher than your typical ${txn.category} spending of ₹${baseline.average.toLocaleString()}`,
          stats: {
            expected: baseline.average,
            actual: txn.amount,
            diff: txn.amount - baseline.average,
            diffPercent: (deviation * 100).toFixed(0),
            threshold: thresholdData.threshold,
            thresholdReason: thresholdData.reason
          },
          suggestion: `Your baseline for ${txn.category} is ₹${baseline.average.toLocaleString()} based on ${baseline.count} transactions. This one is notably higher.`,
          transaction: txn,
          canMarkFalsePositive: true
        });
      }
    }
  });
  
  // Check for missing expected transactions
  Object.keys(patterns.frequencyPatterns).forEach(category => {
    const freq = patterns.frequencyPatterns[category];
    const lastCategoryTxn = transactions
      .filter(t => t.category === category)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    if (lastCategoryTxn && freq.averageDaysBetween) {
      const daysSince = (new Date() - new Date(lastCategoryTxn.date)) / (1000 * 60 * 60 * 24);
      
      if (daysSince > freq.averageDaysBetween * 2 && freq.averageDaysBetween < 15) {
        anomalies.push({
          id: `missing_${category}`,
          type: 'missing_expected',
          severity: 'low',
          title: `No recent ${category} expenses`,
          description: `You usually have ${category} expenses every ~${freq.averageDaysBetween} days, but it's been ${Math.round(daysSince)} days since the last one.`,
          stats: {
            expectedDays: freq.averageDaysBetween,
            actualDays: Math.round(daysSince)
          },
          suggestion: `Just a heads up - this might be fine, or you might have a bill coming up!`
        });
      }
    }
  });
  
  // Check settlement timing
  const unsettledAmount = transactions.filter(t => !t.settled).reduce((sum, t) => sum + t.amount, 0);
  const avgSettlement = patterns.settledHistory.length > 0
    ? patterns.settledHistory.reduce((sum, s) => sum + s.amount, 0) / patterns.settledHistory.length
    : 5000;
  
  if (unsettledAmount > avgSettlement * 2) {
    anomalies.push({
      id: 'settlement_overdue',
      type: 'settlement_warning',
      severity: unsettledAmount > avgSettlement * 3 ? 'high' : 'medium',
      title: 'Unsettled balance growing',
      description: `You have ₹${unsettledAmount.toLocaleString()} unsettled, which is ${(unsettledAmount / avgSettlement).toFixed(1)}x your typical settlement amount of ₹${avgSettlement.toLocaleString()}.`,
      stats: {
        expected: avgSettlement,
        actual: unsettledAmount,
        diff: unsettledAmount - avgSettlement,
        diffPercent: ((unsettledAmount - avgSettlement) / avgSettlement * 100).toFixed(0)
      },
      suggestion: `Based on your history, you usually settle around ₹${avgSettlement.toLocaleString()}. Consider settling up soon to prevent confusion.`
    });
  }
  
  return anomalies.slice(0, 5);
};

// Get justification for a recommendation
export const getJustification = (type, data, patterns = null) => {
  const loadedPatterns = patterns || loadPatterns();
  
  switch (type) {
    case 'settlement': {
      const { owesMax, owedMax, unsettledAmount, daysSinceLastSettlement } = data;
      const reasons = [];
      
      if (unsettledAmount > 10000) {
        reasons.push(`Unsettled amount (₹${unsettledAmount.toLocaleString()}) exceeds ₹10,000 threshold`);
      }
      
      if (daysSinceLastSettlement > 30) {
        reasons.push(`It's been ${daysSinceLastSettlement} days since last settlement`);
      }
      
      if (loadedPatterns.settledHistory.length > 0) {
        const avgAmount = loadedPatterns.settledHistory.reduce((s, h) => s + h.amount, 0) / loadedPatterns.settledHistory.length;
        if (unsettledAmount > avgAmount * 1.5) {
          reasons.push(`Current balance is ${(unsettledAmount / avgAmount).toFixed(1)}x your typical settlement`);
        }
      }
      
      if (owesMax && Math.abs(owesMax.balance) > 5000) {
        reasons.push(`${owesMax.name}'s balance of ₹${Math.abs(owesMax.balance).toLocaleString()} is significant`);
      }
      
      return {
        summary: `Settlement recommended based on ${reasons.length} factor(s)`,
        reasons,
        confidence: reasons.length >= 2 ? 'high' : 'medium'
      };
    }
    
    case 'budget': {
      const { currentSpending, projectedSpending, topCategory } = data;
      const reasons = [];
      
      if (projectedSpending > currentSpending * 1.1) {
        reasons.push(`Projected spending is ${((projectedSpending / currentSpending - 1) * 100).toFixed(0)}% higher than current`);
      }
      
      if (topCategory && loadedPatterns.categoryAverages[topCategory.name]) {
        const baseline = loadedPatterns.categoryAverages[topCategory.name].average;
        if (topCategory.amount > baseline * 1.2) {
          reasons.push(`${topCategory.name} is trending ${((topCategory.amount / baseline - 1) * 100).toFixed(0)}% above baseline`);
        }
      }
      
      return {
        summary: `Budget recommendation based on spending patterns`,
        reasons,
        confidence: reasons.length >= 1 ? 'medium' : 'low'
      };
    }
    
    case 'anomaly': {
      const { anomaly } = data;
      const categoryData = loadedPatterns.categoryAverages[anomaly?.category];
      const reasons = [];
      
      if (categoryData) {
        reasons.push(`Your ${anomaly.category} baseline is ₹${categoryData.average.toLocaleString()} (${categoryData.count} transactions)`);
      }
      
      if (anomaly?.stats?.diffPercent) {
        reasons.push(`This transaction is ${anomaly.stats.diffPercent}% above that baseline`);
      }
      
      const similarAnomalies = loadedPatterns.anomalyHistory.filter(a => 
        a.category === anomaly?.category && a.wasAccurate === true
      ).length;
      
      if (similarAnomalies > 0) {
        reasons.push(`You've had ${similarAnomalies} similar verified anomalies before`);
      }
      
      return {
        summary: `Anomaly flagged using learned spending patterns`,
        reasons,
        confidence: reasons.length >= 2 ? 'high' : 'medium'
      };
    }
    
    default:
      return { summary: 'Recommendation based on current data', reasons: [], confidence: 'medium' };
  }
};

export default {
  loadPatterns,
  savePatterns,
  learnFromTransactions,
  recordAnomaly,
  recordSettlement,
  getLearnedThresholds,
  detectAnomaliesWithLearning,
  getJustification
};
