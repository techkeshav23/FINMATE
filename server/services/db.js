import { LocalStorage } from 'node-localstorage';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// User-specific storage instances cache
const userStorageCache = {};

// Get or create user-specific localStorage instance
const getUserStorage = (userId) => {
  if (!userId) {
    // Fallback to default storage (for backward compatibility)
    userId = 'default';
  }
  
  if (!userStorageCache[userId]) {
    const userDataDir = path.join(dataDir, 'users', userId);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    userStorageCache[userId] = new LocalStorage(userDataDir);
  }
  
  return userStorageCache[userId];
};

// Current user context (set per request via middleware)
let currentUserId = null;

// DB Wrapper to mimic SQL-like operations with simpler JSON
const db = {
  // Set current user for this request
  setCurrentUser: (userId) => {
    currentUserId = userId;
  },

  // Get current user ID
  getCurrentUser: () => currentUserId,

  // Helper to get collection (now user-scoped)
  getCollection: (name) => {
    const storage = getUserStorage(currentUserId);
    const data = storage.getItem(name);
    return data ? JSON.parse(data) : [];
  },

  // Helper to save collection (now user-scoped)
  saveCollection: (name, data) => {
    const storage = getUserStorage(currentUserId);
    storage.setItem(name, JSON.stringify(data));
  },

  // --- Transaction Methods ---
  
  getTransactions: (filters = {}) => {
    let txns = db.getCollection('transactions');
    
    // Sort Date DESC
    txns.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Simple Filtering
    if (filters.limit) txns = txns.slice(0, filters.limit);
    // Keyword search simulation for RAG
    if (filters.search) {
        const lowerSearch = filters.search.toLowerCase();
        txns = txns.filter(t => 
            (t.description && t.description.toLowerCase().includes(lowerSearch)) || 
            (t.category && t.category.toLowerCase().includes(lowerSearch)) ||
            (filters.type && t.type === filters.type)
        );
    }

    return txns;
  },
  
  addTransaction: (txn) => {
    const txns = db.getCollection('transactions');
    txns.push(txn);
    db.saveCollection('transactions', txns);
    return txn;
  },

  addTransactions: (newTxns) => {
      const txns = db.getCollection('transactions');
      const updated = [...txns, ...newTxns];
      db.saveCollection('transactions', updated);
  },

  clearTransactions: () => {
      db.saveCollection('transactions', []);
  },

  // --- Chat Sessions Methods ---

  // Get all chat sessions (for sidebar)
  getSessions: () => {
    const sessions = db.getCollection('chat_sessions');
    // Sort by updatedAt DESC (most recent first)
    return sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  // Get a single session by ID
  getSession: (sessionId) => {
    const sessions = db.getCollection('chat_sessions');
    return sessions.find(s => s.id === sessionId) || null;
  },

  // Create a new chat session
  createSession: (title = 'New Chat') => {
    const sessions = db.getCollection('chat_sessions');
    const newSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.substring(0, 50),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    sessions.push(newSession);
    db.saveCollection('chat_sessions', sessions);
    return newSession;
  },

  // Add message to a session
  addMessageToSession: (sessionId, msg) => {
    const sessions = db.getCollection('chat_sessions');
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) return null;
    
    const message = {
      id: `msg_${Date.now()}`,
      ...msg,
      timestamp: new Date().toISOString()
    };
    
    sessions[sessionIndex].messages.push(message);
    sessions[sessionIndex].updatedAt = new Date().toISOString();
    
    // Update title from first user message if it's "New Chat"
    if (sessions[sessionIndex].title === 'New Chat' && msg.role === 'user') {
      sessions[sessionIndex].title = (msg.content || 'New Chat').substring(0, 40);
    }
    
    db.saveCollection('chat_sessions', sessions);
    return message;
  },

  // Delete a session
  deleteSession: (sessionId) => {
    const sessions = db.getCollection('chat_sessions');
    const filtered = sessions.filter(s => s.id !== sessionId);
    db.saveCollection('chat_sessions', filtered);
    return true;
  },

  // Clear all sessions
  clearAllSessions: () => {
    db.saveCollection('chat_sessions', []);
  },

  // Legacy methods for backward compatibility
  getHistory: () => {
    // Return messages from most recent session or empty
    const sessions = db.getSessions();
    if (sessions.length > 0) {
      return sessions[0].messages || [];
    }
    return [];
  },

  addMessage: (msg) => {
    // Add to most recent session or create new
    let sessions = db.getSessions();
    if (sessions.length === 0) {
      db.createSession('New Chat');
      sessions = db.getSessions();
    }
    return db.addMessageToSession(sessions[0].id, msg);
  },

  clearHistory: () => {
    db.clearAllSessions();
  },

  // --- Analysis Helpers ---
  
  getStats: () => {
    const txns = db.getCollection('transactions');
    return txns.reduce((acc, t) => {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'credit') acc.total_income += amt;
        if (t.type === 'debit') acc.total_expense += amt;
        return acc;
    }, { total_income: 0, total_expense: 0 });
  },

  // Fix #5: Category breakdown for pie charts
  getCategoryBreakdown: () => {
    const txns = db.getCollection('transactions');
    const breakdown = {};
    txns.filter(t => t.type === 'debit').forEach(t => {
      const cat = t.category || 'Other';
      breakdown[cat] = (breakdown[cat] || 0) + parseFloat(t.amount || 0);
    });
    // Convert to array format for charts - include both name/category and value/amount for compatibility
    return Object.entries(breakdown)
      .map(([name, value]) => ({ 
        name, 
        category: name,  // Alias for Thesys components
        value: Math.round(value),
        amount: Math.round(value)  // Alias for our components
      }))
      .sort((a, b) => b.value - a.value);  // Sort by value descending
  },

  // Fix #3: Anomaly detection - transactions significantly above average
  getAnomalies: () => {
    const txns = db.getCollection('transactions');
    const debits = txns.filter(t => t.type === 'debit');
    if (debits.length < 3) return []; // Need enough data
    
    const avgExpense = debits.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) / debits.length;
    const threshold = avgExpense * 1.5; // 50% above average is anomaly
    
    return debits
      .filter(t => parseFloat(t.amount) > threshold)
      .map(t => ({
        ...t,
        reason: `This ${t.category || 'expense'} of ₹${t.amount} is ${Math.round((t.amount / avgExpense - 1) * 100)}% above your average expense of ₹${Math.round(avgExpense)}`
      }));
  },

  // Fix #4: Week-over-week comparison
  getWeekComparison: () => {
    const txns = db.getCollection('transactions');
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    
    const thisWeek = { income: 0, expense: 0 };
    const lastWeek = { income: 0, expense: 0 };
    
    txns.forEach(t => {
      const txnDate = new Date(t.date);
      const amt = parseFloat(t.amount) || 0;
      
      if (txnDate >= oneWeekAgo) {
        if (t.type === 'credit') thisWeek.income += amt;
        if (t.type === 'debit') thisWeek.expense += amt;
      } else if (txnDate >= twoWeeksAgo) {
        if (t.type === 'credit') lastWeek.income += amt;
        if (t.type === 'debit') lastWeek.expense += amt;
      }
    });
    
    const incomeChange = lastWeek.income > 0 ? Math.round((thisWeek.income - lastWeek.income) / lastWeek.income * 100) : 0;
    const expenseChange = lastWeek.expense > 0 ? Math.round((thisWeek.expense - lastWeek.expense) / lastWeek.expense * 100) : 0;
    
    return {
      thisWeek,
      lastWeek,
      changes: {
        income: { percent: incomeChange, direction: incomeChange >= 0 ? 'up' : 'down' },
        expense: { percent: expenseChange, direction: expenseChange >= 0 ? 'up' : 'down' }
      }
    };
  },

  // Timeline data for line charts (daily spending trend)
  getTimelineData: (days = 7) => {
    const txns = db.getCollection('transactions');
    const now = new Date();
    const timeline = {};
    
    // Initialize timeline with zeros for last N days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      timeline[dateKey] = { date: dateKey, income: 0, expense: 0, count: 0 };
    }
    
    // Populate with actual data
    txns.forEach(t => {
      const dateKey = t.date?.split('T')[0];
      if (timeline[dateKey]) {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'credit') timeline[dateKey].income += amt;
        if (t.type === 'debit') timeline[dateKey].expense += amt;
        timeline[dateKey].count++;
      }
    });
    
    // Convert to array and add net amount
    return Object.values(timeline).map(day => ({
      ...day,
      amount: day.income - day.expense,
      total: day.income + day.expense
    }));
  },

  // Get top spending categories
  getTopCategories: (limit = 5) => {
    const breakdown = db.getCategoryBreakdown();
    return breakdown
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }
};

// No mock data - users should upload their own CSV
// Sample data files available in /sample-data folder

export default db;
