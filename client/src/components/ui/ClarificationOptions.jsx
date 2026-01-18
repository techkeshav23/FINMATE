import { HelpCircle, ChevronRight, MessageCircle } from 'lucide-react';

/**
 * ClarificationOptions - Smart follow-up questions when intent is unclear
 * 
 * PS.md Alignment:
 * - "Asks smart follow-up questions when intent is unclear"
 * - "User intent is inferred, not just explicitly stated"
 * - "Users feel in control"
 * 
 * @param {Object} data - Clarification data from AI
 * @param {string} data.originalQuery - User's original question
 * @param {Array} data.options - Array of clarification options
 * @param {Function} onAction - Callback when user selects an option
 */
const ClarificationOptions = ({ data, onAction }) => {
  if (!data || !data.options) return null;

  const handleOptionClick = (option) => {
    if (onAction) {
      onAction(option.query);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-gray-900 font-medium">Let me help you better</span>
        </div>
        {data.originalQuery && (
          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            You asked: "{data.originalQuery}"
          </p>
        )}
      </div>

      {/* Options */}
      <div className="p-3 space-y-2">
        {data.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleOptionClick(option)}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary-500/50 hover:bg-gray-100/50 transition-all text-left group"
            aria-label={`Select: ${option.label}`}
          >
            <div>
              <span className="text-sm text-gray-900 font-medium group-hover:text-primary-600 transition-colors">
                {option.label}
              </span>
              {option.description && (
                <p className="text-xs text-gray-600 mt-0.5">{option.description}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>

      {/* Help text */}
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-500 text-center">
          Click an option or type your own question
        </p>
      </div>
    </div>
  );
};

export default ClarificationOptions;
