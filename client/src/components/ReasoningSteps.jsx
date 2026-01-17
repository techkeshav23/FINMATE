import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, CheckCircle2, Lightbulb, AlertTriangle, HelpCircle } from 'lucide-react';

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
      default: return <CheckCircle2 className="w-3.5 h-3.5 text-primary-400" />;
    }
  };

  return (
    <div className="mt-3 border border-dark-700 rounded-lg overflow-hidden">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-dark-800/50 hover:bg-dark-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary-400" />
          <span className="text-xs font-medium text-dark-300">How I figured this out</span>
          <span className="text-xs text-dark-500">({steps.length} steps)</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-dark-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-dark-500" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 bg-dark-900/50 space-y-4 animate-fade-in">
          {/* Reasoning Steps */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wide">My Reasoning</h4>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-2 p-2 bg-dark-800/50 rounded-lg"
                >
                  <div className="mt-0.5">
                    {getStepIcon(step.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-dark-300">{step.text}</p>
                    {step.data && (
                      <p className="text-xs text-primary-400 mt-1">{step.data}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-dark-600">#{idx + 1}</span>
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
                  <li key={idx} className="flex items-start gap-2 text-xs text-dark-400">
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
                  <li key={idx} className="flex items-start gap-2 text-xs text-dark-400">
                    <span className="text-red-400">•</span>
                    {uncertainty}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Conclusion */}
          {conclusion && (
            <div className="pt-3 border-t border-dark-700">
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
