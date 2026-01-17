import { useState } from 'react';
import { 
  Sliders, TrendingUp, TrendingDown, RefreshCw, 
  DollarSign, Percent, Calculator, Play, RotateCcw
} from 'lucide-react';

const SimulationSlider = ({ data, onSimulate }) => {
  // Default scenario values
  const [scenarios, setScenarios] = useState({
    rentChange: 0,
    utilitiesChange: 0,
    foodChange: 0,
    newExpense: 0,
    newExpenseCategory: 'Other'
  });
  
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const baselineData = data?.baseline || {
    rent: 15000,
    utilities: 3000,
    food: 8000,
    other: 4000,
    total: 30000,
    perPerson: 10000,
    roommates: 3
  };

  const categories = ['Food', 'Utilities', 'Entertainment', 'Household', 'Other'];

  const calculateProjection = () => {
    setIsCalculating(true);
    
    // Simulate calculation delay for UX
    setTimeout(() => {
      const projected = {
        rent: baselineData.rent * (1 + scenarios.rentChange / 100),
        utilities: baselineData.utilities * (1 + scenarios.utilitiesChange / 100),
        food: baselineData.food * (1 + scenarios.foodChange / 100),
        other: baselineData.other + scenarios.newExpense
      };
      
      projected.total = projected.rent + projected.utilities + projected.food + projected.other;
      projected.perPerson = Math.round(projected.total / baselineData.roommates);
      projected.change = projected.total - baselineData.total;
      projected.changePercent = ((projected.change / baselineData.total) * 100).toFixed(1);
      
      // Calculate individual impact
      projected.impacts = [
        { category: 'Rent', baseline: baselineData.rent, projected: projected.rent, change: projected.rent - baselineData.rent },
        { category: 'Utilities', baseline: baselineData.utilities, projected: projected.utilities, change: projected.utilities - baselineData.utilities },
        { category: 'Food', baseline: baselineData.food, projected: projected.food, change: projected.food - baselineData.food },
        { category: 'Other', baseline: baselineData.other, projected: projected.other, change: projected.other - baselineData.other }
      ];
      
      setResults(projected);
      setIsCalculating(false);
      
      // Notify parent if needed
      if (onSimulate) {
        onSimulate(projected);
      }
    }, 500);
  };

  const resetScenarios = () => {
    setScenarios({
      rentChange: 0,
      utilitiesChange: 0,
      foodChange: 0,
      newExpense: 0,
      newExpenseCategory: 'Other'
    });
    setResults(null);
  };

  const SliderInput = ({ label, value, onChange, min = -50, max = 50, unit = '%', icon: Icon }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-dark-300 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary-400" />}
          {label}
        </label>
        <span className={`text-sm font-medium ${
          value > 0 ? 'text-red-400' : value < 0 ? 'text-primary-400' : 'text-dark-400'
        }`}>
          {value > 0 ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer slider-thumb"
        style={{
          background: `linear-gradient(to right, 
            ${value < 0 ? '#22c55e' : '#334155'} 0%, 
            ${value < 0 ? '#22c55e' : '#334155'} ${50 + (min < 0 ? 50 : 0)}%, 
            ${value > 0 ? '#ef4444' : '#334155'} ${50 + (min < 0 ? 50 : 0)}%, 
            ${value > 0 ? '#ef4444' : '#334155'} 100%)`
        }}
      />
      <div className="flex justify-between text-xs text-dark-500">
        <span>{min}{unit}</span>
        <span>0{unit}</span>
        <span>+{max}{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-dark-700 bg-gradient-to-r from-primary-600/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary-400" />
            <h3 className="font-medium text-white">What-If Scenario Simulator</h3>
          </div>
          <button
            onClick={resetScenarios}
            className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors text-dark-400 hover:text-white"
            title="Reset all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-dark-400 mt-1">
          Adjust the sliders to see how changes would affect your expenses
        </p>
      </div>

      {/* Scenario Sliders */}
      <div className="p-4 space-y-6">
        <SliderInput
          label="Rent Change"
          value={scenarios.rentChange}
          onChange={(val) => setScenarios(s => ({ ...s, rentChange: val }))}
          icon={DollarSign}
        />
        
        <SliderInput
          label="Utilities Change"
          value={scenarios.utilitiesChange}
          onChange={(val) => setScenarios(s => ({ ...s, utilitiesChange: val }))}
          icon={Percent}
        />
        
        <SliderInput
          label="Food Budget Change"
          value={scenarios.foodChange}
          onChange={(val) => setScenarios(s => ({ ...s, foodChange: val }))}
          icon={TrendingUp}
        />

        {/* New Expense Input */}
        <div className="space-y-2">
          <label className="text-sm text-dark-300 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary-400" />
            Add New Monthly Expense
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">₹</span>
              <input
                type="number"
                value={scenarios.newExpense}
                onChange={(e) => setScenarios(s => ({ ...s, newExpense: parseInt(e.target.value) || 0 }))}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-8 pr-3 py-2 text-white focus:border-primary-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <select
              value={scenarios.newExpenseCategory}
              onChange={(e) => setScenarios(s => ({ ...s, newExpenseCategory: e.target.value }))}
              className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Calculate Button */}
        <button
          onClick={calculateProjection}
          disabled={isCalculating}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isCalculating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Calculate Projection
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="p-4 border-t border-dark-700 bg-dark-900/50 space-y-4 animate-fade-in">
          <h4 className="text-sm font-medium text-dark-300">Projection Results</h4>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-dark-800 rounded-lg">
              <p className="text-xs text-dark-500">Current Monthly</p>
              <p className="text-lg font-semibold text-white">₹{baselineData.total.toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-lg ${results.change > 0 ? 'bg-red-500/10' : 'bg-primary-500/10'}`}>
              <p className="text-xs text-dark-500">Projected Monthly</p>
              <p className={`text-lg font-semibold ${results.change > 0 ? 'text-red-400' : 'text-primary-400'}`}>
                ₹{Math.round(results.total).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Change Summary */}
          <div className={`p-3 rounded-lg flex items-center justify-between ${
            results.change > 0 ? 'bg-red-500/10 border border-red-500/30' : 
            results.change < 0 ? 'bg-primary-500/10 border border-primary-500/30' :
            'bg-dark-800 border border-dark-700'
          }`}>
            <div className="flex items-center gap-2">
              {results.change > 0 ? (
                <TrendingUp className="w-5 h-5 text-red-400" />
              ) : results.change < 0 ? (
                <TrendingDown className="w-5 h-5 text-primary-400" />
              ) : (
                <span className="w-5 h-5 text-dark-400">—</span>
              )}
              <span className="text-sm text-dark-300">Net Change</span>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${
                results.change > 0 ? 'text-red-400' : results.change < 0 ? 'text-primary-400' : 'text-dark-400'
              }`}>
                {results.change > 0 ? '+' : ''}₹{Math.round(results.change).toLocaleString()}
              </p>
              <p className="text-xs text-dark-500">({results.changePercent}%)</p>
            </div>
          </div>

          {/* Per Person Impact */}
          <div className="p-3 bg-dark-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-400">Per Person Impact</span>
              <span className={`font-medium ${
                results.perPerson > baselineData.perPerson ? 'text-red-400' : 'text-primary-400'
              }`}>
                ₹{Math.round(results.perPerson - baselineData.perPerson).toLocaleString()}/month each
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-dark-400">Category Breakdown</h5>
            {results.impacts.map((impact, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-dark-700/50 last:border-0">
                <span className="text-dark-400">{impact.category}</span>
                <div className="flex items-center gap-4">
                  <span className="text-dark-500">₹{impact.baseline.toLocaleString()}</span>
                  <span className="text-dark-600">→</span>
                  <span className="text-white">₹{Math.round(impact.projected).toLocaleString()}</span>
                  <span className={`text-xs ${impact.change > 0 ? 'text-red-400' : impact.change < 0 ? 'text-primary-400' : 'text-dark-500'}`}>
                    {impact.change > 0 ? '+' : ''}{Math.round(impact.change).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationSlider;
