import { useState, useCallback, useMemo } from 'react';
import { 
  SlidersHorizontal, TrendingUp, TrendingDown, 
  PiggyBank, Lightbulb, AlertTriangle, CheckCircle,
  Info, RefreshCw, DollarSign
} from 'lucide-react';

/**
 * SimulationSlider - Interactive budget simulation
 * 
 * PS.md Alignment:
 * - "What if I cut X by Y%?" query type
 * - "Let users compare, simulate, and explore scenarios"
 * - "Adapts its UI as the conversation evolves"
 * - "Creative use of Thesys CI to generate evolving, interactive UI"
 */
const SimulationSlider = ({ data, onSimulate }) => {
  const categories = useMemo(() => data?.categories || [], [data?.categories]);
  const originalBudget = useMemo(() => data?.originalBudget || 0, [data?.originalBudget]);
  const goalAmount = useMemo(() => data?.goalAmount || originalBudget * 0.8, [data?.goalAmount, originalBudget]);

  const [adjustments, setAdjustments] = useState(() => {
    const initial = {};
    categories.forEach(cat => {
      initial[cat.name] = 0; // Start with 0% change
    });
    return initial;
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // Calculate projected budget based on adjustments
  const projectedBudget = useMemo(() => {
    return categories.reduce((total, cat) => {
      const adjustment = adjustments[cat.name] || 0;
      const adjustedAmount = cat.amount * (1 + adjustment / 100);
      return total + adjustedAmount;
    }, 0);
  }, [categories, adjustments]);

  const savings = originalBudget - projectedBudget;
  const savingsPercent = originalBudget > 0 ? ((savings / originalBudget) * 100).toFixed(1) : 0;
  const goalProgress = goalAmount > 0 ? ((originalBudget - projectedBudget) / (originalBudget - goalAmount)) * 100 : 0;

  const handleSliderChange = useCallback((categoryName, value) => {
    setAdjustments(prev => ({
      ...prev,
      [categoryName]: parseInt(value)
    }));
    setSimulationResult(null);
  }, []);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      if (onSimulate) {
        const result = await onSimulate(adjustments);
        setSimulationResult(result);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const resetAdjustments = () => {
    const reset = {};
    categories.forEach(cat => {
      reset[cat.name] = 0;
    });
    setAdjustments(reset);
    setSimulationResult(null);
  };

  if (!data || !categories.length) return null;

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-dark-700 bg-gradient-to-r from-purple-600/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-purple-400" />
            <h3 className="font-medium text-white">{data.title || 'Budget Simulator'}</h3>
          </div>
          <button
            onClick={resetAdjustments}
            className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
            title="Reset all adjustments"
            aria-label="Reset adjustments"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-dark-400 mt-1">
          Adjust categories to see potential savings
        </p>
      </div>

      {/* Goal Progress */}
      {data.goalAmount && (
        <div className="p-4 bg-dark-900/50 border-b border-dark-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-dark-400 flex items-center gap-2">
              <PiggyBank className="w-4 h-4" />
              Goal: Save ₹{(originalBudget - goalAmount).toLocaleString()}
            </span>
            <span className={`font-medium ${goalProgress >= 100 ? 'text-primary-400' : 'text-amber-400'}`}>
              {Math.min(100, Math.max(0, goalProgress)).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                goalProgress >= 100 ? 'bg-primary-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, goalProgress))}%` }}
            />
          </div>
        </div>
      )}

      {/* Category Sliders */}
      <div className="p-4 space-y-4">
        {categories.map((category) => {
          const adjustment = adjustments[category.name] || 0;
          const adjustedAmount = category.amount * (1 + adjustment / 100);
          const difference = adjustedAmount - category.amount;
          
          return (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{category.name}</span>
                  {category.isFixed && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-dark-700 text-dark-400 rounded">
                      Fixed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-dark-400">
                    ₹{category.amount.toLocaleString()}
                  </span>
                  <span className={`text-xs font-medium ${
                    adjustment > 0 ? 'text-red-400' : 
                    adjustment < 0 ? 'text-primary-400' : 
                    'text-dark-500'
                  }`}>
                    → ₹{Math.round(adjustedAmount).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={adjustment}
                  onChange={(e) => handleSliderChange(category.name, e.target.value)}
                  disabled={category.isFixed}
                  className={`w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-primary-500
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-110
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  aria-label={`Adjust ${category.name} by percentage`}
                />
                
                {/* Center marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-dark-600 pointer-events-none" />
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-400">-50%</span>
                <span className={`font-medium ${
                  adjustment > 0 ? 'text-red-400' : 
                  adjustment < 0 ? 'text-primary-400' : 
                  'text-dark-400'
                }`}>
                  {adjustment > 0 ? '+' : ''}{adjustment}%
                  {difference !== 0 && (
                    <span className="ml-1">
                      ({difference > 0 ? '+' : ''}₹{Math.round(difference).toLocaleString()})
                    </span>
                  )}
                </span>
                <span className="text-red-400">+50%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-4 bg-dark-900/50 border-t border-dark-700">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-dark-800 rounded-lg">
            <p className="text-2xl font-bold text-white">₹{Math.round(projectedBudget).toLocaleString()}</p>
            <p className="text-xs text-dark-500">Projected Spend</p>
          </div>
          <div className="text-center p-3 bg-dark-800 rounded-lg">
            <p className={`text-2xl font-bold ${savings >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
              {savings >= 0 ? '+' : ''}₹{Math.round(savings).toLocaleString()}
            </p>
            <p className="text-xs text-dark-500">
              {savings >= 0 ? 'Potential Savings' : 'Over Budget'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSimulate}
          disabled={isSimulating || savings === 0}
          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-dark-700 disabled:text-dark-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isSimulating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <SlidersHorizontal className="w-4 h-4" />
              Apply This Scenario
            </>
          )}
        </button>
      </div>

      {/* Simulation Result */}
      {simulationResult && (
        <div className="p-4 border-t border-dark-700 bg-primary-500/5">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">{simulationResult.title}</p>
              <p className="text-xs text-dark-400 mt-1">{simulationResult.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      {data.tips && data.tips.length > 0 && (
        <div className="p-4 border-t border-dark-700">
          <h4 className="text-xs font-medium text-dark-400 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-400" />
            Tips
          </h4>
          <ul className="space-y-1">
            {data.tips.map((tip, idx) => (
              <li key={idx} className="text-xs text-dark-300 flex items-start gap-2">
                <span className="text-amber-400">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SimulationSlider;
