import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/layout';
import ChatWindow from './components/ChatWindow';
import { chatAPI, transactionsAPI } from './services/api';
import { useLocalStorage, useUploadedFiles } from './hooks';
import { BottomNav } from './components/mobile';
import { HomeTab, UploadTab, ProfileTab } from './components/pages';

/**
 * FinMate App - AI Financial Assistant
 * 
 * PS.md Alignment:
 * - AI-Native Experience: Intelligent financial co-pilot
 * - Adapts UI as conversation evolves
 * - Proactive insights on first load
 * - Persona-aware responses
 * - Easy file management via sidebar
 * - Mobile-first with bottom navigation
 */
function App() {
  // Persisted states
  const [savedMessages, setSavedMessages, clearSavedMessages] = useLocalStorage('finmate_chat_history', []);
  const [savedPersona, setSavedPersona] = useLocalStorage('finmate_persona', null);
  
  // Uploaded files management (localStorage)
  const { files: uploadedFiles, addFile, removeFile, clearAllFiles } = useUploadedFiles();
  
  // Local states
  const [messages, setMessages] = useState(savedMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState(null);
  const [activePersona, setActivePersona] = useState(savedPersona);
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState('home');
  
  // Transaction count for HomeTab
  const [transactionCount, setTransactionCount] = useState(0);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      setSavedMessages(messages);
    }
  }, [messages, setSavedMessages]);

  // Load chat history and proactive insights on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsInitialLoading(true);
    try {
      // Get transaction count for HomeTab
      const stats = await transactionsAPI.getStats();
      setTransactionCount(stats?.transactionCount || 0);
      
      const history = await chatAPI.getHistory();
      if (history && history.length > 0) {
        // Has chat history - show it
        setMessages(history);
      } else {
        // No chat history - check if we have transaction data for proactive insights
        await loadProactiveInsights();
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      // On error, try to load proactive insights anyway
      await loadProactiveInsights();
    } finally {
      setIsInitialLoading(false);
    }
  };

  const loadProactiveInsights = async () => {
    try {
      const insights = await chatAPI.getProactiveInsights();
      // Only show insights if there's actual data (not just a welcome message)
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
        
        // Set persona if detected
        if (insights.detectedPersona) {
          setActivePersona(insights.detectedPersona);
          setSavedPersona(insights.detectedPersona);
        }
      } else {
        // No transaction data - show empty welcome page (ChatWindow handles this)
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load proactive insights:', err);
      // No data or error - show empty welcome page
      setMessages([]);
    }
  };

  // Send message with context
  const handleSendMessage = useCallback(async (content) => {
    // Add user message immediately
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
      // Include persona context in request
      const response = await chatAPI.sendMessage(content, {
        persona: activePersona
      });
      
      // Update persona if detected
      if (response.detectedPersona && response.detectedPersona !== activePersona) {
        setActivePersona(response.detectedPersona);
        setSavedPersona(response.detectedPersona);
      }
      
      setMessages(prev => [...prev, response]);
    } catch (err) {
      console.error('Failed to send message:', err);
      
      // Add error message with helpful suggestions
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I'm having trouble connecting to the server. Please make sure the backend is running on port 5000.",
        timestamp: new Date().toISOString(),
        isError: true,
        suggestions: ["Try again", "Check server status"],
        confidence: { level: 'low', reason: 'Connection error' }
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [activePersona, setSavedPersona]);

  // Start new chat session
  const handleNewChat = useCallback(async () => {
    try {
      // Use the new dedicated endpoint for starting fresh chat
      const response = await chatAPI.startNewChat();
      setMessages([]);
      clearSavedMessages();
      setSidebarOpen(false);
      setActivePersona(null);
      setSavedPersona(null);
      
      // Use the welcome message from the server response
      if (response.welcome) {
        const welcomeMessage = {
          id: Date.now(),
          role: 'assistant',
          content: response.welcome.message,
          ui_component: response.welcome.ui_component,
          ui_data: response.welcome.ui_data,
          suggestions: response.welcome.suggestions,
          timestamp: new Date().toISOString(),
          isProactive: true,
        };
        setMessages([welcomeMessage]);
      } else {
        // Fallback: load fresh proactive insights
        await loadProactiveInsights();
      }
    } catch (err) {
      console.error('Failed to start new chat:', err);
      // Fallback: clear locally and try to load insights
      setMessages([]);
      clearSavedMessages();
      await loadProactiveInsights();
    }
  }, [clearSavedMessages, setSavedPersona]);

  // Clear all history
  const handleClearHistory = useCallback(async () => {
    try {
      await chatAPI.clearHistory();
      setMessages([]);
      clearSavedMessages();
      // Load fresh proactive insights
      await loadProactiveInsights();
    } catch (err) {
      console.error('Failed to clear history:', err);
      setMessages([]);
      clearSavedMessages();
    }
  }, [clearSavedMessages]);

  // Delete specific chat
  const handleDeleteChat = useCallback((messageId) => {
    setMessages(prev => {
      const index = prev.findIndex(m => m.id === messageId);
      if (index === -1) return prev;
      
      const newMessages = [...prev];
      // Remove the user message
      newMessages.splice(index, 1);
      
      // If the next message is an assistant response, remove it too
      if (index < newMessages.length && newMessages[index].role === 'assistant') {
        newMessages.splice(index, 1);
      }
      
      return newMessages;
    });
  }, []);

  // Toggle sidebar
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Memoized values
  const userMessages = useMemo(() => 
    messages.filter(m => m.role === 'user'),
    [messages]
  );

  // Get persona display name
  const getPersonaDisplayName = useCallback(() => {
    if (!activePersona) return 'User';
    const personaNames = {
      student: 'Student Budget Tracker',
      traveler: 'Travel Budget Planner',
      group_expense: 'Group Expense Manager',
      personal: 'Personal Finance'
    };
    return personaNames[activePersona] || activePersona;
  }, [activePersona]);

  // Handle data changes (e.g., when user clears all data)
  const handleDataChanged = useCallback(async () => {
    // Clear messages and reload
    setMessages([]);
    clearSavedMessages();
    clearAllFiles(); // Also clear uploaded files list
    setActivePersona(null);
    setSavedPersona(null);
    // Reload initial data (will show empty welcome if no transactions)
    await loadInitialData();
  }, [clearSavedMessages, setSavedPersona, clearAllFiles]);

  // Handle file deletion from sidebar
  const handleDeleteFile = useCallback(async (fileId) => {
    const transactionIds = removeFile(fileId);
    
    if (transactionIds && transactionIds.length > 0) {
      // Delete transactions from server using batch delete
      try {
        await transactionsAPI.deleteBatch(transactionIds);
        // Reload to update UI
        await loadInitialData();
      } catch (err) {
        console.error('Failed to delete transactions:', err);
        setError('Failed to delete file data');
      }
    }
  }, [removeFile]);

  // Callback for when file is uploaded (called from ChatWindow/CSVUpload)
  const handleFileUploaded = useCallback((fileInfo) => {
    addFile(fileInfo);
    // Update transaction count
    setTransactionCount(prev => prev + (fileInfo.transactionCount || 0));
  }, [addFile]);

  // Handle tab navigation
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    // Close sidebar when changing tabs on mobile
    setSidebarOpen(false);
  }, []);

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            transactionCount={transactionCount}
            uploadedFilesCount={uploadedFiles.length}
            onNavigate={handleTabChange}
            userName="Keshav Upadhyay"
          />
        );
      case 'upload':
        return (
          <UploadTab
            onUploadSuccess={(result, fileInfo) => {
              handleFileUploaded(fileInfo);
              // Switch to chat after upload
              setActiveTab('chat');
              // Send analysis message
              handleSendMessage(`I just uploaded ${result.added} transactions. Can you give me a quick summary?`);
            }}
            onParseSuccess={(result, fileInfo) => {
              handleFileUploaded(fileInfo);
              setActiveTab('chat');
              handleSendMessage(`I imported ${result.added} transactions. What patterns do you see?`);
            }}
          />
        );
      case 'profile':
        return (
          <ProfileTab
            userName="Keshav Upadhyay"
            uploadedFiles={uploadedFiles}
            onDeleteFile={handleDeleteFile}
            onDataChanged={handleDataChanged}
            persona={activePersona}
          />
        );
      case 'chat':
      default:
        return (
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            isInitialLoading={isInitialLoading}
            activePersona={activePersona}
            error={error}
            onFileUploaded={handleFileUploaded}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar - Desktop only */}
      <div className="hidden lg:block">
        <Sidebar
          chatHistory={userMessages}
          onNewChat={handleNewChat}
          onClearHistory={handleClearHistory}
          onDeleteChat={handleDeleteChat}
          isOpen={sidebarOpen}
          onToggle={handleToggleSidebar}
          userName="Keshav Upadhyay"
          onDataChanged={handleDataChanged}
          uploadedFiles={uploadedFiles}
          onDeleteFile={handleDeleteFile}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Persona indicator (subtle) - only show on chat tab */}
        {activePersona && activeTab === 'chat' && (
          <div className="px-4 py-1 bg-primary-50 border-b border-primary-100 text-xs text-primary-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            Mode: {getPersonaDisplayName()}
          </div>
        )}
        
        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {renderTabContent()}
        </div>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}

export default App;
