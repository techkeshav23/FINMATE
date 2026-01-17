/**
 * Chat Routes - Main chat endpoint and route handlers
 * 
 * This is a SLIM route file that delegates to service modules:
 * - analysisService.js: Spending analysis, category breakdown, summaries
 * - settlementService.js: Settlement calculations and confirmations
 * - simulationService.js: What-if scenarios and projections
 * - anomalyService.js: Anomaly detection and change tracking
 * - decisionService.js: Decision guides and recommendations
 * - insightsService.js: Proactive insights and welcome messages
 */

import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Config
import { generatePromptWithData, detectPersonaFromData } from '../config/systemPrompt.js';

// AI services
import { generateThesysResponse } from '../services/ai/thesys.js';
import { generateDynamicUI } from '../services/ai/thesysGenUI.js';
import { detectIntent, generateClarifyingResponse } from '../services/ai/nlpEngine.js';

// Parser services
import { detectAnomalies, generateComparison } from '../services/parsers/statementParser.js';

// Memory services
import { 
  learnFromTransactions, 
  detectAnomaliesWithLearning, 
  getJustification,
  recordAnomaly,
  recordSettlement,
  loadPatterns
} from '../services/memory/patternLearning.js';

import {
  extractEntities,
  resolveContext,
  updateContext,
  getContextSummary,
  clearContext,
  needsContextResolution,
  setParticipantPatterns
} from '../services/memory/conversationMemory.js';

// Analysis services
import {
  buildHonestConfidence,
  generateReasoningSteps,
  addConfidence,
  generateSpendingAnalysis,
  generateCategoryBreakdown,
  generateUnpaidBills,
  generateSummary,
  generateTimeline,
  generateFilteredList
} from '../services/analysis/analysisService.js';

import {
  generateSimulation,
  generateSimulationWithSlider,
  generateScenarioSimulation,
  generateBudgetGoalSimulation,
  generateCategoryWiseSimulation,
  generateTripBudgetSimulation
} from '../services/analysis/simulationService.js';

import {
  detectChanges,
  generateAnomalyResponse,
  generateAnomalyResponseWithLearning,
  generateCategoryComparison,
  markAnomalyAsExpected
} from '../services/analysis/anomalyService.js';

import {
  generateDecisionGuide,
  generateDecisionGuideWithJustification,
  generateSavingsAdvice
} from '../services/analysis/decisionService.js';

import {
  generateProactiveInsights,
  generateWelcomeMessage,
  generateDailyDigest,
  generateSmartSuggestions
} from '../services/analysis/insightsService.js';

import {
  generateSettlementAnalysis,
  generateSettlementAnalysisWithJustification,
  generateSettlementConfirmed,
  generateSettlementReminder,
  generateSettlementHistory
} from '../services/analysis/settlementService.js';

const router = express.Router();

// ==================== STATE MANAGEMENT ====================
let chatHistory = [];
let pendingClarification = null;
let pendingSettlementConfirmation = null;

// ==================== AI RESPONSE STRATEGY ====================
/**
 * Generate AI response using the following cascade:
 * 1. Thesys GenUI -> 2. Thesys -> 3. Gemini -> 4. Local Rule-Based
 */
