// Conversation Memory Service
// Tracks conversation context for follow-up questions with persistence

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MEMORY_FILE = join(__dirname, '../data/conversation_memory.json');

// Default conversation context
const defaultContext = {
  lastIntent: null,
  lastEntities: {},
  lastPerson: null,
  lastCategory: null,
  lastTimeframe: null,
  lastResult: null,
  recentTopics: [],
  conversationHistory: [], // Track last 20 exchanges
  userPreferences: {}, // Learn user preferences over time
  sessionStart: new Date().toISOString(),
  totalSessions: 0,
  frequentQueries: {} // Track common questions
};

// Load or initialize conversation context
const loadMemory = () => {
  try {
    if (existsSync(MEMORY_FILE)) {
      const data = readFileSync(MEMORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading conversation memory:', error.message);
  }
  return { ...defaultContext };
};

// Save memory to disk
const saveMemory = (context) => {
  try {
    context.lastUpdated = new Date().toISOString();
    writeFileSync(MEMORY_FILE, JSON.stringify(context, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving conversation memory:', error.message);
    return false;
  }
};

// In-memory conversation context (per session) - loaded from disk
let conversationContext = loadMemory();

// Entity extraction patterns
const PERSON_PATTERNS = /\b(rahul|priya|amit|keshav|john|mary|alex|sam)\b/gi;
const CATEGORY_PATTERNS = /\b(food|groceries|utilities|rent|entertainment|transport|shopping|household|health)\b/gi;
const TIMEFRAME_PATTERNS = /\b(today|yesterday|this week|last week|this month|last month|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi;

// Pronouns that need context resolution
const PRONOUN_PATTERNS = {
  person: /\b(he|she|they|him|her|them|his|her|their)\b/gi,
  thing: /\b(it|that|this|those|these)\b/gi,
  followUp: /\b(what about|how about|and|also|same for|similar|instead|rather)\b/gi
};

// Extract entities from a message
export const extractEntities = (message) => {
  const entities = {
    persons: [],
    categories: [],
    timeframes: [],
    hasPronouns: false,
    isFollowUp: false
  };

  // Extract persons
  const personMatches = message.match(PERSON_PATTERNS);
  if (personMatches) {
    entities.persons = [...new Set(personMatches.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))];
  }

  // Extract categories
  const categoryMatches = message.match(CATEGORY_PATTERNS);
  if (categoryMatches) {
    entities.categories = [...new Set(categoryMatches.map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()))];
  }

  // Extract timeframes
  const timeframeMatches = message.match(TIMEFRAME_PATTERNS);
  if (timeframeMatches) {
    entities.timeframes = [...new Set(timeframeMatches.map(t => t.toLowerCase()))];
  }

  // Check for pronouns
  entities.hasPronouns = PRONOUN_PATTERNS.person.test(message) || PRONOUN_PATTERNS.thing.test(message);

  // Check for follow-up indicators
  entities.isFollowUp = PRONOUN_PATTERNS.followUp.test(message);

  return entities;
};

// Resolve context from previous conversation
export const resolveContext = (message, entities) => {
  const resolved = {
    originalMessage: message,
    resolvedMessage: message,
    usedContext: false,
    contextUsed: []
  };

  // If message has pronouns or is a follow-up, try to resolve
  if (entities.hasPronouns || entities.isFollowUp) {
    let newMessage = message;

    // Resolve person pronouns
    if (conversationContext.lastPerson && PRONOUN_PATTERNS.person.test(message)) {
      newMessage = newMessage.replace(PRONOUN_PATTERNS.person, conversationContext.lastPerson);
      resolved.usedContext = true;
      resolved.contextUsed.push(`person: ${conversationContext.lastPerson}`);
    }

    // Handle "what about X" patterns
    const whatAboutMatch = message.match(/what about\s+(\w+)/i);
    if (whatAboutMatch) {
      const subject = whatAboutMatch[1];
      
      // Check if subject is a person name
      if (PERSON_PATTERNS.test(subject)) {
        // Keep the new person but use last intent
        if (conversationContext.lastIntent) {
          resolved.contextUsed.push(`intent: ${conversationContext.lastIntent}`);
          resolved.usedContext = true;
        }
      }
      // Check if subject is a category
      else if (CATEGORY_PATTERNS.test(subject)) {
        if (conversationContext.lastIntent) {
          resolved.contextUsed.push(`intent: ${conversationContext.lastIntent}`);
          resolved.usedContext = true;
        }
      }
    }

    // Handle "and" / "also" follow-ups
    if (/^(and|also)\s/i.test(message) && conversationContext.lastIntent) {
      resolved.usedContext = true;
      resolved.contextUsed.push(`continuing: ${conversationContext.lastIntent}`);
    }

    resolved.resolvedMessage = newMessage;
  }

  return resolved;
};

// Update context after processing a message
export const updateContext = (intent, entities, result) => {
  // Update last intent
  if (intent && intent !== 'unknown' && intent !== 'clarify') {
    conversationContext.lastIntent = intent;
  }

  // Update last person mentioned
  if (entities.persons && entities.persons.length > 0) {
    conversationContext.lastPerson = entities.persons[0];
  }

  // Update last category
  if (entities.categories && entities.categories.length > 0) {
    conversationContext.lastCategory = entities.categories[0];
  }

  // Update last timeframe
  if (entities.timeframes && entities.timeframes.length > 0) {
    conversationContext.lastTimeframe = entities.timeframes[0];
  }

  // Store last result summary
  if (result) {
    conversationContext.lastResult = {
      type: result.ui_component,
      hasData: !!result.ui_data,
      timestamp: new Date().toISOString()
    };
  }

  // Track recent topics (last 5)
  if (intent) {
    conversationContext.recentTopics = [intent, ...conversationContext.recentTopics.slice(0, 4)];
  }

  conversationContext.lastEntities = entities;
  
  // Track frequent queries
  if (intent) {
    conversationContext.frequentQueries = conversationContext.frequentQueries || {};
    conversationContext.frequentQueries[intent] = (conversationContext.frequentQueries[intent] || 0) + 1;
  }
  
  // Add to conversation history (keep last 20)
  conversationContext.conversationHistory = conversationContext.conversationHistory || [];
  conversationContext.conversationHistory.unshift({
    intent,
    entities,
    timestamp: new Date().toISOString()
  });
  if (conversationContext.conversationHistory.length > 20) {
    conversationContext.conversationHistory = conversationContext.conversationHistory.slice(0, 20);
  }
  
  // Save to disk for persistence
  saveMemory(conversationContext);
};

// Get current context for prompts
export const getContextSummary = () => {
  const context = [];

  if (conversationContext.lastPerson) {
    context.push(`Last person mentioned: ${conversationContext.lastPerson}`);
  }
  if (conversationContext.lastCategory) {
    context.push(`Last category: ${conversationContext.lastCategory}`);
  }
  if (conversationContext.lastIntent) {
    context.push(`Last question type: ${conversationContext.lastIntent}`);
  }
  if (conversationContext.recentTopics.length > 0) {
    context.push(`Recent topics: ${conversationContext.recentTopics.join(', ')}`);
  }
  
  // Add frequent query insight
  if (conversationContext.frequentQueries) {
    const topQuery = Object.entries(conversationContext.frequentQueries)
      .sort((a, b) => b[1] - a[1])[0];
    if (topQuery && topQuery[1] > 2) {
      context.push(`User frequently asks about: ${topQuery[0]}`);
    }
  }

  return context.length > 0 ? context.join('. ') : 'No prior context.';
};

// Get user preferences based on history
export const getUserPreferences = () => {
  const prefs = {
    frequentTopics: [],
    preferredPerson: null,
    preferredCategory: null
  };
  
  if (conversationContext.frequentQueries) {
    prefs.frequentTopics = Object.entries(conversationContext.frequentQueries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);
  }
  
  // Analyze conversation history for preferences
  if (conversationContext.conversationHistory) {
    const persons = {};
    const categories = {};
    
    conversationContext.conversationHistory.forEach(entry => {
      if (entry.entities?.persons) {
        entry.entities.persons.forEach(p => {
          persons[p] = (persons[p] || 0) + 1;
        });
      }
      if (entry.entities?.categories) {
        entry.entities.categories.forEach(c => {
          categories[c] = (categories[c] || 0) + 1;
        });
      }
    });
    
    const topPerson = Object.entries(persons).sort((a, b) => b[1] - a[1])[0];
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    
    if (topPerson) prefs.preferredPerson = topPerson[0];
    if (topCategory) prefs.preferredCategory = topCategory[0];
  }
  
  return prefs;
};

// Clear context (for new chat) - preserves some learning
export const clearContext = () => {
  const oldFrequentQueries = conversationContext.frequentQueries || {};
  const oldTotalSessions = (conversationContext.totalSessions || 0) + 1;
  const oldUserPreferences = conversationContext.userPreferences || {};
  
  conversationContext = {
    lastIntent: null,
    lastEntities: {},
    lastPerson: null,
    lastCategory: null,
    lastTimeframe: null,
    lastResult: null,
    recentTopics: [],
    conversationHistory: [],
    frequentQueries: oldFrequentQueries, // Preserve learning
    userPreferences: oldUserPreferences, // Preserve preferences
    totalSessions: oldTotalSessions,
    sessionStart: new Date().toISOString()
  };
  
  saveMemory(conversationContext);
};

// Get full context object
export const getContext = () => ({ ...conversationContext });

// Check if a follow-up question needs context
export const needsContextResolution = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Short messages that start with conjunctions
  if (/^(and|also|but|what about|how about|same for|instead)\s/i.test(message)) {
    return true;
  }
  
  // Messages with pronouns
  if (PRONOUN_PATTERNS.person.test(message) || PRONOUN_PATTERNS.thing.test(message)) {
    return true;
  }
  
  // Very short questions
  if (message.split(' ').length <= 3 && message.includes('?')) {
    return true;
  }
  
  // "specifically" / "in particular"
  if (/specifically|in particular|particular/.test(lowerMessage)) {
    return true;
  }
  
  return false;
};

export default {
  extractEntities,
  resolveContext,
  updateContext,
  getContextSummary,
  clearContext,
  getContext,
  needsContextResolution
};
