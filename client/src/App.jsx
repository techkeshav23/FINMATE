import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { chatAPI } from './services/api';

function App() {
  const [messages, setMessages] = useState(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem('finmate_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState(null);

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('finmate_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Load chat history and proactive insights on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsInitialLoading(true);
    try {
      const history = await chatAPI.getHistory();
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        // No history - fetch proactive insights as welcome message
        await loadProactiveInsights();
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      // Try to load proactive insights even if history fails
      await loadProactiveInsights();
    } finally {
      setIsInitialLoading(false);
    }
  };

  const loadProactiveInsights = async () => {
    try {
      const insights = await chatAPI.getProactiveInsights();
      if (insights) {
        const welcomeMessage = {
          id: Date.now(),
          role: 'assistant',
          content: insights.message,
          ui_component: insights.ui_component,
          ui_data: insights.ui_data,
          suggestions: insights.suggestions,
          timestamp: new Date().toISOString(),
          isProactive: true,
        };
        setMessages([welcomeMessage]);
      }
    } catch (err) {
      console.error('Failed to load proactive insights:', err);
    }
  };

  const handleSendMessage = async (content) => {
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
      const response = await chatAPI.sendMessage(content);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      console.error('Failed to send message:', err);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I'm having trouble connecting to the server. Please make sure the backend is running on port 5000.",
        timestamp: new Date().toISOString(),
        suggestions: ["Try again", "Check server status"],
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      await chatAPI.clearHistory();
      setMessages([]);
      localStorage.removeItem('finmate_chat_history');
      setSidebarOpen(false);
      // Load fresh proactive insights for new chat
      await loadProactiveInsights();
    } catch (err) {
      console.error('Failed to clear history:', err);
      setMessages([]);
      localStorage.removeItem('finmate_chat_history');
    }
  };

  const handleClearHistory = async () => {
    try {
      await chatAPI.clearHistory();
      setMessages([]);
      localStorage.removeItem('finmate_chat_history');
      // Load fresh proactive insights
      await loadProactiveInsights();
    } catch (err) {
      console.error('Failed to clear history:', err);
      setMessages([]);
      localStorage.removeItem('finmate_chat_history');
    }
  };

  const userMessages = messages.filter(m => m.role === 'user');

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        chatHistory={userMessages}
        onNewChat={handleNewChat}
        onClearHistory={handleClearHistory}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          isInitialLoading={isInitialLoading}
        />
      </main>
    </div>
  );
}

export default App;
