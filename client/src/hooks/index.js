import { useState, useCallback, useRef, useEffect } from 'react';
import { chatAPI } from '../services/api';

/**
 * useChat - Custom hook for chat functionality
 * 
 * Handles:
 * - Message sending and receiving
 * - Loading states
 * - Error handling
 * - Message history
 */
export const useChat = (initialMessages = []) => {
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Send a message
  const sendMessage = useCallback(async (text, context = {}) => {
    if (!text.trim() || isLoading) return null;

    // Add user message immediately
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    setError(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await chatAPI.sendMessage(text, context);
      
      // Add assistant message
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.response || response.message || response,
        components: response.components,
        confidence: response.confidence,
        reasoning: response.reasoning,
        suggestions: response.suggestions,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      return assistantMessage;
    } catch (err) {
      if (err.name === 'AbortError') {
        return null;
      }
      const errorMessage = err.response?.data?.error || 'Failed to send message. Please try again.';
      setError(errorMessage);
      
      // Add error message
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}`,
        isError: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
      return null;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading]);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Add a message without sending to API
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...message
    }]);
  }, []);

  // Update a specific message
  const updateMessage = useCallback((id, updates) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);

  // Delete a message
  const deleteMessage = useCallback((id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    error,
    sendMessage,
    cancelRequest,
    clearMessages,
    addMessage,
    updateMessage,
    deleteMessage
  };
};

/**
 * useProactiveInsights - Fetch insights periodically
 */
export const useProactiveInsights = (enabled = true, interval = 300000) => {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInsights = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await chatAPI.getProactiveInsights();
      setInsights(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchInsights();
    
    if (enabled && interval > 0) {
      const timer = setInterval(fetchInsights, interval);
      return () => clearInterval(timer);
    }
  }, [fetchInsights, enabled, interval]);

  return { insights, isLoading, error, refresh: fetchInsights };
};

/**
 * useLocalStorage - Persist state to localStorage
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

/**
 * useDebounce - Debounce a value
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * useScrollToBottom - Auto-scroll to bottom of container
 */
export const useScrollToBottom = (dependency) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [dependency]);

  const scrollToBottom = useCallback(() => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  return { ref, scrollToBottom };
};

/**
 * useUploadedFiles - Manage uploaded files in localStorage
 * Tracks files and their associated transaction IDs for easy deletion
 */
export const useUploadedFiles = () => {
  const STORAGE_KEY = 'finmate_uploaded_files';
  
  const [files, setFiles] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage whenever files change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch (error) {
      console.warn('Failed to save uploaded files:', error);
    }
  }, [files]);

  // Add a new uploaded file
  const addFile = useCallback((fileInfo) => {
    const newFile = {
      id: `file_${Date.now()}`,
      name: fileInfo.name || 'Uploaded File',
      type: fileInfo.type || 'unknown', // csv, pdf, sms, email
      uploadedAt: new Date().toISOString(),
      transactionCount: fileInfo.transactionCount || 0,
      transactionIds: fileInfo.transactionIds || [], // IDs of transactions from this file
      totalAmount: fileInfo.totalAmount || 0
    };
    
    setFiles(prev => [newFile, ...prev]);
    return newFile;
  }, []);

  // Remove a file and return its transaction IDs for deletion
  const removeFile = useCallback((fileId) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return null;
    
    setFiles(prev => prev.filter(f => f.id !== fileId));
    return file.transactionIds;
  }, [files]);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setFiles([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get file by ID
  const getFile = useCallback((fileId) => {
    return files.find(f => f.id === fileId);
  }, [files]);

  // Update file info (e.g., after more transactions added)
  const updateFile = useCallback((fileId, updates) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, ...updates } : f
    ));
  }, []);

  return {
    files,
    addFile,
    removeFile,
    clearAllFiles,
    getFile,
    updateFile
  };
};

export default {
  useChat,
  useProactiveInsights,
  useLocalStorage,
  useDebounce,
  useScrollToBottom,
  useUploadedFiles
};
