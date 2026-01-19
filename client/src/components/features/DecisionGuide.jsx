import { useState } from 'react';
import { 
  CheckCircle, Circle, ArrowRight, Target, Lightbulb,
  Wallet, PiggyBank, Bell, Calendar
} from 'lucide-react';

/**
 * DecisionGuide - Guides users through financial decisions
 * 
 * PS.md Alignment:
 * - "End conversations with clarity and agency"
 * - "Let users compare, simulate, and explore scenarios"
 * - "Should I buy this?" query type
 * - "Justifies its recommendations"
 */
const DecisionGuide = ({ data, onAction }) => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);

  if (!data || !data.steps) return null;

  const handleStepComplete = (stepId) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const handleActionClick = (action) => {
    setSelectedAction(action);
    if (onAction) {
      onAction(action);
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'settle': return <Wallet className="w-4 h-4" />;
      case 'budget': return <PiggyBank className="w-4 h-4" />;
      case 'reminder': return <Bell className="w-4 h-4" />;
      case 'plan': return <Calendar className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-2.5 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-primary-600/10 to-transparent">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600" />
          <h3 className="text-xs sm:text-sm font-medium text-gray-900">{data.title || 'Recommended Actions'}</h3>
        </div>
        {data.context && (
          <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">{data.context}</p>
        )}
      </div>

      {/* Decision Steps */}
      {data.steps && (
        <div className="p-2.5 sm:p-4 border-b border-gray-200">
          <h4 className="text-[10px] sm:text-xs font-medium text-gray-600 mb-2 sm:mb-3">Follow these steps:</h4>
          <div className="space-y-2 sm:space-y-3">
            {data.steps.map((step, idx) => {
              const isCompleted = completedSteps.includes(step.id);
              const isActive = !isCompleted && completedSteps.length === idx;
              
              return (
                <div 
                  key={step.id}
                  className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors ${
                    isCompleted ? 'bg-primary-500/10' : 
                    isActive ? 'bg-gray-100/50 ring-1 ring-primary-500/30' : 
                    'bg-gray-50/30'
                  }`}
                >
                  <button
                    onClick={() => handleStepComplete(step.id)}
                    className={`mt-0.5 ${isCompleted ? 'text-primary-600' : 'text-gray-500'}`}
                    aria-label={isCompleted ? 'Step completed' : 'Mark step as complete'}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Circle className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className={`text-xs sm:text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {step.title}
                    </p>
                    {step.detail && !isCompleted && (
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">{step.detail}</p>
                    )}
                    {step.action && !isCompleted && isActive && (
                      <button
                        onClick={() => handleActionClick(step.action)}
                        className="mt-1.5 sm:mt-2 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                      >
                        {step.action.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Progress */}
          <div className="mt-3 sm:mt-4 flex items-center gap-2">
            <div className="flex-1 h-1 sm:h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-500"
                style={{ width: `${(completedSteps.length / data.steps.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] sm:text-xs text-gray-600">
              {completedSteps.length}/{data.steps.length}
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {data.quickActions && (
        <div className="p-2.5 sm:p-4">
          <h4 className="text-[10px] sm:text-xs font-medium text-gray-600 mb-2 sm:mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {data.quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleActionClick(action)}
                className={`p-2 sm:p-3 rounded-lg border transition-all text-left hover:border-primary-500/50 ${
                  selectedAction?.id === action.id 
                    ? 'border-primary-500 bg-primary-500/10' 
                    : 'border-gray-200 hover:bg-gray-100/50'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                  <span className="text-primary-600">{getActionIcon(action.type)}</span>
                  <span className="text-[10px] sm:text-sm text-gray-900">{action.label}</span>
                </div>
                {action.description && (
                  <p className="text-[10px] sm:text-xs text-gray-600">{action.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      {data.insight && (
        <div className="p-2.5 sm:p-4 border-t border-gray-200 bg-gray-50/50">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] sm:text-xs text-gray-700">{data.insight}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionGuide;
