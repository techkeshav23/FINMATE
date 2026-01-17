import { HelpCircle, ChevronRight } from 'lucide-react';

const ClarificationOptions = ({ data, onAction }) => {
  if (!data || !data.options) return null;

  const handleOptionClick = (option) => {
    if (onAction) {
      onAction(option.query);
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-dark-700 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-white font-medium">Let me help you better</span>
        </div>
        {data.originalQuery && (
          <p className="text-xs text-dark-400 mt-1">
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
            className="w-full flex items-center justify-between p-3 rounded-lg border border-dark-700 hover:border-primary-500/50 hover:bg-dark-700/50 transition-all text-left group"
          >
            <div>
              <span className="text-sm text-white font-medium group-hover:text-primary-400 transition-colors">
                {option.label}
              </span>
              {option.description && (
                <p className="text-xs text-dark-400 mt-0.5">{option.description}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
          </button>
        ))}
      </div>

      {/* Help text */}
      <div className="px-4 pb-3">
        <p className="text-xs text-dark-500 text-center">
          Click an option or type your own question
        </p>
      </div>
    </div>
  );
};

export default ClarificationOptions;
