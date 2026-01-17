import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2, Upload, FileText, MessageSquare, Sparkles, TrendingUp, Users, PiggyBank, Plane } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { CSVUpload, BankStatementParser } from './layout';

/**
 * ChatWindow - Main chat interface
 * 
 * PS.md Alignment:
 * - "Interface adapts to the conversation"
 * - "Ask smart follow-up questions"
 * - "System feels like intelligent financial co-pilot"
 * - "Reduces cognitive effort"
 */

// Skeleton loader component for initial loading
const MessageSkeleton = () => (
  <div className="flex items-start gap-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-gray-200" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-24 bg-gray-100 rounded-lg w-full mt-3" />
    </div>
  </div>
);

// Persona-aware suggestion chips
const PERSONA_SUGGESTIONS = {
  default: [
    { text: "Show my spending this month", icon: TrendingUp },
    { text: "Who owes what?", icon: Users },
    { text: "Break down by category", icon: PiggyBank },
    { text: "Help me save for a goal", icon: Sparkles }
  ],
  student: [
    { text: "How much did I spend on food?", icon: PiggyBank },
    { text: "Compare this week vs last", icon: TrendingUp },
    { text: "Am I within budget?", icon: Sparkles },
    { text: "Show dining expenses", icon: FileText }
  ],
  traveler: [
    { text: "How much have I spent on this trip?", icon: Plane },
    { text: "Daily spending breakdown", icon: TrendingUp },
    { text: "Days left in my budget", icon: PiggyBank },
    { text: "What's my biggest expense?", icon: Sparkles }
  ],
  group_expense: [
    { text: "Who owes what?", icon: Users },
    { text: "Settle up now", icon: Sparkles },
    { text: "Show shared expenses", icon: FileText },
    { text: "Add a new expense", icon: PiggyBank }
  ]
};

const ChatWindow = ({ 
  messages, 
  onSendMessage, 
  isLoading, 
  isInitialLoading,
  activePersona,
  error,
  onFileUploaded
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showStatementParser, setShowStatementParser] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get persona-specific suggestions
  const suggestions = useMemo(() => {
    return PERSONA_SUGGESTIONS[activePersona] || PERSONA_SUGGESTIONS.default;
  }, [activePersona]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && !isInitialLoading) {
      inputRef.current.focus();
    }
  }, [isInitialLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (!isLoading) {
      const text = typeof suggestion === 'string' ? suggestion : suggestion.text;
      onSendMessage(text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleUploadSuccess = (result, fileInfo) => {
    setShowUpload(false);
    
    // Track uploaded file in localStorage
    if (onFileUploaded && fileInfo) {
      onFileUploaded({
        name: fileInfo.name || 'CSV Upload',
        type: 'csv',
        transactionCount: result.added || 0,
        transactionIds: result.transactionIds || [],
        totalAmount: result.totalAmount || 0
      });
    }
    
    // Send a message to analyze the uploaded data
    onSendMessage(`I just uploaded ${result.added} transactions. Can you give me a quick summary?`);
  };

  const handleParseSuccess = (result, fileInfo) => {
    setShowStatementParser(false);
    
    // Track uploaded file in localStorage
    if (onFileUploaded && fileInfo) {
      onFileUploaded({
        name: fileInfo.name || 'Bank Statement',
        type: fileInfo.type || 'pdf',
        transactionCount: result.added || 0,
        transactionIds: result.transactionIds || [],
        totalAmount: result.totalAmount || 0
      });
    }
    
    onSendMessage(`I imported ${result.added} transactions. What patterns do you see?`);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 bg-white">
        {isInitialLoading ? (
          <div className="space-y-4">
            <MessageSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <img src="/logo.png" alt="FinMate Logo" className="w-40 h-40 sm:w-48 sm:h-48 object-contain mb-6" />
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              Welcome to FinMate
            </h2>
            <p className="text-gray-500 max-w-md mb-6 text-sm">
              Your AI financial co-pilot. I can track expenses, split bills, 
              spot spending patterns, and help you budget smarter.
            </p>
            
            {/* Quick action grid */}
            <div className="grid grid-cols-2 gap-3 max-w-md w-full mb-6">
              {suggestions.map((suggestion, idx) => {
                const Icon = suggestion.icon || Sparkles;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-left text-gray-700 bg-white hover:bg-primary-50 rounded-xl border border-gray-200 hover:border-primary-300 transition-all duration-150 group"
                  >
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-primary-500 flex-shrink-0" />
                    <span className="truncate">{suggestion.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Import options */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-1 hover:text-primary-500 transition-colors"
              >
                <Upload className="w-3 h-3" />
                Upload CSV
              </button>
              <span>•</span>
              <button
                onClick={() => setShowStatementParser(true)}
                className="flex items-center gap-1 hover:text-primary-500 transition-colors"
              >
                <FileText className="w-3 h-3" />
                Import Statement
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble 
                key={message.id || index} 
                message={message}
                onSuggestionClick={handleSuggestionClick}
              />
            ))}
            {isLoading && (
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img src="/logo.png" alt="AI" className="w-full h-full object-contain p-1" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200 shadow-sm">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600 text-center">
          {error} — <button onClick={() => window.location.reload()} className="underline">Refresh</button>
        </div>
      )}

      {/* Input Area */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 bg-white border-t border-gray-200">
        {/* CSV Upload Modal */}
        {showUpload && (
          <CSVUpload 
            onClose={() => setShowUpload(false)} 
            onUploadSuccess={handleUploadSuccess}
          />
        )}
        
        {/* Bank Statement Parser Modal */}
        {showStatementParser && (
          <BankStatementParser 
            onClose={() => setShowStatementParser(false)}
            onParseSuccess={handleParseSuccess}
          />
        )}
        
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-1 sm:gap-2 bg-gray-50 rounded-3xl border border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="ml-2 sm:ml-3 p-1.5 sm:p-2 rounded-full hover:bg-gray-200 transition-colors"
              title="Upload CSV"
              aria-label="Upload CSV file"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            </button>
            <button
              type="button"
              onClick={() => setShowStatementParser(true)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200 transition-colors"
              title="Import Bank Statement"
              aria-label="Import bank statement"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your expenses..."
              className="flex-1 bg-transparent px-1 sm:px-2 py-3 sm:py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none text-sm min-w-0"
              disabled={isLoading}
              aria-label="Message input"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="mr-1.5 sm:mr-2 p-2 sm:p-2.5 rounded-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              )}
            </button>
          </div>
        </form>
        <p className="text-xs text-gray-400 text-center mt-2 hidden sm:block">
          FinMate can make mistakes. Verify important financial information.
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
