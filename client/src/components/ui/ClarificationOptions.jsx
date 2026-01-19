import { HelpCircle, ChevronRight, MessageCircle } from 'lucide-react';

/**
 * ClarificationOptions - Smart follow-up questions when intent is unclear
 * 
 * PS.md Alignment:
 * - "Asks smart follow-up questions when intent is unclear"
 * - "User intent is inferred, not just explicitly stated"
 * - "Users feel in control"
 * 
 * Supports two formats:
 * 1. Simple: { question: "Which period?", options: ["Today", "This Week"] }
 * 2. Rich: { originalQuery: "...", options: [{ label: "...", query: "..." }] }
 * 
 * @param {Object} props - Component props (can be data object or direct props)
 * @param {Function} onAction - Callback when user selects an option
 */
const ClarificationOptions = ({ data, question, options, onAction }) => {
  // Support both wrapped (data={...}) and unwrapped (question=..., options=...) props
  const resolvedQuestion = question || data?.question || data?.originalQuery;
  const resolvedOptions = options || data?.options || [];
  
  if (!resolvedOptions || resolvedOptions.length === 0) return null;

  const handleOptionClick = (option) => {
    if (onAction) {
      // Support both string options and object options with query/label
      const query = typeof option === 'string' ? option : (option.query || option.label || option);
      onAction(query);
    }
  };

  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-amber-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-2 sm:p-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-transparent">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
          <span className="text-xs sm:text-sm text-gray-900 font-medium">
            {resolvedQuestion || "Let me help you better"}
          </span>
        </div>
      </div>

      {/* Options as clickable buttons */}
      <div className="p-1.5 sm:p-2 flex flex-wrap gap-1.5 sm:gap-2">
        {resolvedOptions.map((option, idx) => {
          const label = typeof option === 'string' ? option : (option.label || option.query);
          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(option)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-all text-[10px] sm:text-sm text-amber-800 font-medium active:scale-95"
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ClarificationOptions;
