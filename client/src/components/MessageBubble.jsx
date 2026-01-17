import { User, Sparkles } from 'lucide-react';
import DynamicComponentRenderer from './DynamicComponentRenderer';
import ConfidenceBadge from './ConfidenceBadge';
import ReasoningSteps from './ReasoningSteps';

const MessageBubble = ({ message, onSuggestionClick }) => {
  const isUser = message.role === 'user';

  // Handle drill-down from interactive charts
  const handleDrillDown = (query) => {
    if (onSuggestionClick) {
      onSuggestionClick(query);
    }
  };

  // Simple markdown-like parser for bold text
  const parseContent = (content) => {
    if (!content) return '';
    
    // Split by bold markers and create elements
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="text-primary-400 font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Handle line breaks
      return part.split('\n').map((line, lineIndex) => (
        <span key={`${index}-${lineIndex}`}>
          {lineIndex > 0 && <br />}
          {line}
        </span>
      ));
    });
  };

  return (
    <div className={`flex items-start gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-dark-700' 
          : 'bg-gradient-to-br from-primary-400 to-primary-600'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-dark-300" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
          isUser 
            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-br-md border border-primary-500/20' 
            : 'glass text-slate-100 rounded-bl-md'
        }`}>
          <div className="markdown-content whitespace-pre-wrap leading-relaxed">
            {parseContent(message.content)}
          </div>
        </div>

        {/* Reasoning Steps (Chain of thought) */}
        {!isUser && message.reasoning && (
          <div className="mt-2 w-full">
            <ReasoningSteps reasoning={message.reasoning} />
          </div>
        )}

        {/* Dynamic UI Component with drill-down support */}
        {!isUser && message.ui_component && message.ui_data && (
          <div className="mt-3 w-full">
            <DynamicComponentRenderer
              componentType={message.ui_component}
              data={message.ui_data}
              onAction={onSuggestionClick}
              onDrillDown={handleDrillDown}
            />
          </div>
        )}

        {/* Suggestions */}
        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick(suggestion)}
                className="px-3 py-1.5 text-xs text-primary-400 bg-dark-800 hover:bg-dark-700 rounded-full border border-dark-700 hover:border-primary-500/50 transition-all duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp and Confidence */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-dark-500">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {!isUser && message.confidence && (
            <ConfidenceBadge confidence={message.confidence} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
