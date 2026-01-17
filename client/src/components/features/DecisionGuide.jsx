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
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-dark-700 bg-gradient-to-r from-primary-600/10 to-transparent">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-medium text-white">{data.title || 'Recommended Actions'}</h3>
        </div>
        {data.context && (
          <p className="text-xs text-dark-400 mt-1">{data.context}</p>
        )}
      </div>

      {/* Decision Steps */}
      {data.steps && (
        <div className="p-4 border-b border-dark-700">
          <h4 className="text-xs font-medium text-dark-400 mb-3">Follow these steps:</h4>
          <div className="space-y-3">
            {data.steps.map((step, idx) => {
              const isCompleted = completedSteps.includes(step.id);
              const isActive = !isCompleted && completedSteps.length === idx;
              
              return (
                <div 
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    isCompleted ? 'bg-primary-500/10' : 
                    isActive ? 'bg-dark-700/50 ring-1 ring-primary-500/30' : 
                    'bg-dark-900/30'
                  }`}
                >
                  <button
                    onClick={() => handleStepComplete(step.id)}
                    className={`mt-0.5 ${isCompleted ? 'text-primary-400' : 'text-dark-500'}`}
                    aria-label={isCompleted ? 'Step completed' : 'Mark step as complete'}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${isCompleted ? 'text-dark-400 line-through' : 'text-white'}`}>
                      {step.title}
                    </p>
                    {step.detail && !isCompleted && (
                      <p className="text-xs text-dark-400 mt-1">{step.detail}</p>
                    )}
                    {step.action && !isCompleted && isActive && (
                      <button
                        onClick={() => handleActionClick(step.action)}
                        className="mt-2 px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
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
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-500"
                style={{ width: `${(completedSteps.length / data.steps.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-dark-400">
              {completedSteps.length}/{data.steps.length}
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {data.quickActions && (
        <div className="p-4">
          <h4 className="text-xs font-medium text-dark-400 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            {data.quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleActionClick(action)}
                className={`p-3 rounded-lg border transition-all text-left hover:border-primary-500/50 ${
                  selectedAction?.id === action.id 
                    ? 'border-primary-500 bg-primary-500/10' 
                    : 'border-dark-700 hover:bg-dark-700/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-primary-400">{getActionIcon(action.type)}</span>
                  <span className="text-sm text-white">{action.label}</span>
                </div>
                {action.description && (
                  <p className="text-xs text-dark-400">{action.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      {data.insight && (
        <div className="p-4 border-t border-dark-700 bg-dark-900/50">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-dark-300">{data.insight}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionGuide;
