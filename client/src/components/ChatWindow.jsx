import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Upload, FileText } from 'lucide-react';
import MessageBubble from './MessageBubble';
import CSVUpload from './CSVUpload';
import BankStatementParser from './BankStatementParser';

// Skeleton loader component for initial loading
const MessageSkeleton = () => (
  <div className="flex items-start gap-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-dark-700" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-dark-700 rounded w-3/4" />
      <div className="h-4 bg-dark-700 rounded w-1/2" />
      <div className="h-32 bg-dark-700 rounded-xl w-full mt-3" />
      <div className="flex gap-2 mt-3">
        <div className="h-8 bg-dark-700 rounded-full w-24" />
        <div className="h-8 bg-dark-700 rounded-full w-32" />
        <div className="h-8 bg-dark-700 rounded-full w-28" />
      </div>
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
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 glass z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white tracking-wide">FinMate <span className="text-primary-400 font-light">Pro</span></h2>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Financial Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-dark-800/50 border border-white/5">
          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
          <span className="text-xs text-slate-300 font-medium">Live</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 z-10 scroll-smooth">
        {isInitialLoading ? (
          // Skeleton loading state
          <div className="space-y-4">
            <MessageSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to FairShare!</h2>
            <p className="text-dark-400 max-w-md mb-8">
              I'm your intelligent financial co-pilot for managing roommate expenses. 
              Ask me about spending, settlements, or anything about your shared finances!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              {[
                "Who spent the most this month?",
                "Show me unpaid bills",
                "Break down spending by category",
                "Who owes money to whom?"
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-3 text-sm text-left text-dark-300 bg-dark-800 hover:bg-dark-700 rounded-xl border border-dark-700 hover:border-primary-500/50 transition-all duration-200"
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-dark-800 rounded-2xl px-4 py-3 border border-dark-700">
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
      <div className="px-4 pb-4 pt-2">
        {/* CSV Upload Modal */}
        {showUpload && (
          <CSVUpload onClose={() => setShowUpload(false)} />
        )}
        
        {/* Bank Statement Parser Modal */}
        {showStatementParser && (
          <BankStatementParser onClose={() => setShowStatementParser(false)} />
        )}
        
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-2 bg-dark-800 rounded-2xl border border-dark-700 focus-within:border-primary-500/50 transition-colors">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="ml-2 p-2 rounded-xl hover:bg-dark-700 transition-colors"
              title="Upload CSV"
            >
              <Upload className="w-5 h-5 text-dark-400 hover:text-primary-400" />
            </button>
            <button
              type="button"
              onClick={() => setShowStatementParser(true)}
              className="p-2 rounded-xl hover:bg-dark-700 transition-colors"
              title="Import Bank Statement / SMS"
            >
              <FileText className="w-5 h-5 text-dark-400 hover:text-primary-400" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your expenses..."
              className="flex-1 bg-transparent px-2 py-4 text-white placeholder-dark-500 focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="mr-2 p-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-dark-700 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </form>
        <p className="text-xs text-dark-500 text-center mt-2">
          FairShare can make mistakes. Verify important financial information.
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
