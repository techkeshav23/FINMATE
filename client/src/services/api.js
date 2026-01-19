import axios from 'axios';

/**
 * FinMate API Service Layer
 * 
 * PS.md Alignment:
 * - Clean API abstraction for small business
 * - Supports CREDIT/DEBIT tracking
 * - P&L and business insights
 * 
 * Endpoints organized by:
 * - chatAPI: Chat interactions and insights
 * - transactionsAPI: Transaction data management
 * - analysisAPI: Dedicated analysis endpoints
 */

// Use environment variable for API URL, fallback to relative path for proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Chat API - Core conversation functionality
 */
export const chatAPI = {
  /**
   * Send a message and get AI response
   * @param {string} message - User's message
   * @param {object} context - Optional context (persona, sessionId)
   */
  sendMessage: async (message, context = {}) => {
    const response = await api.post('/chat', { message, ...context });
    return response.data;
  },
  
  /**
   * Get all chat sessions for sidebar
   */
  getSessions: async () => {
    const response = await api.get('/chat/sessions');
    return response.data;
  },

  /**
   * Get a specific session with all messages
   * @param {string} sessionId - Session ID
   */
  getSession: async (sessionId) => {
    const response = await api.get(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Create a new chat session
   * @param {string} title - Optional title
   */
  createSession: async (title) => {
    const response = await api.post('/chat/sessions', { title });
    return response.data;
  },

  /**
   * Delete a chat session
   * @param {string} sessionId - Session ID
   */
  deleteSession: async (sessionId) => {
    const response = await api.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Get chat history (legacy - returns current session)
   */
  getHistory: async () => {
    const response = await api.get('/chat/history');
    return response.data;
  },
  
  /**
   * Clear all chat history
   */
  clearHistory: async () => {
    const response = await api.delete('/chat/history');
    return response.data;
  },
  
  /**
   * Start a new chat session
   */
  startNewChat: async () => {
    const response = await api.post('/chat/new');
    return response.data;
  },

  /**
   * Get proactive insights based on current data
   * PS: "Surface insights, surprises, and risks"
   */
  getProactiveInsights: async () => {
    const response = await api.get('/chat/insights');
    return response.data;
  },

  /**
   * Get detected changes ("What changed this month?")
   * PS: Timeline for spend changes
   */
  getWhatChanged: async (timeframe = 'month') => {
    const response = await api.get('/chat/what-changed', {
      params: { timeframe }
    });
    return response.data;
  },

  /**
   * Get anomalies detected in spending
   * PS: "Spots unusual patterns"
   */
  getAnomalies: async () => {
    const response = await api.get('/chat/anomalies');
    return response.data;
  },

  /**
   * Run a budget simulation
   * PS: "What if I cut X by Y%?"
   * @param {object} adjustments - Category adjustments { categoryName: percentChange }
   */
  runSimulation: async (adjustments) => {
    const response = await api.post('/chat/simulate', { adjustments });
    return response.data;
  },

  /**
   * Get decision guidance for a purchase
   * PS: "Should I buy this?"
   * @param {object} params - Decision parameters
   */
  getDecisionGuide: async (params) => {
    const response = await api.post('/chat/decide', params);
    return response.data;
  },

  /**
   * Save a financial goal
   * PS: "Help me save for X"
   * @param {object} goal - Goal details
   */
  saveGoal: async (goal) => {
    const response = await api.post('/chat/save-goal', goal);
    return response.data;
  }
};

/**
 * Transactions API - Data management
 */
export const transactionsAPI = {
  /**
   * Get all transactions
   * @param {object} filters - Optional filters (startDate, endDate, category)
   */
  getAll: async (filters = {}) => {
    const response = await api.get('/transactions', { params: filters });
    return response.data;
  },
  
  /**
   * Update transaction status
   */
  updateStatus: async (id, settled) => {
    const response = await api.patch(`/transactions/${id}`, { settled });
    return response.data;
  },

  /**
   * Upload CSV file
   * @param {File} file - CSV file to upload
   */
  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/transactions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Parse bank statement/SMS/email
   * PS: Smart transaction parsing
   * @param {File} file - File to parse
   * @param {string} sourceType - 'bank', 'sms', or 'email'
   */
  parseStatement: async (file, sourceType = 'bank') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceType', sourceType);
    const response = await api.post('/transactions/parse-statement', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Parse text content (SMS messages, etc.)
   * @param {string} text - Text to parse
   * @param {string} sourceType - Source type
   */
  parseText: async (text, sourceType = 'sms') => {
    const response = await api.post('/transactions/parse-text', { text, sourceType });
    return response.data;
  },

  /**
   * Confirm import of parsed transactions
   * @param {array} transactions - Transactions to import
   * @param {object} options - { fileName, sourceType }
   */
  confirmImport: async (transactions, options = {}) => {
    const response = await api.post('/transactions/confirm-import', { 
      transactions,
      fileName: options.fileName,
      sourceType: options.sourceType
    });
    return response.data;
  },

  /**
   * Get transaction by ID
   */
  getById: async (id) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  /**
   * Delete a transaction
   */
  delete: async (id) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },

  /**
   * Delete multiple transactions by IDs (batch delete)
   * Used when deleting a file's worth of transactions
   * @param {array} ids - Array of transaction IDs to delete
   */
  deleteBatch: async (ids) => {
    const response = await api.delete('/transactions/batch', { 
      data: { transactionIds: ids }
    });
    return response.data;
  },

  /**
   * Delete transactions by source file
   * @param {string} sourceFile - Source file name
   */
  deleteBySource: async (sourceFile) => {
    const response = await api.delete(`/transactions/by-source?sourceFile=${encodeURIComponent(sourceFile)}`);
    return response.data;
  },

  /**
   * Clear ALL transactions (requires confirmation)
   * PS: Allow fresh start
   */
  clearAll: async () => {
    const response = await api.delete('/transactions?confirm=true');
    return response.data;
  },

  /**
   * Replace ALL transactions with new data
   * PS: Overwrite existing data
   */
  replaceAll: async (transactions) => {
    const response = await api.post('/transactions/replace', { 
      transactions, 
      confirm: true 
    });
    return response.data;
  },

  /**
   * Get data statistics
   */
  getStats: async () => {
    const response = await api.get('/data/stats');
    return response.data;
  },

  /**
   * Get category breakdown
   */
  getCategoryBreakdown: async (filters = {}) => {
    const response = await api.get('/transactions/categories', { params: filters });
    return response.data;
  }
};

/**
 * Analysis API - Dedicated analysis endpoints
 */
export const analysisAPI = {
  /**
   * Get spending summary
   * @param {string} period - 'week', 'month', 'year'
   */
  getSummary: async (period = 'month') => {
    const response = await api.get('/analysis/summary', { params: { period } });
    return response.data;
  },

  /**
   * Get spending trends over time
   */
  getTrends: async (params = {}) => {
    const response = await api.get('/analysis/trends', { params });
    return response.data;
  },

  /**
   * Compare two periods
   * PS: "Comparisons for decisions"
   */
  comparePeriods: async (period1, period2) => {
    const response = await api.get('/analysis/compare', {
      params: { period1, period2 }
    });
    return response.data;
  },

  /**
   * Get budget recommendations
   */
  getBudgetRecommendations: async () => {
    const response = await api.get('/analysis/budget-recommendations');
    return response.data;
  }
};

/**
 * Health Check
 */
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Default export for convenience
export default {
  chat: chatAPI,
  transactions: transactionsAPI,
  analysis: analysisAPI,
  healthCheck
};
