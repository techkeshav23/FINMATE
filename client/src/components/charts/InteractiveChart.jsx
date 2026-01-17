import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, Calendar, IndianRupee, ZoomIn, ArrowRight,
  ChevronRight, Layers
} from 'lucide-react';

/**
 * Interactive Charts - Drill-down enabled visualizations
 * 
 * PS.md Alignment:
 * - "Lets users zoom in, filter, and explore"
 * - "Chooses the best way to explain an answer"
 * - "Breaks confusing financial data into clear, focused views"
 * - "Shows the right chart or view at the right moment"
 */

// Color palette for consistent branding
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Custom tooltip component for consistent styling
const CustomTooltip = ({ children }) => (
  <div className="bg-dark-900 border border-dark-700 rounded-lg p-3 shadow-xl">
    {children}
  </div>
);

/**
 * InteractiveBarChart - Bar chart with drill-down capability
 * 
 * @param {Object} data - Chart data with { data: [], total: number }
 * @param {string} title - Chart title
 * @param {Function} onDrillDown - Callback when bar is clicked
 */
export const InteractiveBarChart = ({ data, title, onDrillDown }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [selectedBar, setSelectedBar] = useState(null);

  const handleBarClick = (entry) => {
    setSelectedBar(entry.name);
    if (onDrillDown) {
      onDrillDown(`Show me all ${entry.name} transactions`);
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-400" />
          {title || 'Spending Breakdown'}
        </h3>
        <div className="flex items-center gap-1 text-xs text-dark-500">
          <ZoomIn className="w-3 h-3" />
          <span>Click to drill down</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <CustomTooltip>
                    <p className="text-white font-medium">{item.name}</p>
                    <p className="text-primary-400 text-lg">₹{item.amount?.toLocaleString()}</p>
                    {item.percentage && (
                      <p className="text-dark-400 text-xs">{item.percentage}% of total</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-dark-700 flex items-center gap-1 text-xs text-primary-400">
                      <ZoomIn className="w-3 h-3" />
                      <span>Click to see details</span>
                    </div>
                  </CustomTooltip>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="amount" 
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onMouseEnter={(data) => setHoveredBar(data.name)}
            onMouseLeave={() => setHoveredBar(null)}
            onClick={(data) => handleBarClick(data)}
          >
            {data.data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={selectedBar === entry.name ? '#3b82f6' : 
                      hoveredBar === entry.name ? '#4ade80' : '#22c55e'}
                className="transition-all duration-200"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Drill-down hint */}
      {selectedBar && (
        <div className="mt-3 p-2 bg-primary-500/10 border border-primary-500/30 rounded-lg flex items-center justify-between animate-fade-in">
          <span className="text-sm text-primary-400">
            Showing details for <strong>{selectedBar}</strong>
          </span>
          <ChevronRight className="w-4 h-4 text-primary-400" />
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-dark-700 flex items-center justify-between text-sm">
        <span className="text-dark-400">Total Expenses</span>
        <span className="text-white font-semibold">₹{data.total?.toLocaleString()}</span>
      </div>
    </div>
  );
};

/**
 * InteractivePieChart - Pie chart with clickable segments
 * 
 * @param {Object} data - Chart data with { data: [], total: number }
 * @param {string} title - Chart title
 * @param {Function} onDrillDown - Callback when segment is clicked
 */
export const InteractivePieChart = ({ data, title, onDrillDown }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handlePieClick = (entry) => {
    const category = entry.category || entry.name;
    setSelectedCategory(category);
    if (onDrillDown) {
      onDrillDown(`Show me all ${category} transactions`);
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary-400" />
          {title || 'Category Distribution'}
        </h3>
        <div className="flex items-center gap-1 text-xs text-dark-500">
          <Layers className="w-3 h-3" />
          <span>Click to explore</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data.data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={activeIndex !== null ? 85 : 80}
            paddingAngle={2}
            dataKey="amount"
            nameKey="category"
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={(entry) => handlePieClick(entry)}
            cursor="pointer"
          >
            {data.data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                stroke={activeIndex === index ? '#fff' : 'transparent'}
                strokeWidth={activeIndex === index ? 2 : 0}
                className="transition-all duration-200"
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <CustomTooltip>
                    <p className="text-white font-medium">{item.category}</p>
                    <p className="text-primary-400 text-lg">₹{item.amount?.toLocaleString()}</p>
                    <p className="text-dark-400 text-xs">{item.percentage}% of spending</p>
                    <div className="mt-2 pt-2 border-t border-dark-700 flex items-center gap-1 text-xs text-amber-400">
                      <ZoomIn className="w-3 h-3" />
                      <span>Click to see all {item.category} expenses</span>
                    </div>
                  </CustomTooltip>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Category Legend with click */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.data.map((item, index) => (
          <button
            key={index}
            onClick={() => handlePieClick(item)}
            className={`flex items-center gap-2 text-xs p-2 rounded-lg transition-colors ${
              selectedCategory === (item.category || item.name)
                ? 'bg-dark-700 ring-1 ring-primary-500'
                : 'hover:bg-dark-700/50'
            }`}
            aria-label={`View ${item.category} details`}
          >
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-dark-400 flex-1 text-left truncate">{item.category}</span>
            <span className="text-dark-300">{item.percentage}%</span>
            <ArrowRight className="w-3 h-3 text-dark-600" />
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * InteractiveTimelineChart - Timeline with clickable data points
 * 
 * @param {Object} data - Chart data with { data: [], total: number }
 * @param {string} title - Chart title
 * @param {Function} onDrillDown - Callback when point is clicked
 */
export const InteractiveTimelineChart = ({ data, title, onDrillDown }) => {
  const [selectedPoint, setSelectedPoint] = useState(null);

  const handlePointClick = (point) => {
    setSelectedPoint(point);
    if (onDrillDown && point.date) {
      const date = new Date(point.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
      onDrillDown(`Show me transactions from ${date}`);
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary-400" />
          {title || 'Spending Trend'}
        </h3>
        <div className="flex items-center gap-1 text-xs text-dark-500">
          <ZoomIn className="w-3 h-3" />
          <span>Click date for details</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px'
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <CustomTooltip>
                    <p className="text-white font-medium">
                      {new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-primary-400 text-lg">₹{item.amount?.toLocaleString()}</p>
                    {item.count && (
                      <p className="text-dark-400 text-xs">{item.count} transactions</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-dark-700 flex items-center gap-1 text-xs text-primary-400">
                      <ZoomIn className="w-3 h-3" />
                      <span>Click to see this day's expenses</span>
                    </div>
                  </CustomTooltip>
                );
              }
              return null;
            }}
          />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 4, cursor: 'pointer' }}
            activeDot={{ 
              r: 8, 
              fill: '#22c55e',
              onClick: (e, payload) => handlePointClick(payload.payload)
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      {selectedPoint && (
        <div className="mt-3 p-2 bg-primary-500/10 border border-primary-500/30 rounded-lg flex items-center justify-between animate-fade-in">
          <span className="text-sm text-primary-400">
            Loading transactions for <strong>{new Date(selectedPoint.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</strong>
          </span>
          <ChevronRight className="w-4 h-4 text-primary-400 animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default { InteractiveBarChart, InteractivePieChart, InteractiveTimelineChart };
