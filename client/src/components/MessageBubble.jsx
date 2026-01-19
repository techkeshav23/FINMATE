import { User } from 'lucide-react';
import ThesysGenUI from './ThesysGenUI';
import { ConfidenceBadge, ReasoningSteps } from './ui';

/**
 * MessageBubble - Individual chat message component
 * 
 * PS.md Alignment:
 * - "Chain of thought reasoning" - Shows reasoning steps
 * - "System explains itself" - Confidence badge for transparency
 * - "Actionable cards with verify button" - Renders dynamic UI components
 */

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
    
    // Ensure content is a string
    const textContent = typeof content === 'string' 
      ? content 
      : (content?.message || content?.text || JSON.stringify(content) || '');
    
    // Split by bold markers and create elements
    const parts = textContent.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className={isUser ? "text-white font-bold" : "text-amber-700 font-semibold"}>
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

  // Check if components contain TextContent with same/similar text (to avoid duplication)
  const hasTextInComponents = () => {
    if (!message.components || message.components.length === 0) return false;
    
    const checkForText = (node) => {
      if (!node) return false;
      // Check if this node is TextContent with textMarkdown
      if (node.component === 'TextContent' && node.props?.textMarkdown) {
        return true;
      }
      // Check InlineHeader with description (also contains text)
      if (node.component === 'InlineHeader' && node.props?.description) {
        return true;
      }
      // Recursively check children
      const children = node.props?.children || node.children;
      if (Array.isArray(children)) {
        return children.some(child => checkForText(child));
      }
      if (children && typeof children === 'object') {
        return checkForText(children);
      }
      return false;
    };
    
    return message.components.some(comp => checkForText(comp));
  };
  
  // For AI messages with components that already have text, show shorter bubble
  const shouldShowShortResponse = !isUser && hasTextInComponents();

  return (
    <div className={`flex items-start gap-2 sm:gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-amber-100' 
          : 'bg-amber-50 border border-amber-200'
      }`}>
        {isUser ? (
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700" />
        ) : (
          <img src="/logo.png" alt="FinMate" className="w-5 h-5 object-contain" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Only show text bubble if NOT duplicated in components */}
        {(!shouldShowShortResponse || isUser) && (
          <div className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
            isUser 
              ? 'bg-amber-500 text-white rounded-br-md' 
              : 'bg-amber-50 text-amber-900 rounded-bl-md border border-amber-200 shadow-sm'
          }`}>
            <div className="markdown-content whitespace-pre-wrap leading-relaxed text-sm">
              {parseContent(message.content)}
            </div>
          </div>
        )}

        {/* Reasoning Steps (Chain of thought) */}
        {!isUser && message.reasoning && (
          <div className="mt-2 w-full">
            <ReasoningSteps reasoning={message.reasoning} />
          </div>
        )}

        {/* Dynamic UI Layout (Thesys Components Array) */}
        {!isUser && message.components && message.components.length > 0 && (
          <div className="mt-3 w-full">
            <ThesysGenUI
              componentType="layout"
              data={{ type: 'column', children: message.components }}
              onAction={onSuggestionClick}
              onDrillDown={handleDrillDown}
            />
          </div>
        )}

        {/* Legacy/Single UI Component Support */}
        {!isUser && message.ui_component && message.ui_data && (
          <div className="mt-3 w-full">
            <ThesysGenUI
              componentType={message.ui_component}
              data={message.ui_data}
              onAction={onSuggestionClick}
              onDrillDown={handleDrillDown}
            />
          </div>
        )}

        {/* Suggestions */}
        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
            {message.suggestions.slice(0, 4).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick(suggestion)}
                className="px-2.5 sm:px-3 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 rounded-full border border-amber-200 transition-colors touch-manipulation"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp and Confidence */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] sm:text-xs text-gray-400">
            {message.timestamp 
              ? new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              : new Date().toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
            }
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
