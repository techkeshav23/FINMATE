// NLP Engine - Smart intent detection with fuzzy matching
// Uses Gemini for complex queries, patterns for simple ones
// Universal - Works for all personas (solo, group, household, vendor, traveler)

import { GoogleGenerativeAI } from '@google/generative-ai';

// Intent definitions with semantic variations - Universal for all personas
const INTENT_PATTERNS = {
  spending_analysis: {
    keywords: ['spent', 'spending', 'expenses', 'paid', 'cost', 'money spent', 'how much', 'total'],
    semantic: ['expense breakdown', 'money going out', 'cash flow', 'expenditure', 'outflow'],
    ambiguous: ['spending', 'expenses', 'money']
  },
  income_analysis: {
    keywords: ['earned', 'income', 'revenue', 'sales', 'received', 'credited'],
    semantic: ['money coming in', 'inflow', 'earnings', 'profit'],
    ambiguous: ['income']
  },
  settlement: {
    keywords: ['owe', 'owes', 'debt', 'settle', 'settlement', 'pay back', 'balance', 'split'],
    semantic: ['who should pay whom', 'clear up', 'even out', 'square up', 'split the bill', 'fair share'],
    ambiguous: []
  },
  category_breakdown: {
    keywords: ['category', 'breakdown', 'distribution', 'by type', 'categorize'],
    semantic: ['where is money going', 'spending categories', 'expense types'],
    ambiguous: ['breakdown']
  },
  unpaid_bills: {
    keywords: ['unpaid', 'pending', 'unsettled', 'outstanding', 'due', 'overdue'],
    semantic: ['bills to pay', 'not yet paid', 'remaining bills', 'open transactions'],
    ambiguous: []
  },
  timeline: {
    keywords: ['timeline', 'trend', 'over time', 'history', 'graph', 'chart', 'daily', 'weekly', 'monthly'],
    semantic: ['spending pattern', 'how has it changed', 'track over days', 'daily spending'],
    ambiguous: ['trend', 'pattern']
  },
  comparison: {
    keywords: ['compare', 'versus', 'vs', 'difference', 'comparison', 'vs last'],
    semantic: ['this month vs last', 'week over week', 'period comparison', 'changed since', 'before and after'],
    ambiguous: []
  },
  anomaly: {
    keywords: ['unusual', 'anomaly', 'weird', 'strange', 'spike', 'abnormal', 'suspicious'],
    semantic: ['something wrong', 'looks off', 'unexpected', 'out of ordinary', 'red flag', 'duplicate'],
    ambiguous: []
  },
  simulation: {
    keywords: ['what if', 'simulate', 'plan', 'budget', 'project', 'forecast', 'predict'],
    semantic: ['hypothetical', 'scenario', 'if we', 'planning ahead', 'projection'],
    ambiguous: ['plan', 'budget']
  },
  decision: {
    keywords: ['what should', 'recommend', 'suggest', 'advice', 'next step', 'help me decide'],
    semantic: ['what to do', 'best action', 'guide me', 'your recommendation'],
    ambiguous: []
  },
  filter: {
    keywords: ['show', 'list', 'filter', 'only', 'just', 'find'],
    semantic: ['zoom in', 'focus on', 'specific transactions', 'narrow down', 'search'],
    ambiguous: []
  },
  summary: {
    keywords: ['summary', 'overview', 'report', 'status', 'dashboard'],
    semantic: ['quick look', 'snapshot', 'at a glance', 'overall'],
    ambiguous: []
  },
  savings: {
    keywords: ['save', 'saving', 'savings', 'cut back', 'reduce'],
    semantic: ['save money', 'cut expenses', 'budget tips', 'spend less'],
    ambiguous: []
  },
  recurring: {
    keywords: ['recurring', 'subscription', 'monthly', 'regular', 'fixed'],
    semantic: ['subscriptions', 'fixed costs', 'monthly bills', 'automatic payments'],
    ambiguous: []
  }
};

