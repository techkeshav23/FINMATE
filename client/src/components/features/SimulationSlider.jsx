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
const SimulationSlider = ({ data, onSimulate, unit = '₹' }) => {
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
    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-2.5 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            <h3 className="text-sm sm:text-base font-medium text-gray-900">{data.title || 'Budget Simulator'}</h3>
          </div>
          <button
            onClick={resetAdjustments}
            className="p-1 sm:p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reset all adjustments"
            aria-label="Reset adjustments"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
          Adjust categories to see potential savings
        </p>
      </div>

      {/* Goal Progress */}
      {data.goalAmount && (
        <div className="p-2.5 sm:p-4 bg-gray-50/50 border-b border-gray-200">
          <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
            <span className="text-gray-600 flex items-center gap-1.5 sm:gap-2">
              <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Goal: Save {unit}{(originalBudget - goalAmount).toLocaleString()}
            </span>
            <span className={`font-medium ${goalProgress >= 100 ? 'text-primary-600' : 'text-amber-400'}`}>
              {Math.min(100, Math.max(0, goalProgress)).toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
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
      <div className="p-2.5 sm:p-4 space-y-3 sm:space-y-4">
        {categories.map((category) => {
          const adjustment = adjustments[category.name] || 0;
          const adjustedAmount = category.amount * (1 + adjustment / 100);
          const difference = adjustedAmount - category.amount;
          
          return (
            <div key={category.name} className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm text-gray-900">{category.name}</span>
                  {category.isFixed && (
                    <span className="px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] bg-gray-100 text-gray-600 rounded">
                      Fixed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-xs text-gray-600">
                    {unit}{category.amount.toLocaleString()}
                  </span>
                  <span className={`text-[10px] sm:text-xs font-medium ${
                    adjustment > 0 ? 'text-red-400' : 
                    adjustment < 0 ? 'text-primary-600' : 
                    'text-gray-500'
                  }`}>
                    → {unit}{Math.round(adjustedAmount).toLocaleString()}
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
                  className={`w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer
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
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-200 pointer-events-none" />
              </div>
              
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-primary-600">-50%</span>
                <span className={`font-medium ${
                  adjustment > 0 ? 'text-red-400' : 
                  adjustment < 0 ? 'text-primary-600' : 
                  'text-gray-600'
                }`}>
                  {adjustment > 0 ? '+' : ''}{adjustment}%
                  {difference !== 0 && (
                    <span className="ml-1">
                      ({difference > 0 ? '+' : ''}{unit}{Math.round(difference).toLocaleString()})
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
      <div className="p-2.5 sm:p-4 bg-gray-50/50 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
          <div className="text-center p-2 sm:p-3 bg-white rounded-lg">
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{unit}{Math.round(projectedBudget).toLocaleString()}</p>
            <p className="text-[10px] sm:text-xs text-gray-600">Projected Spend</p>
          </div>
          <div className="text-center p-2 sm:p-3 bg-white rounded-lg">
            <p className={`text-lg sm:text-2xl font-bold ${savings >= 0 ? 'text-primary-600' : 'text-red-400'}`}>
              {savings >= 0 ? '+' : ''}{unit}{Math.round(savings).toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-600">
              {savings >= 0 ? 'Potential Savings' : 'Over Budget'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSimulate}
          disabled={isSimulating || savings === 0}
          className="w-full py-2.5 sm:py-3 px-3 sm:px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-100 disabled:text-gray-500 text-gray-900 text-sm sm:text-base font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
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
        <div className="p-2.5 sm:p-4 border-t border-gray-200 bg-primary-500/5">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm text-gray-900 font-medium">{simulationResult.title}</p>
              <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">{simulationResult.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      {data.tips && data.tips.length > 0 && (
        <div className="p-2.5 sm:p-4 border-t border-gray-200">
          <h4 className="text-[10px] sm:text-xs font-medium text-gray-600 mb-1.5 sm:mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-400" />
            Tips
          </h4>
          <ul className="space-y-0.5 sm:space-y-1">
            {data.tips.map((tip, idx) => (
              <li key={idx} className="text-[10px] sm:text-xs text-gray-700 flex items-start gap-1.5 sm:gap-2">
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
