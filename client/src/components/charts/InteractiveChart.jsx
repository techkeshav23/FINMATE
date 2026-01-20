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
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-xl">
    {children}
  </div>
);

// Helper for formatting values with units
const formatValue = (val, unit = '₹') => {
  if (val === undefined || val === null) return '';
  // Check if unit is actually needed (e.g., if val is a count)
  return `${unit}${val.toLocaleString()}`; 
};

/**
 * InteractiveBarChart - Bar chart with drill-down capability
 * 
 * @param {Object} data - Chart data with { data: [], total: number }
 * @param {string} title - Chart title
 * @param {Function} onDrillDown - Callback when bar is clicked
 * @param {Array} series - Optional: Array of keys for multiple series
 * @param {string} unit - Optional: Unit prefix (default: ₹)
 */
export const InteractiveBarChart = ({ data, title, onDrillDown, series, unit = '₹' }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [selectedBar, setSelectedBar] = useState(null);

  // Normalize data (support both array and {data: [], total: 0} formats)
  const chartData = Array.isArray(data) ? data : (data?.data || []);
  
  // Calculate total
  let total = 0;
  if (!Array.isArray(data) && data?.total) {
    total = data.total;
  } else {
    // If series exists, sum the first series (usually primary metric like Income)
    const key = series ? series[0] : 'amount';
    total = chartData.reduce((sum, item) => sum + (item[key] || 0), 0);
  }

  const handleBarClick = (entry, dataKey = 'amount') => {
    setSelectedBar(`${entry.name} - ${dataKey}`);
    if (onDrillDown) {
      const drillDownKey = series ? `${dataKey} for ${entry.name}` : entry.name;
      onDrillDown(`Show me ${drillDownKey} transactions`);
    }
  };

  return (
    <div className="bg-white rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-gray-200 w-full overflow-hidden">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h3 className="text-[11px] sm:text-sm font-medium text-gray-700 flex items-center gap-1.5 sm:gap-2">
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600" />
          {title || 'Spending Breakdown'}
        </h3>
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <ZoomIn className="w-3 h-3" />
          <span>Click to drill down</span>
        </div>
      </div>
      
      <div className="w-full overflow-x-auto -mx-1 px-1">
        <ResponsiveContainer width="100%" height={140} minWidth={200}>
          <BarChart data={chartData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={40}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(value) => `${unit}${(value/1000).toFixed(0)}k`}
              width={45}
            />
            <Tooltip 
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              color: '#1f2937'
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <CustomTooltip>
                    <p className="text-gray-900 font-medium">{item.name}</p>
                    {payload.map((p, idx) => (
                      <p key={idx} className="text-sm font-semibold" style={{ color: p.color }}>
                        {p.name}: {formatValue(p.value, unit)}
                      </p>
                    ))}
                    {item.percentage && (
                      <p className="text-gray-500 text-xs">{item.percentage}% of total</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-1 text-xs text-primary-600">
                      <ZoomIn className="w-3 h-3" />
                      <span>Click to see details</span>
                    </div>
                  </CustomTooltip>
                );
              }
              return null;
            }}
          />
          {series ? (
            series.map((s, idx) => (
              <Bar
                key={s}
                dataKey={s}
                radius={[4, 4, 0, 0]}
                fill={COLORS[idx % COLORS.length]}
                cursor="pointer"
              />
            ))
          ) : (
            <Bar 
              dataKey="amount" 
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onMouseEnter={(data) => setHoveredBar(data.name)}
              onMouseLeave={() => setHoveredBar(null)}
              onClick={(data) => handleBarClick(data)}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={selectedBar === entry.name ? '#3b82f6' : 
                        hoveredBar === entry.name ? '#4ade80' : '#22c55e'}
                  className="transition-all duration-200"
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
      </div>

      {/* Drill-down hint */}
      {selectedBar && (
        <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-primary-500/10 border border-primary-500/30 rounded-lg flex items-center justify-between animate-fade-in">
          <span className="text-[10px] sm:text-sm text-primary-600">
            Showing <strong>{selectedBar}</strong>
          </span>
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600" />
        </div>
      )}

      <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-200 flex items-center justify-between">
        <span className="text-gray-500 text-[10px] sm:text-sm">Total</span>
        <span className="text-gray-900 font-semibold text-xs sm:text-base">{formatValue(total, unit)}</span>
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
 * @param {string} unit - Optional: Unit prefix (default: ₹)
 */
export const InteractivePieChart = ({ data, title, onDrillDown, unit = '₹' }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Normalize data
  const chartData = Array.isArray(data) ? data : (data?.data || []);

  const handlePieClick = (entry) => {
    const category = entry.category || entry.name;
    setSelectedCategory(category);
    if (onDrillDown) {
      onDrillDown(`Show me all ${category} transactions`);
    }
  };

  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 w-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary-600" />
          {title || 'Category Distribution'}
        </h3>
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <Layers className="w-3 h-3" />
          <span>Click to explore</span>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <ResponsiveContainer width="100%" height={140} className="sm:!h-[180px]">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={activeIndex !== null ? 55 : 50}
              paddingAngle={2}
              dataKey="amount"
              nameKey="category"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={(entry) => handlePieClick(entry)}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
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
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              color: '#1f2937'
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <CustomTooltip>
                    <p className="text-gray-900 font-medium">{item.category}</p>
                    <p className="text-primary-600 text-lg">{formatValue(item.amount, unit)}</p>
                    <p className="text-gray-500 text-xs">{item.percentage}% of spending</p>
                    <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-1 text-xs text-amber-400">
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
      </div>

      {/* Category Legend with click */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
        {chartData.slice(0, 6).map((item, index) => (
          <button
            key={index}
            onClick={() => handlePieClick(item)}
            className={`flex items-center gap-1.5 sm:gap-2 text-xs p-1.5 sm:p-2 rounded-lg transition-colors touch-manipulation ${
              selectedCategory === (item.category || item.name)
                ? 'bg-gray-100 ring-1 ring-primary-500'
                : 'hover:bg-gray-100/50 active:bg-gray-100'
            }`}
            aria-label={`View ${item.category} details`}
          >
            <div 
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-gray-500 flex-1 text-left truncate text-[10px] sm:text-xs">{item.category}</span>
            <span className="text-gray-700 text-[10px] sm:text-xs">{item.percentage}%</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Helper for safe date formatting
const formatDateSafe = (value, options = { day: '2-digit', month: 'short' }) => {
  if (!value) return '';
  const d = new Date(value);
  // Check if valid date
  if (Object.prototype.toString.call(d) === "[object Date]" && !isNaN(d.getTime())) {
    return d.toLocaleDateString('en-IN', options);
  }
  // Return original value if not a date (e.g., "Jan 2024" or already formatted string)
  return value;
};

/**
 * InteractiveTimelineChart - Timeline with clickable data points
 * 
 * @param {Object} data - Chart data with { data: [], total: number }
 * @param {string} title - Chart title
 * @param {Function} onDrillDown - Callback when point is clicked
 * @param {string} unit - Optional: Unit prefix (default: ₹)
 */
export const InteractiveTimelineChart = ({ data, title, onDrillDown, unit = '₹' }) => {
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Normalize data
  const chartData = Array.isArray(data) ? data : (data?.data || []);

  const handlePointClick = (point) => {
    setSelectedPoint(point);
    if (onDrillDown && point.date) {
      const dateStr = formatDateSafe(point.date, { day: 'numeric', month: 'long' });
      onDrillDown(`Show me transactions from ${dateStr}`);
    }
  };

  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 w-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary-600" />
          {title || 'Spending Trend'}
        </h3>
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <ZoomIn className="w-3 h-3" />
          <span>Click date for details</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto -mx-2 px-2">
        <ResponsiveContainer width="100%" height={140} minWidth={260} className="sm:!h-[180px]">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(value) => formatDateSafe(value)}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(value) => `${unit}${(value/1000).toFixed(0)}k`}
              width={45}
            />
            <Tooltip 
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <CustomTooltip>
                    <p className="text-gray-900 font-medium">
                      {formatDateSafe(item.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-primary-600 text-lg">{formatValue(item.amount, unit)}</p>
                    {item.count && (
                      <p className="text-gray-500 text-xs">{item.count} transactions</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-1 text-xs text-primary-600">
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
      </div>

      {selectedPoint && (
        <div className="mt-3 p-2 bg-primary-500/10 border border-primary-500/30 rounded-lg flex items-center justify-between animate-fade-in">
          <span className="text-sm text-primary-600">
            Loading transactions for <strong>{formatDateSafe(selectedPoint.date, { day: 'numeric', month: 'long' })}</strong>
          </span>
          <ChevronRight className="w-4 h-4 text-primary-600 animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default { InteractiveBarChart, InteractivePieChart, InteractiveTimelineChart };
