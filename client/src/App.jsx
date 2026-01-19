import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout';
import ChatWindow from './components/ChatWindow';
import HowItWorks from './components/HowItWorks';
import { chatAPI, transactionsAPI } from './services/api';
import { useLocalStorage, useUploadedFiles } from './hooks';

/**
 * FinMate App - Small Business Vendor Assistant
 * 
 * Focused on: Any small vendor handling daily cash flow
 * Chat-first interface - No tabs, no complex navigation
 * 
 * PS.md Alignment:
 * - "Conversational financial co-pilot"
 * - "Reshapes itself around user's question"
 * - "Feels like a financial partner"
 */
function App() {
  // Persisted states
  const [savedMessages, setSavedMessages, clearSavedMessages] = useLocalStorage('finmate_chat_history', []);
  
  // Uploaded files management
  const { files: uploadedFiles, addFile, removeFile, clearAllFiles } = useUploadedFiles();
  
  // Chat Sessions
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // Local states
  const [messages, setMessages] = useState(savedMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [error, setError] = useState(null);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      setSavedMessages(messages);
    }
  }, [messages, setSavedMessages]);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsInitialLoading(true);
    try {
      // Load sessions list
      const sessionList = await chatAPI.getSessions();
      setSessions(sessionList);
      
      if (sessionList.length > 0) {
        // Load most recent session
        const recentSession = await chatAPI.getSession(sessionList[0].id);
        setCurrentSessionId(recentSession.id);
        setMessages(recentSession.messages || []);
      } else {
        // Create first session
        const newSession = await chatAPI.createSession('New Chat');
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
        await loadWelcomeMessage();
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      await loadWelcomeMessage();
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Load a specific session
  const loadSession = async (sessionId) => {
    setIsLoading(true);
    try {
      const session = await chatAPI.getSession(sessionId);
      setCurrentSessionId(session.id);
      setMessages(session.messages || []);
      setSidebarOpen(false);
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWelcomeMessage = async () => {
    try {
      const insights = await chatAPI.getProactiveInsights();
      if (insights && insights.hasData) {
        const insightMessage = {
          id: Date.now(),
          role: 'assistant',
          content: insights.message,
          ui_component: insights.ui_component,
          ui_data: insights.ui_data,
          suggestions: insights.suggestions,
          timestamp: new Date().toISOString(),
          isProactive: true,
        };
        setMessages([insightMessage]);
      } else {
        // No proactive insights, start with empty state
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load welcome:', err);
      setMessages([]);
    }
  };

  // Send message
  const handleSendMessage = useCallback(async (content) => {
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatAPI.sendMessage(content, { 
        persona: 'vendor',
        sessionId: currentSessionId 
      });
      setMessages(prev => [...prev, response]);
      
      // Update session title in sidebar if it was first message
      if (messages.length === 0) {
        const updatedSessions = await chatAPI.getSessions();
        setSessions(updatedSessions);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "⚠️ Could not connect to server. Please check if backend is running (port 5000).",
        timestamp: new Date().toISOString(),
        isError: true,
        suggestions: ["Try again"],
      };
      setMessages(prev => [...prev, errorMessage]);
      setError('Server connection failed');
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, messages.length]);

  // New chat
  const handleNewChat = useCallback(async () => {
    try {
      const result = await chatAPI.startNewChat();
      const newSession = result.session;
      
      // Add to sessions list
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      clearSavedMessages();
      setSidebarOpen(false);
      await loadWelcomeMessage();
    } catch (err) {
      console.error('Failed to create new chat:', err);
      setMessages([]);
      clearSavedMessages();
      await loadWelcomeMessage();
    }
  }, [clearSavedMessages]);

  // Clear all history
  const handleClearHistory = useCallback(async () => {
    try {
      await chatAPI.clearHistory();
      setSessions([]);
      setCurrentSessionId(null);
      setMessages([]);
      clearSavedMessages();
      
      // Create fresh session
      const newSession = await chatAPI.createSession('New Chat');
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
      await loadWelcomeMessage();
    } catch (err) {
      setMessages([]);
      clearSavedMessages();
    }
  }, [clearSavedMessages]);

  // Delete a specific session
  const handleDeleteSession = useCallback(async (sessionId) => {
    try {
      await chatAPI.deleteSession(sessionId);
      
      setSessions(prev => {
        const remaining = prev.filter(s => s.id !== sessionId);
        
        // If deleted current session, switch to another or create new
        if (sessionId === currentSessionId) {
          if (remaining.length > 0) {
            // Switch to first remaining session
            loadSession(remaining[0].id);
          } else {
            // Create new session
            chatAPI.createSession('New Chat').then(newSession => {
              setSessions([newSession]);
              setCurrentSessionId(newSession.id);
              setMessages([]);
            });
          }
        }
        
        return remaining;
      });
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [currentSessionId]);

  // Toggle sidebar
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Data changed (clear all)
  const handleDataChanged = useCallback(async () => {
    setMessages([]);
    clearSavedMessages();
    clearAllFiles();
    await loadInitialData();
  }, [clearSavedMessages, clearAllFiles]);

  // File uploaded
  const handleFileUploaded = useCallback((fileInfo) => {
    addFile(fileInfo);
  }, [addFile]);

  // Delete file
  const handleDeleteFile = useCallback(async (fileId) => {
    const transactionIds = removeFile(fileId);
    if (transactionIds && transactionIds.length > 0) {
      try {
        await transactionsAPI.deleteBatch(transactionIds);
        await loadInitialData();
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    }
  }, [removeFile]);

  return (
    <div className="flex flex-col lg:flex-row h-full bg-white overflow-hidden">
      {/* Sidebar - Desktop only */}
      <div className="hidden lg:block w-[260px] flex-shrink-0">
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={loadSession}
          onNewChat={handleNewChat}
          onClearHistory={handleClearHistory}
          onDeleteSession={handleDeleteSession}
          isOpen={sidebarOpen}
          onToggle={handleToggleSidebar}
          userName="Vendor"
          onDataChanged={handleDataChanged}
          uploadedFiles={uploadedFiles}
          onDeleteFile={handleDeleteFile}
        />
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Business Name Header - Mobile has hamburger */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center gap-2 safe-area-top">
          {/* Mobile Hamburger */}
          <button 
            onClick={handleToggleSidebar}
            className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-amber-100 transition-colors"
            aria-label="Menu"
          >
            <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img
            src="/logo.png"
            alt="FinMate logo"
            className="w-10 h-10 rounded-sm"
          />
          <span className="font-medium text-amber-800 text-sm sm:text-base">FinMate</span>
          
          <button 
            onClick={() => setShowHowItWorks(true)}
            className="ml-auto flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-amber-200 shadow-sm text-xs font-medium text-amber-700 hover:bg-amber-50 active:scale-95 transition-all group"
          >
            <span className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-[10px] group-hover:bg-amber-200">?</span>
            How it works
          </button>
        </div>
        
        {/* Chat Window - Takes remaining height */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            isInitialLoading={isInitialLoading}
            activePersona="vendor"
            error={error}
            onFileUploaded={handleFileUploaded}
          />
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 z-50 transition-visibility duration-300 ${
          sidebarOpen ? 'visible' : 'invisible delay-300'
        }`}
      >
        {/* Dark backdrop */}
        <div 
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ease-in-out ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)} 
        />
        {/* Sidebar panel */}
        <div 
          className={`absolute left-0 top-0 bottom-0 w-[80vw] max-w-[300px] bg-amber-50 shadow-2xl transform transition-transform duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={loadSession}
            onNewChat={handleNewChat}
            onClearHistory={handleClearHistory}
            onDeleteSession={handleDeleteSession}
            isOpen={true}
            onToggle={handleToggleSidebar}
            userName="Vendor"
            onDataChanged={handleDataChanged}
            uploadedFiles={uploadedFiles}
            onDeleteFile={handleDeleteFile}
          />
        </div>
      </div>

      {/* How It Works Modal */}
      {showHowItWorks && (
        <HowItWorks onClose={() => setShowHowItWorks(false)} />
      )}
    </div>
  );
}

export default App;
