import { User, MessageSquare } from 'lucide-react';
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
          <strong key={index} className="text-primary-600 font-semibold">
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
    <div className={`flex items-start gap-2 sm:gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-gray-200' 
          : 'bg-primary-500'
      }`}>
        {isUser ? (
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
        ) : (
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
          isUser 
            ? 'bg-primary-500 text-white rounded-br-md' 
            : 'bg-white text-gray-800 rounded-bl-md border border-gray-200 shadow-sm'
        }`}>
          <div className="markdown-content whitespace-pre-wrap leading-relaxed text-sm">
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
                className="px-3 py-1.5 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-full border border-primary-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp and Confidence */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-gray-400">
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
