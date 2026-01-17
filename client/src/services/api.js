import axios from 'axios';

// Use environment variable for API URL, fallback to relative path for proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Chat API
export const chatAPI = {
  sendMessage: async (message) => {
    const response = await api.post('/chat', { message });
    return response.data;
  },
  
  getHistory: async () => {
    const response = await api.get('/chat/history');
    return response.data;
  },
  
  clearHistory: async () => {
    const response = await api.delete('/chat/history');
    return response.data;
  },

  getProactiveInsights: async () => {
    const response = await api.get('/chat/insights');
    return response.data;
  },
};

// Transactions API
export const transactionsAPI = {
  getAll: async () => {
    const response = await api.get('/transactions');
    return response.data;
  },
  
  updateStatus: async (id, settled) => {
    const response = await api.patch(`/transactions/${id}`, { settled });
    return response.data;
  },

  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/transactions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  parseStatement: async (file, sourceType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceType', sourceType);
    const response = await api.post('/transactions/parse-statement', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  parseText: async (text, sourceType) => {
    const response = await api.post('/transactions/parse-text', { text, sourceType });
    return response.data;
  },

  confirmImport: async (transactions) => {
    const response = await api.post('/transactions/confirm-import', { transactions });
    return response.data;
  },
};

// Health Check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
