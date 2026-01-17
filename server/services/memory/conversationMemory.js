// Conversation Memory Service
// Tracks conversation context for follow-up questions with persistence

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MEMORY_FILE = join(__dirname, '../../data/conversation_memory.json');

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

// Entity extraction patterns - Categories and timeframes are static, but person names will be loaded dynamically
// IMPORTANT: Person names should be extracted from actual transaction data, not hardcoded
let PERSON_PATTERNS = null; // Will be set dynamically based on participants
const CATEGORY_PATTERNS = /\b(food|groceries|utilities|rent|entertainment|transport|shopping|household|health|other|misc|bills|travel|flight|hotel|accommodation|taxi|fuel|medical|insurance|subscription|salary|income|investment)\b/gi;
const TIMEFRAME_PATTERNS = /\b(today|yesterday|this week|last week|this month|last month|january|february|march|april|may|june|july|august|september|october|november|december|q1|q2|q3|q4|this year|last year)\b/gi;

// Function to set person patterns dynamically from participant list (generic - works for any persona)
export const setParticipantPatterns = (participants) => {
  if (participants && participants.length > 0) {
    const names = participants.map(n => n.toLowerCase()).join('|');
    PERSON_PATTERNS = new RegExp(`\\b(${names})\\b`, 'gi');
  }
};

// Alias for backward compatibility
export const setRoommatePatterns = setParticipantPatterns;

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

  // Extract persons (only if pattern has been set from roommates)
  if (PERSON_PATTERNS) {
    const personMatches = message.match(PERSON_PATTERNS);
    if (personMatches) {
      entities.persons = [...new Set(personMatches.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))];
    }
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

    // Resolve person pronouns (he/she/they -> last person mentioned)
    if (conversationContext.lastPerson && PRONOUN_PATTERNS.person.test(message)) {
      // More robust pronoun replacement
      newMessage = newMessage.replace(/\b(he|she|they)\b/gi, conversationContext.lastPerson);
      newMessage = newMessage.replace(/\b(him|her|them)\b/gi, conversationContext.lastPerson);
      newMessage = newMessage.replace(/\b(his|her|their)\b/gi, `${conversationContext.lastPerson}'s`);
      resolved.usedContext = true;
      resolved.contextUsed.push(`person: ${conversationContext.lastPerson}`);
    }
    
    // Resolve "it/that/this" to last category or topic
    if (conversationContext.lastCategory && /\b(it|that|this)\b/gi.test(message)) {
      // Only replace if context makes sense
      if (message.toLowerCase().includes('show') || message.toLowerCase().includes('more about') || 
          message.toLowerCase().includes('details') || message.toLowerCase().includes('why')) {
        newMessage = newMessage.replace(/\b(it|that|this)\b/gi, conversationContext.lastCategory);
        resolved.usedContext = true;
        resolved.contextUsed.push(`category: ${conversationContext.lastCategory}`);
      }
    }

    // Handle "what about X" patterns
    const whatAboutMatch = message.match(/what about\s+(\w+)/i);
    if (whatAboutMatch) {
      const subject = whatAboutMatch[1];
      
      // Check if subject is a person name (only if patterns loaded)
      if (PERSON_PATTERNS && PERSON_PATTERNS.test(subject)) {
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
    
    // Handle "same for X" patterns
    const sameForMatch = message.match(/same for\s+(\w+)/i);
    if (sameForMatch && conversationContext.lastIntent) {
      resolved.contextUsed.push(`repeating intent: ${conversationContext.lastIntent} for ${sameForMatch[1]}`);
      resolved.usedContext = true;
    }

    // Handle "and" / "also" follow-ups
    if (/^(and|also)\s/i.test(message) && conversationContext.lastIntent) {
      resolved.usedContext = true;
      resolved.contextUsed.push(`continuing: ${conversationContext.lastIntent}`);
    }
    
    // Handle timeframe carry-over
    if (conversationContext.lastTimeframe && !entities.timeframes?.length) {
      // If user asks about something without specifying time, use last timeframe
      resolved.contextUsed.push(`timeframe: ${conversationContext.lastTimeframe}`);
    }

    resolved.resolvedMessage = newMessage;
  }

  return resolved;
};

// Update context after processing a message
export const updateContext = (intent, entities, result, userMessage) => {
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
  
  // Add to conversation history (keep last 10 turns)
  conversationContext.conversationHistory = conversationContext.conversationHistory || [];
  
  // Clean AI response text (remove UI jargon if possible)
  const aiText = result && result.message ? result.message : "Shown a chart";
  
  if (userMessage) {
    conversationContext.conversationHistory.unshift({
      user: userMessage,
      assistant: aiText,
      intent,
      timestamp: new Date().toISOString()
    });
  }

  if (conversationContext.conversationHistory.length > 10) {
    conversationContext.conversationHistory = conversationContext.conversationHistory.slice(0, 10);
  }
  
  // Save to disk for persistence
  saveMemory(conversationContext);
};

// Get current context for prompts
export const getContextSummary = () => {
  const context = [];
  
  // 1. Add Summary Metadata
  if (conversationContext.lastPerson) {
    context.push(`Last person mentioned: ${conversationContext.lastPerson}`);
  }
  if (conversationContext.lastCategory) {
    context.push(`Last category: ${conversationContext.lastCategory}`);
  }
  
  // 2. Add Actual Conversation Transcript (CRITICAL for "Chat Mode")
  if (conversationContext.conversationHistory && conversationContext.conversationHistory.length > 0) {
    const transcript = conversationContext.conversationHistory
      .slice(0, 5) // Last 5 turns
      .reverse() // As chronological order
      .map(entry => `User: ${entry.user}\nAI: ${entry.assistant}`)
      .join('\n\n');
      
    context.push(`\n=== RECENT CONVERSATION HISTORY ===\n${transcript}\n===================================`);
  }

  return context.length > 0 ? context.join('\n') : 'No prior context.';
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
  setParticipantPatterns,
  setRoommatePatterns, // Backward compatibility
  getContext,
  needsContextResolution
};