// Clarifying questions for ambiguous intents - Made persona-agnostic
const CLARIFYING_QUESTIONS = {
  spending: {
    question: "I can show you spending in different ways. What would you like to see?",
    options: [
      { label: "By category", intent: "category_breakdown", query: "Show category breakdown" },
      { label: "Over time", intent: "timeline", query: "Show spending timeline" },
      { label: "All transactions", intent: "filter", query: "Show all transactions" },
      { label: "Top expenses", intent: "spending_analysis", query: "What are my biggest expenses?" }
    ]
  },
  expenses: {
    question: "What aspect of expenses would you like to explore?",
    options: [
      { label: "By category", intent: "category_breakdown", query: "Break down by category" },
      { label: "Recent trends", intent: "timeline", query: "Show spending trend" },
      { label: "Unusual ones", intent: "anomaly", query: "Any unusual expenses?" },
      { label: "All expenses", intent: "filter", query: "List all expenses" }
    ]
  },
  money: {
    question: "I can help with several money-related questions. Which one?",
    options: [
      { label: "Spending breakdown", intent: "category_breakdown", query: "Show spending breakdown" },
      { label: "Cash flow", intent: "timeline", query: "Show cash flow over time" },
      { label: "Budget planning", intent: "simulation", query: "Help me plan a budget" },
      { label: "Savings tips", intent: "savings", query: "How can I save money?" }
    ]
  },
  breakdown: {
    question: "What kind of breakdown would you like?",
    options: [
      { label: "By category", intent: "category_breakdown", query: "Show category breakdown" },
      { label: "By date", intent: "timeline", query: "Show spending timeline" },
      { label: "By merchant", intent: "filter", query: "Group by merchant" }
    ]
  },
  trend: {
    question: "What trend are you interested in?",
    options: [
      { label: "Overall spending", intent: "timeline", query: "Show spending over time" },
      { label: "Compare periods", intent: "comparison", query: "Compare this month vs last" },
      { label: "Anomalies", intent: "anomaly", query: "Show unusual spending" }
    ]
  },
  plan: {
    question: "What would you like to plan?",
    options: [
      { label: "Monthly budget", intent: "simulation", query: "Plan next month's budget" },
      { label: "Savings goal", intent: "savings", query: "Help me set a savings goal" },
      { label: "What-if scenario", intent: "simulation", query: "What if I cut dining by 50%?" }
    ]
  },
  income: {
    question: "What would you like to know about income?",
    options: [
      { label: "Total earnings", intent: "income_analysis", query: "How much did I earn?" },
      { label: "Income vs expenses", intent: "comparison", query: "Compare income vs expenses" },
      { label: "Profit margin", intent: "income_analysis", query: "What's my profit margin?" }
    ]
  }
};

// Calculate similarity score between query and patterns
const calculateMatchScore = (query, patterns) => {
  const lowerQuery = query.toLowerCase();
  let score = 0;
  let matchedKeyword = null;
  
  // Exact keyword match (highest score)
  for (const keyword of patterns.keywords) {
    if (lowerQuery.includes(keyword)) {
      score = Math.max(score, 0.9);
      matchedKeyword = keyword;
    }
  }
  
  // Semantic match (medium score)
  for (const semantic of patterns.semantic) {
    if (lowerQuery.includes(semantic)) {
      score = Math.max(score, 0.7);
    }
  }
  
  // Partial word match (lower score)
  const queryWords = lowerQuery.split(/\s+/);
  for (const keyword of patterns.keywords) {
    for (const word of queryWords) {
      if (keyword.includes(word) || word.includes(keyword)) {
        score = Math.max(score, 0.5);
      }
    }
  }
  
  return { score, matchedKeyword };
};

// Check if query is ambiguous and needs clarification
const checkAmbiguity = (query) => {
  const lowerQuery = query.toLowerCase().trim();
  const words = lowerQuery.split(/\s+/);
  
  // Very short queries are often ambiguous
  if (words.length <= 2) {
    for (const [keyword, clarification] of Object.entries(CLARIFYING_QUESTIONS)) {
      if (lowerQuery.includes(keyword) || lowerQuery === keyword) {
        return { isAmbiguous: true, type: keyword, clarification };
      }
    }
  }
  
  // Check for standalone ambiguous keywords
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const ambiguousWord of patterns.ambiguous) {
      // If query is just the ambiguous word or word + "?"
      if (lowerQuery === ambiguousWord || lowerQuery === ambiguousWord + '?') {
        if (CLARIFYING_QUESTIONS[ambiguousWord]) {
          return { isAmbiguous: true, type: ambiguousWord, clarification: CLARIFYING_QUESTIONS[ambiguousWord] };
        }
      }
    }
  }
  
  return { isAmbiguous: false };
};