const generateAIResponse = async (userMessage, data) => {
  // Handle settlement confirmation flow
  if (pendingSettlementConfirmation) {
    const response = handleSettlementConfirmation(userMessage, data);
    if (response) return response;
  }
  
  // Handle clarification responses
  if (pendingClarification) {
    userMessage = handleClarificationResponse(userMessage);
  }
  
  // Extract entities and resolve context
  const entities = extractEntities(userMessage);
  
  // Check for empty data state
  const hasData = data?.transactions?.length > 0;
  const isGeneralQuery = /hi|hello|hey|help|upload|import|start/i.test(userMessage);
  
  if (!hasData && !isGeneralQuery) {
    return {
      message: "I don't see any transaction data yet. To give you accurate financial insights, I need real data.\n\n**Please upload a Bank Statement (PDF) or CSV file to get started.**",
      ui_component: "upload_prompt",
      ui_data: null,
      suggestions: ["How do I upload?", "Use sample data"]
    };
  }
  
  // Resolve context for follow-up questions
  if (needsContextResolution(userMessage)) {
    const contextResolution = resolveContext(userMessage, entities);
    if (contextResolution.usedContext) {
      console.log(`Context resolved: ${contextResolution.contextUsed.join(', ')}`);
      userMessage = contextResolution.resolvedMessage;
    }
  }
  
  // NLP intent detection
  const intentResult = await detectIntent(userMessage, data);
  
  // Handle clarification requests
  if (intentResult.needsClarification && intentResult.clarification) {
    pendingClarification = intentResult.clarification;
    return generateClarifyingResponse(intentResult.clarification, userMessage);
  }
  
  // Try Thesys GenUI
  try {
    console.log('🎨 Attempting Thesys GenUI...');
    const contextSummary = getContextSummary();
    const genUIResult = await generateDynamicUI(userMessage, data, contextSummary);
    
    updateContext(intentResult.intent, entities, genUIResult, userMessage);
    
    return {
      message: genUIResult.message,
      ui_component: 'thesys_genui',
      ui_data: { generated_ui: genUIResult.generated_ui, source: genUIResult._source || 'thesys' },
      suggestions: genUIResult.suggestions,
      confidence: genUIResult.confidence,
      reasoning: genUIResult.reasoning
    };
  } catch (error) {
    console.warn('GenUI failed, falling back...', error.message);
  }
  
  // Try legacy Thesys API
  if (process.env.THESYS_API_KEY) {
    try {
      console.log('Attempting legacy Thesys API...');
      const contextSummary = getContextSummary();
      const thesysResult = await generateThesysResponse(userMessage, data, contextSummary);
      updateContext(intentResult.intent, entities, thesysResult, userMessage);
      return thesysResult;
    } catch (error) {
      console.warn('Thesys API failed, falling back to Gemini...');
    }
  }
  
  // Try Gemini API
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-lite",
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const systemPrompt = generatePromptWithData(data);
      const contextSummary = getContextSummary();
      const prompt = `${systemPrompt}\n\nConversation Context: ${contextSummary}\n\nUser Question: ${userMessage}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const parsedResponse = JSON.parse(response.text());
      
      updateContext(intentResult.intent, entities, parsedResponse, userMessage);
      return parsedResponse;
    } catch (error) {
      console.error("Gemini API Error:", error);
    }
  }
  
  // Fallback to local logic
  const localResponse = generateLocalResponse(userMessage, data, intentResult, entities);
  updateContext(intentResult.intent, entities, localResponse, userMessage);
  return localResponse;
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Handle settlement confirmation flow
 */
const handleSettlementConfirmation = (userMessage, data) => {
  const confirmation = pendingSettlementConfirmation;
  const lowerMsg = userMessage.toLowerCase();
  
  if (lowerMsg.includes('yes') || lowerMsg.includes('confirm') || lowerMsg.includes('proceed') || lowerMsg.includes('do it')) {
    pendingSettlementConfirmation = null;
    return generateSettlementConfirmed(data, confirmation, saveTransactionData);
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
  
  // Unclear response
  return {
    message: "I didn't quite catch that. Do you want to proceed with the settlement?\n\nPlease say **Yes** to confirm or **No** to cancel.",
    ui_component: null,
    ui_data: null,
    suggestions: ["Yes, settle now", "No, cancel"],
    confidence: { level: 'high', reason: 'Awaiting confirmation' }
  };
};

/**
 * Handle clarification response flow
 */
const handleClarificationResponse = (userMessage) => {
  const clarification = pendingClarification;
  pendingClarification = null;
  
  const matchedOption = clarification.options.find(opt => 
    userMessage.toLowerCase().includes(opt.label.toLowerCase()) ||
    opt.label.toLowerCase().includes(userMessage.toLowerCase())
  );
  
  return matchedOption ? matchedOption.query : userMessage;
};

/**
 * Save transaction data callback
 */
const saveTransactionData = (data) => {
  // This would write to the data file - implement based on your data layer
  console.log('Saving transaction data...', data.transactions?.length, 'transactions');
};

/**
 * Generate local rule-based response using service modules
 */
const generateLocalResponse = (userMessage, data, intentResult = null, entities = null) => {
  const lowerMessage = userMessage.toLowerCase();
  
  // Use NLP intent if available
  if (intentResult?.intent && intentResult.confidence > 0.5) {
    switch (intentResult.intent) {
      case 'spending_analysis':
      case 'spending_by_person':
        return addConfidence(generateSpendingAnalysis(data), 'high', null, data, 'spending');
        
      case 'spending_by_category':
      case 'category_breakdown':
        return addConfidence(generateCategoryBreakdown(data), 'high', null, data, 'category');
        
      case 'settlement':
        return addConfidence(generateSettlementAnalysisWithJustification(data), 'high', null, data, 'settlement');
        
      case 'unpaid_bills':
        return addConfidence(generateUnpaidBills(data), 'high', null, data, 'spending');
        
      case 'timeline':
      case 'spending_timeline':
        return addConfidence(generateTimeline(data), 'high', null, data, 'spending');
        
      case 'comparison':
        return addConfidence(detectChanges(data), 'medium', null, data, 'comparison');
        
      case 'anomaly':
        return addConfidence(generateAnomalyResponseWithLearning(data), 'medium', null, data, 'anomaly');
        
      case 'simulation':
      case 'simulation_budget':
        return addConfidence(generateSimulationWithSlider(data), 'medium', null, data, 'simulation');
        
      case 'decision':
        return addConfidence(generateDecisionGuideWithJustification(data), 'medium', null, data, 'spending');
    }
    
    // Handle filter intents
    if (intentResult.intent.startsWith('filter_')) {
      const category = intentResult.intent.replace('filter_', '');
      return addConfidence(generateFilteredList(data, category), 'high', null, data, 'category');
    }
  }
  
  // Keyword-based fallback
  if (lowerMessage.includes('who spent') || lowerMessage.includes('spending')) {
    return addConfidence(generateSpendingAnalysis(data), 'high', null, data, 'spending');
  }
  
  if (lowerMessage.includes('owe') || lowerMessage.includes('debt') || lowerMessage.includes('settle')) {
    const response = generateSettlementAnalysis(data);
    if (response.requiresConfirmation) {
      pendingSettlementConfirmation = response.settlementData;
    }
    return addConfidence(response, 'high', null, data, 'settlement');
  }
  
  if (lowerMessage.includes('category') || lowerMessage.includes('breakdown')) {
    return addConfidence(generateCategoryBreakdown(data), 'high', null, data, 'category');
  }
  
  if (lowerMessage.includes('unpaid') || lowerMessage.includes('pending') || lowerMessage.includes('unsettled')) {
    return addConfidence(generateUnpaidBills(data), 'high');
  }
  
  if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
    return addConfidence(generateSummary(data), 'high');
  }
  
  if (lowerMessage.includes('timeline') || lowerMessage.includes('trend') || lowerMessage.includes('over time') || lowerMessage.includes('history')) {
    return addConfidence(generateTimeline(data), 'high');
  }
  
  if (lowerMessage.includes('compare') || lowerMessage.includes('versus') || lowerMessage.includes(' vs ') || lowerMessage.includes('difference')) {
    return addConfidence(detectChanges(data), 'medium', 'Comparison based on available periods');
  }
  
  if (lowerMessage.includes('unusual') || lowerMessage.includes('anomal') || lowerMessage.includes('weird') || lowerMessage.includes('strange')) {
    return addConfidence(generateAnomalyResponse(data), 'medium', 'Based on statistical analysis');
  }
  
  if (lowerMessage.includes('what should') || lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('next step')) {
    return addConfidence(generateDecisionGuide(data), 'medium', 'Recommendations based on current state');
  }
  
  if (lowerMessage.includes('what if') || lowerMessage.includes('simulate') || lowerMessage.includes('plan') || lowerMessage.includes('budget') || lowerMessage.includes('project')) {
    return addConfidence(generateSimulation(data), 'medium', 'Projection based on assumptions');
  }
  
  // Category filter
  const categories = ['food', 'grocery', 'groceries', 'utilities', 'bills', 'rent', 'entertainment', 'household'];
  const foundCategory = categories.find(c => lowerMessage.includes(c));
  
  if (foundCategory && (lowerMessage.includes('show') || lowerMessage.includes('list') || lowerMessage.includes('transactions'))) {
    let targetCategory = foundCategory.charAt(0).toUpperCase() + foundCategory.slice(1);
    if (foundCategory === 'grocery') targetCategory = 'Groceries';
    if (foundCategory === 'bills') targetCategory = 'Utilities';
    return addConfidence(generateFilteredList(data, targetCategory), 'high');
  }
  
  // Default welcome response
  return generateWelcomeMessage(data);
};

// ==================== ROUTE HANDLERS ====================

/**
 * POST /api/chat - Send a message
 */
router.post('/', async (req, res) => {
  try {
    // Initialize patterns on first request
    if (!global.patternsInitialized) {
      const participants = req.transactions?.config?.participants || [];
      learnFromTransactions(req.transactions.transactions, participants);
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

/**
 * GET /api/chat/history - Get chat history
 */
router.get('/history', (req, res) => {
  res.json(chatHistory);
});

/**
 * DELETE /api/chat/history - Clear chat history
 */
router.delete('/history', (req, res) => {
  chatHistory = [];
  clearContext();
  pendingClarification = null;
  pendingSettlementConfirmation = null;
  res.json({ message: 'Chat history cleared' });
});

/**
 * POST /api/chat/new - Start a new chat session
 */
router.post('/new', (req, res) => {
  try {
    chatHistory = [];
    clearContext();
    pendingClarification = null;
    pendingSettlementConfirmation = null;
    
    const insights = generateProactiveInsights(req.transactions);
    
    res.json({ 
      message: 'New chat started',
      welcome: insights
    });
  } catch (error) {
    console.error('New chat error:', error);
    res.status(500).json({ error: 'Failed to start new chat' });
  }
});

/**
 * GET /api/chat/insights - Get proactive insights on app load
 */
router.get('/insights', (req, res) => {
  try {
    const transactions = req.transactions?.transactions || [];
    const hasData = transactions.length > 0;
    
    if (!hasData) {
      // No transaction data - return flag so frontend shows welcome page
      return res.json({ 
        hasData: false,
        message: null,
        ui_component: null,
        ui_data: null,
        suggestions: []
      });
    }
    
    // Has data - generate proactive insights
    const welcome = generateWelcomeMessage(req.transactions);
    res.json({ ...welcome, hasData: true });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

/**
 * GET /api/chat/what-changed - Compare recent vs previous period
 * PS Requirement: "ask 'what changed?'"
 */
router.get('/what-changed', (req, res) => {
  try {
    const comparison = detectChanges(req.transactions);
    res.json(comparison);
  } catch (error) {
    console.error('What changed error:', error);
    res.status(500).json({ error: 'Failed to analyze changes' });
  }
});

/**
 * GET /api/chat/anomalies - Get anomaly detection results
 * PS Requirement: "Surface insights, surprises, and risks"
 */
router.get('/anomalies', (req, res) => {
  try {
    const anomalies = generateAnomalyResponseWithLearning(req.transactions);
    res.json(anomalies);
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

/**
 * POST /api/chat/simulate - Run a what-if simulation
 * PS Requirement: "Let users compare, simulate, and explore scenarios"
 */
router.post('/simulate', (req, res) => {
  try {
    const { scenario, targetAmount, months, categoryAdjustments, type } = req.body;
    let result;
    
    if (type === 'category') {
      // Category-wise slider simulation
      result = generateCategoryWiseSimulation(req.transactions, categoryAdjustments || {});
    } else if (type === 'trip') {
      // Trip budget simulation (traveler persona)
      const { tripName, dailyBudget, days } = req.body;
      result = generateTripBudgetSimulation(req.transactions, { tripName, dailyBudget, days });
    } else if (scenario) {
      // "What if I spend 20% less?"
      result = generateScenarioSimulation(req.transactions, scenario);
    } else if (targetAmount) {
      // "How do I save ₹10000/month?"
      result = generateBudgetGoalSimulation(req.transactions, targetAmount);
    } else {
      // Default interactive slider
      result = generateSimulationWithSlider(req.transactions, { months: months || 3 });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: 'Failed to run simulation' });
  }
});

/**
 * POST /api/chat/decide - Get decision guidance
 * PS Requirement: "Helps users move from 'What is happening?' to 'What should I do?'"
 */
router.post('/decide', (req, res) => {
  try {
    const { item, amount, category, urgency } = req.body;
    
    if (item && amount) {
      const result = generateDecisionGuideWithJustification(req.transactions, { item, amount, category, urgency });
      res.json(result);
    } else {
      // General decision guide
      const result = generateDecisionGuide(req.transactions);
      res.json(result);
    }
  } catch (error) {
    console.error('Decision guide error:', error);
    res.status(500).json({ error: 'Failed to generate decision guide' });
  }
});

/**
 * POST /api/chat/save-goal - Save a savings goal
 * PS Requirement: "End conversations with clarity and agency"
 */
router.post('/save-goal', (req, res) => {
  try {
    const { targetAmount, description } = req.body;
    
    if (!targetAmount) {
      return res.status(400).json({ error: 'Target amount is required' });
    }
    
    const result = generateSavingsAdvice(req.transactions, targetAmount);
    res.json(result);
  } catch (error) {
    console.error('Save goal error:', error);
    res.status(500).json({ error: 'Failed to set savings goal' });
  }
});

export default router;
