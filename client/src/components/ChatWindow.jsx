import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Upload, IndianRupee, ShoppingCart, Package, Mic, MicOff } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { CSVUpload } from './layout';

/**
 * ChatWindow - Main chat interface for Small Business
 * 
 * PS.md Alignment:
 * - "Interface adapts to the conversation"
 * - "Ask smart follow-up questions"
 * - "System feels like intelligent financial co-pilot"
 */

// Skeleton loader
const MessageSkeleton = () => (
  <div className="flex items-start gap-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-amber-100" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-amber-100 rounded w-3/4" />
      <div className="h-4 bg-amber-50 rounded w-1/2" />
      <div className="h-24 bg-amber-50/50 rounded-lg w-full mt-3" />
    </div>
  </div>
);

// Vendor-specific suggestions - Expanded for better AI-Native Experience
const VENDOR_SUGGESTIONS = [
  { text: "How's my business doing?", icon: IndianRupee },
  { text: "What changed this week?", icon: ShoppingCart },
  { text: "Show unusual spending", icon: Package }
];

// Secondary suggestions for deeper exploration
const EXPLORATION_SUGGESTIONS = [
  "What if I cut expenses by 20%?",
  "Compare weekday vs weekend sales",
  "Which category costs the most?"
];

const ChatWindow = ({ 
  messages, 
  onSendMessage, 
  isLoading, 
  isInitialLoading,
  error,
  onFileUploaded
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Vendor-specific suggestions
  const suggestions = VENDOR_SUGGESTIONS;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && !isInitialLoading) {
      // Small timeout to ensure keyboard opens on mobile
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 1000);
      return () => clearTimeout(timer);
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

  const toggleRecording = () => {
    if (isRecording) {
      // Logic to stop is handled by the recognition.onend usually, 
      // but we can force stop if we had the instance ref. 
      // For simple "toggle", we rely on the object's lifecycle or simple restart prevention.
      // Since we create a new instance on click, we mainly handle "start" here.
      // Ideally we would keep the recognition instance in a ref to stop it manually.
      return; 
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // Default to English, can be made dynamic
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => (prev ? prev + ' ' + transcript : transcript));
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Auto-focus back to input
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    recognition.start();
  };

  const handleImportSuccess = (result, fileInfo) => {
    setShowImport(false);
    
    // Track uploaded file in localStorage
    if (onFileUploaded && fileInfo) {
      onFileUploaded({
        name: fileInfo.name || 'Imported Data',
        type: fileInfo.type || 'csv',
        transactionCount: result.added || 0,
        transactionIds: result.transactionIds || [],
        totalAmount: result.totalAmount || 0
      });
    }
    
    onSendMessage(`I imported ${result.added} transactions. Show me spending patterns with charts and visual breakdown.`);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 bg-white pb-24 sm:pb-28">
        {isInitialLoading ? (
          <div className="space-y-4">
            <MessageSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <div className="min-h-full flex flex-col items-center justify-center -mt-10 animate-fade-in">
            
            {/* Big Logo */}
            <div className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-sm border border-amber-100 mb-6 relative">
               <div className="absolute inset-0 bg-amber-50 rounded-full animate-pulse opacity-50"></div>
              <img src="/logo.png" alt="FinMate" className="w-28 h-28 object-contain relative z-10" />
            </div>

            {/* Welcome Msg like ChatGPT/Gemini */}
            <h2 className="text-2xl font-bold text-amber-900 mb-2">Welcome to FinMate</h2>
            <p className="text-amber-800/80 mb-6 font-medium">Your AI financial co-pilot. Ask me anything about your business!</p>

            {/* Primary Suggestion Pills */}
            <div className="flex flex-wrap justify-center gap-3 max-w-2xl px-4 mb-4">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-5 py-2.5 text-sm font-medium text-amber-700 bg-white hover:bg-amber-50 rounded-full border border-amber-200 hover:border-amber-300 transition-all shadow-sm hover:shadow active:scale-95"
                >
                  {suggestion.text}
                </button>
              ))}
            </div>

            {/* Exploration Suggestions - Secondary */}
            <div className="flex flex-wrap justify-center gap-2 max-w-xl px-4 mb-6">
              {EXPLORATION_SUGGESTIONS.map((text, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(text)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-200 transition-colors"
                >
                  {text}
                </button>
              ))}
            </div>

            {/* Import options */}
            <div className="flex items-center justify-center gap-3 text-xs text-amber-700 mt-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-full border border-amber-200 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Data</span>
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
                <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <img src="/logo.png" alt="FinMate" className="w-5 h-5 object-contain" />
                </div>
                <div className="bg-amber-50 rounded-2xl rounded-bl-md px-4 py-3 border border-amber-200 shadow-sm">
                  <div className="typing-indicator">
                    <div className="typing-dot bg-amber-500"></div>
                    <div className="typing-dot bg-amber-500"></div>
                    <div className="typing-dot bg-amber-500"></div>
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

      {/* Input Area - Fixed at bottom */}
      <div className="shrink-0 px-2 sm:px-6 py-2 sm:py-4 pb-3 sm:pb-4 bg-white border-t border-amber-200">
        
        {/* CSV Upload Modal */}
        {showImport && (
          <CSVUpload 
            onClose={() => setShowImport(false)}
            onUploadSuccess={handleImportSuccess}
          />
        )}
        
        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
          <div className="flex items-center gap-1 bg-amber-50 rounded-2xl sm:rounded-3xl border border-amber-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="ml-1.5 sm:ml-3 p-2 sm:p-2 rounded-full hover:bg-amber-100 transition-colors touch-manipulation"
              title="Import CSV"
              aria-label="Import CSV data"
            >
              <Upload className="w-5 h-5 text-amber-600" />
            </button>
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about sales, expenses, profits..."
              className="flex-1 bg-transparent px-2 py-3 text-amber-900 placeholder-amber-400 focus:outline-none text-sm sm:text-base min-w-0"
              disabled={isLoading}
              aria-label="Message input"
            />
            {/* Mic Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2 rounded-full transition-colors touch-manipulation ${
                isRecording 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'hover:bg-amber-100 text-amber-600'
              }`}
              title="Voice Input"
              aria-label="Voice Input"
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="mr-1.5 sm:mr-2 p-2.5 sm:p-2.5 rounded-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-200 disabled:cursor-not-allowed transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </form>
        <p className="text-xs text-amber-600 text-center mt-2 hidden sm:block">
          Your digital business assistant 📒
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