// Use Gemini for complex intent understanding
const analyzeWithGemini = async (query, context) => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `You are an intent classifier for a personal finance tracking app that supports multiple personas (solo user, traveler, household, roommates/groups, small vendor).

Classify this user query into ONE of these intents:
- spending_analysis: How much spent, total expenses
- income_analysis: Earnings, revenue (for vendors)
- category_breakdown: Spending by category
- settlement: Who owes whom (for groups only)
- unpaid_bills: Pending/unsettled transactions
- timeline: Spending over time, trends
- comparison: Compare periods (this vs last month)
- anomaly: Unusual spending patterns
- simulation: What-if scenarios, budget planning
- summary: Overview, dashboard, quick status
- savings: Save money tips, reduce expenses
- recurring: Subscriptions, fixed monthly costs
- decision: What should I do next
- filter_[category]: Show specific category (e.g., filter_food, filter_rent)
- clarify: Query is too vague, need more info
- greeting: Just saying hi
- unknown: Cannot determine intent

User query: "${query}"

Context: ${context ? JSON.stringify(context) : 'Personal finance tracking app'}

Respond with JSON:
{
  "intent": "detected_intent",
  "confidence": 0.0 to 1.0,
  "entities": { "category": null, "person": null, "timeframe": null, "amount": null },
  "needs_clarification": false,
  "suggested_query": "refined version of user query if helpful"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error('Gemini NLP error:', error.message);
    return null;
  }
};

// Main intent detection function
export const detectIntent = async (query, context = null) => {
  const lowerQuery = query.toLowerCase().trim();
  
  // Step 1: Check for ambiguity first
  const ambiguityCheck = checkAmbiguity(query);
  if (ambiguityCheck.isAmbiguous) {
    return {
      intent: 'clarify',
      confidence: 1.0,
      needsClarification: true,
      clarification: ambiguityCheck.clarification,
      originalQuery: query
    };
  }
  
  // Step 2: Try pattern matching
  let bestMatch = { intent: 'unknown', score: 0, keyword: null };
  
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    const { score, matchedKeyword } = calculateMatchScore(query, patterns);
    if (score > bestMatch.score) {
      bestMatch = { intent, score, keyword: matchedKeyword };
    }
  }
  
  // Step 3: If pattern match is confident enough, use it
  if (bestMatch.score >= 0.7) {
    return {
      intent: bestMatch.intent,
      confidence: bestMatch.score,
      needsClarification: false,
      matchedKeyword: bestMatch.keyword,
      originalQuery: query
    };
  }
  
  // Step 4: For low confidence, try Gemini
  if (bestMatch.score < 0.5 && process.env.GEMINI_API_KEY) {
    const geminiResult = await analyzeWithGemini(query, context);
    if (geminiResult && geminiResult.confidence > 0.6) {
      return {
        intent: geminiResult.intent,
        confidence: geminiResult.confidence,
        needsClarification: geminiResult.needs_clarification,
        entities: geminiResult.entities,
        suggestedQuery: geminiResult.suggested_query,
        source: 'gemini',
        originalQuery: query
      };
    }
  }
  
  // Step 5: Return best pattern match even if low confidence
  if (bestMatch.score > 0) {
    return {
      intent: bestMatch.intent,
      confidence: bestMatch.score,
      needsClarification: bestMatch.score < 0.5,
      matchedKeyword: bestMatch.keyword,
      originalQuery: query
    };
  }
  
  // Step 6: Unknown intent
  return {
    intent: 'unknown',
    confidence: 0,
    needsClarification: true,
    originalQuery: query
  };
};

// Generate clarifying question response
export const generateClarifyingResponse = (clarification, originalQuery) => {
  return {
    message: `🤔 ${clarification.question}`,
    ui_component: "clarification_options",
    ui_data: {
      originalQuery,
      options: clarification.options
    },
    suggestions: clarification.options.map(o => o.label),
    confidence: { level: 'high', reason: 'Asking for clarification to better assist you' },
    needsClarification: true
  };
};

export { CLARIFYING_QUESTIONS, INTENT_PATTERNS };
