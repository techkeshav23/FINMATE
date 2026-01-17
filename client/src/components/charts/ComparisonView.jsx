import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { 
  ArrowLeftRight, TrendingUp, TrendingDown, Calendar, 
  ChevronDown, ChevronUp, Minus
} from 'lucide-react';

/**
 * ComparisonView - Side-by-side period comparison
 * 
 * PS.md Alignment:
 * - "Comparisons for decisions"
 * - "Breaks confusing financial data into clear, focused views"
 * - "Timeline for 'What changed this month?'"
 * - "Lets users compare, simulate, and explore scenarios"
 */

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ComparisonView = ({ data }) => {
  const [viewMode, setViewMode] = useState('bar'); // bar, table
  
  if (!data || !data.comparison) return null;
  
  const { period1, period2, comparison } = data;
  
  // Calculate totals
  const total1 = comparison.reduce((sum, c) => sum + c.amount1, 0);
  const total2 = comparison.reduce((sum, c) => sum + c.amount2, 0);
  const totalChange = total2 - total1;
  const totalChangePercent = total1 > 0 ? ((totalChange / total1) * 100).toFixed(1) : 0;

  // Prepare chart data
  const chartData = comparison.map(item => ({
    name: item.category || item.name,
    [period1.label]: item.amount1,
    [period2.label]: item.amount2,
    change: item.change,
    changePercent: item.changePercent
  }));

  const getTrendIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-primary-400" />;
    return <Minus className="w-4 h-4 text-dark-500" />;
  };

  const getTrendColor = (change) => {
    if (change > 10) return 'text-red-400';
    if (change < -10) return 'text-primary-400';
    return 'text-dark-400';
  };

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary-400" />
            {data.title || 'Comparison View'}
          </h3>
          <div className="flex gap-1 bg-dark-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode('bar')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'bar' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
              }`}
              aria-pressed={viewMode === 'bar'}
            >
              Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
              }`}
              aria-pressed={viewMode === 'table'}
            >
              Table
            </button>
          </div>
        </div>
        
        {/* Period Labels */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-dark-400">{period1.label}</span>
            <span className="text-white font-medium">₹{total1.toLocaleString()}</span>
          </div>
          <span className="text-dark-600">vs</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary-500" />
            <span className="text-dark-400">{period2.label}</span>
            <span className="text-white font-medium">₹{total2.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-4 bg-dark-900/50 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-400">Overall Change</span>
          <div className="flex items-center gap-2">
            {getTrendIcon(totalChange)}
            <span className={`font-semibold ${getTrendColor(parseFloat(totalChangePercent))}`}>
              {totalChange > 0 ? '+' : ''}₹{totalChange.toLocaleString()} ({totalChangePercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Chart View */}
      {viewMode === 'bar' && (
        <div className="p-4">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f1f5f9'
                }}
                formatter={(value) => [`₹${value.toLocaleString()}`, '']}
              />
              <Bar dataKey={period1.label} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey={period2.label} fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400">Category</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-dark-400">{period1.label}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-dark-400">{period2.label}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-dark-400">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {comparison.map((item, idx) => (
                <tr key={idx} className="hover:bg-dark-700/30">
                  <td className="px-4 py-3 text-white">{item.category || item.name}</td>
                  <td className="px-4 py-3 text-right text-dark-300">₹{item.amount1.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-dark-300">₹{item.amount2.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {getTrendIcon(item.change)}
                      <span className={getTrendColor(item.changePercent)}>
                        {item.change > 0 ? '+' : ''}{item.changePercent}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-dark-900/50">
              <tr>
                <td className="px-4 py-3 text-white font-medium">Total</td>
                <td className="px-4 py-3 text-right text-white font-medium">₹{total1.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-white font-medium">₹{total2.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${getTrendColor(parseFloat(totalChangePercent))}`}>
                    {totalChangePercent > 0 ? '+' : ''}{totalChangePercent}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <div className="p-4 border-t border-dark-700">
          <h4 className="text-xs font-medium text-dark-400 mb-2">Key Insights</h4>
          <ul className="space-y-1">
            {data.insights.map((insight, idx) => (
              <li key={idx} className="text-xs text-dark-300 flex items-start gap-2">
                <span className="text-primary-400">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ComparisonView;
