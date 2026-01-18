import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, CheckCircle2, Lightbulb, AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * ReasoningSteps - Shows AI's reasoning process in expandable format
 * 
 * PS.md Alignment:
 * - "Explains its patterns, anomalies, and conclusions"
 * - "Grounds insights in clear, understandable logic"
 * - "Justifies follow-up questions"
 * - "Explains why it can't answer something"
 * 
 * @param {Object} reasoning - Reasoning data from AI response
 * @param {Array} reasoning.steps - Array of reasoning steps
 * @param {string} reasoning.conclusion - Final conclusion
 * @param {string[]} reasoning.assumptions - Assumptions made
 * @param {string[]} reasoning.uncertainties - Things AI is uncertain about
 */
const ReasoningSteps = ({ reasoning }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!reasoning || !reasoning.steps || reasoning.steps.length === 0) {
    return null;
  }

  const { steps, conclusion, assumptions, uncertainties } = reasoning;

  const getStepIcon = (type) => {
    switch (type) {
      case 'observation': return <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />;
      case 'analysis': return <Brain className="w-3.5 h-3.5 text-purple-400" />;
      case 'insight': return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      default: return <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" />;
    }
  };

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-white/50 hover:bg-white transition-colors"
        aria-expanded={isExpanded}
        aria-label="Show reasoning process"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary-600" />
          <span className="text-xs font-medium text-gray-700">How I figured this out</span>
          <span className="text-xs text-gray-500">({steps.length} steps)</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 bg-gray-50/50 space-y-4 animate-fade-in">
          {/* Reasoning Steps */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">My Reasoning</h4>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-2 p-2 bg-white/50 rounded-lg"
                >
                  <div className="mt-0.5">
                    {getStepIcon(step.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-700">{step.text}</p>
                    {step.data && (
                      <p className="text-xs text-primary-600 mt-1 font-mono">{step.data}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono">#{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assumptions */}
          {assumptions && assumptions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-amber-400/80 uppercase tracking-wide flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Assumptions I Made
              </h4>
              <ul className="space-y-1">
                {assumptions.map((assumption, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-amber-400">•</span>
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Uncertainties */}
          {uncertainties && uncertainties.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-red-400/80 uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                What I'm Less Sure About
              </h4>
              <ul className="space-y-1">
                {uncertainties.map((uncertainty, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-red-400">•</span>
                    {uncertainty}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Conclusion */}
          {conclusion && (
            <div className="pt-3 border-t border-gray-200">
              <div className="p-2 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                <p className="text-xs text-primary-300">
                  <span className="font-medium">Therefore: </span>
                  {conclusion}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReasoningSteps;
