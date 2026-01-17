import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Upload, FileText, MessageSquare } from 'lucide-react';
import MessageBubble from './MessageBubble';
import CSVUpload from './CSVUpload';
import BankStatementParser from './BankStatementParser';

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

const ChatWindow = ({ messages, onSendMessage, isLoading, isInitialLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showStatementParser, setShowStatementParser] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (!isLoading) {
      onSendMessage(suggestion);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 ml-12 lg:ml-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary-500 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">FinMate Assistant</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-success rounded-full"></span>
              <span className="text-xs text-gray-500">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 bg-gray-50">
        {isInitialLoading ? (
          <div className="space-y-4">
            <MessageSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-primary-500" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Welcome to FinMate</h2>
            <p className="text-gray-500 max-w-md mb-6 sm:mb-8 text-sm">
              Your intelligent financial assistant for managing shared expenses. 
              Ask me anything about your finances!
            </p>
            <div className="grid grid-cols-1 gap-2 max-w-lg w-full">
              {[
                "Who spent the most this month?",
                "Show me unpaid bills",
                "Break down spending by category",
                "Who owes money to whom?"
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-3 text-sm text-left text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 transition-all duration-150"
                >
                  {suggestion}
                </button>
              ))}
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
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
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

      {/* Input Area */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 bg-white border-t border-gray-200">
        {/* CSV Upload Modal */}
        {showUpload && (
          <CSVUpload onClose={() => setShowUpload(false)} />
        )}
        
        {/* Bank Statement Parser Modal */}
        {showStatementParser && (
          <BankStatementParser onClose={() => setShowStatementParser(false)} />
        )}
        
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-1 sm:gap-2 bg-gray-50 rounded-3xl border border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="ml-2 sm:ml-3 p-1.5 sm:p-2 rounded-full hover:bg-gray-200 transition-colors"
              title="Upload CSV"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            </button>
            <button
              type="button"
              onClick={() => setShowStatementParser(true)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200 transition-colors"
              title="Import Bank Statement"
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
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="mr-1.5 sm:mr-2 p-2 sm:p-2.5 rounded-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
