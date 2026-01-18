// ThesysGenUI - Runtime UI Generation from Thesys AI
// This component renders dynamically generated UI specifications from Thesys

import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, ArrowRight, AlertTriangle, CheckCircle,
  IndianRupee, Users, Calendar, Lightbulb, Target, Wallet, PiggyBank,
  ChevronRight, ChevronDown, Info, Sparkles, Zap, BarChart2, PieChartIcon
} from 'lucide-react';

// Color palette for generated charts - vibrant colors for dark theme
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Color normalization - convert unsafe colors to visible ones on dark background
const UNSAFE_COLORS = ['black', '#000', '#000000', '#111', '#222', '#1a1a1a', 'rgb(0,0,0)', 'dark', 'transparent'];
const COLOR_MAP = {
  // Black/dark to light
  'black': '#e2e8f0',
  '#000': '#e2e8f0',
  '#000000': '#e2e8f0',
  '#111': '#e2e8f0',
  '#222': '#94a3b8',
  // Semantic colors for dark theme
  'red': '#ef4444',
  'green': '#22c55e',
  'blue': '#3b82f6',
  'yellow': '#f59e0b',
  'orange': '#f97316',
  'purple': '#8b5cf6',
  'pink': '#ec4899',
  'gray': '#94a3b8',
  'white': '#ffffff',
  // Common low-contrast fixes
  'text-black': 'text-white',
  'text-gray-900': 'text-white',
  'text-gray-800': 'text-gray-100',
  'bg-white': 'bg-dark-800',
  'bg-gray-100': 'bg-dark-700',
};

// Sanitize color value for dark theme visibility
const sanitizeColor = (color) => {
  if (!color) return null;
  const colorLower = color.toLowerCase().trim();
  
  // Check if it's an unsafe color
  if (UNSAFE_COLORS.some(unsafe => colorLower.includes(unsafe))) {
    return COLOR_MAP[colorLower] || '#e2e8f0'; // Default to light gray
  }
  
  // Check color map
  if (COLOR_MAP[colorLower]) {
    return COLOR_MAP[colorLower];
  }
  
  // Return original if it seems safe
  return color;
};

// Sanitize Tailwind class for dark theme
const sanitizeTextClass = (className) => {
  if (!className) return 'text-white';
  
  // Fix common problematic classes
  const fixes = {
    'text-black': 'text-white',
    'text-gray-900': 'text-white',
    'text-gray-800': 'text-gray-100',
    'text-gray-700': 'text-gray-200',
    'text-dark': 'text-white',
  };
  
  for (const [bad, good] of Object.entries(fixes)) {
    if (className.includes(bad)) {
      return className.replace(bad, good);
    }
  }
  
  return className;
};

// Icon mapping for dynamic icon rendering
const ICON_MAP = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'arrow-right': ArrowRight,
  'alert': AlertTriangle,
  'check': CheckCircle,
  'rupee': IndianRupee,
  'users': Users,
  'calendar': Calendar,
  'lightbulb': Lightbulb,
  'target': Target,
  'wallet': Wallet,
  'piggy': PiggyBank,
  'info': Info,
  'sparkles': Sparkles,
  'zap': Zap,
  'bar-chart': BarChart2,
  'pie-chart': PieChartIcon
};

// Dynamic Text Block - Renders AI-generated text with styling
const DynamicText = ({ spec }) => {
  const { text, style = 'normal', color, size = 'base', highlight } = spec;
  
  const textClasses = {
    normal: 'text-gray-200',
    bold: 'font-bold text-white',
    muted: 'text-gray-400',
    accent: 'text-primary-400',
    warning: 'text-amber-400',
    success: 'text-green-400',
    error: 'text-red-400'
  };
  
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl'
  };
  
  // Handle custom color - sanitize for dark theme
  const customStyle = color ? { color: sanitizeColor(color) } : {};
  const baseClass = textClasses[style] || textClasses.normal;
  
  return (
    <span 
      className={`${color ? '' : baseClass} ${sizeClasses[size]}`}
      style={customStyle}
    >
      {highlight ? <mark className="bg-primary-500/20 px-1 rounded text-white">{text}</mark> : text}
    </span>
  );
};

// Dynamic Metric Card - For key numbers
const DynamicMetricCard = ({ spec, onAction }) => {
  const { label, value, change, changeType, icon, action, subtext, comparison } = spec;
  const Icon = ICON_MAP[icon] || IndianRupee;
  
  return (
    <div 
      className={`bg-dark-800 rounded-xl p-4 border border-dark-700 ${action ? 'cursor-pointer hover:border-primary-500/50 transition-colors' : ''}`}
      onClick={() => action && onAction && onAction(action)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-500/10 rounded-lg">
            <Icon className="w-4 h-4 text-primary-400" />
          </div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${changeType === 'positive' ? 'text-green-400' : changeType === 'negative' ? 'text-red-400' : 'text-gray-400'}`}>
            {changeType === 'positive' ? <TrendingUp className="w-3 h-3" /> : changeType === 'negative' ? <TrendingDown className="w-3 h-3" /> : null}
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-white">{typeof value === 'number' ? `₹${value.toLocaleString()}` : value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        {comparison && (
          <p className="text-xs text-gray-300 mt-2 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {comparison}
          </p>
        )}
      </div>
      {action && (
        <div className="mt-3 pt-3 border-t border-dark-700 flex items-center justify-between">
          <span className="text-xs text-primary-400">{action.label || 'Explore'}</span>
          <ChevronRight className="w-4 h-4 text-primary-400" />
        </div>
      )}
    </div>
  );
};

// Dynamic Chart - Runtime generated chart from spec
const DynamicChart = ({ spec, onDrillDown }) => {
  const { type, data, config = {}, title, subtitle, drillDownEnabled } = spec;
  
  const handleClick = (entry) => {
    if (drillDownEnabled && onDrillDown && entry) {
      const label = entry.name || entry.category || entry.label;
      onDrillDown(`Tell me more about ${label}`);
    }
  };
  
  const chartConfig = {
    xKey: config.xKey || 'name',
    yKey: config.yKey || 'value',
    colors: config.colors || COLORS,
    height: config.height || 220,
    showLegend: config.showLegend !== false,
    animate: config.animate !== false
  };

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
      {title && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            {type === 'bar' && <BarChart2 className="w-4 h-4 text-primary-400" />}
            {type === 'pie' && <PieChartIcon className="w-4 h-4 text-primary-400" />}
            {type === 'line' && <TrendingUp className="w-4 h-4 text-primary-400" />}
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={chartConfig.height}>
        {type === 'bar' ? (
          <BarChart data={data} onClick={handleClick} style={{ cursor: drillDownEnabled ? 'pointer' : 'default' }}>
            <XAxis dataKey={chartConfig.xKey} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v) => [`₹${v.toLocaleString()}`, 'Amount']}
            />
            <Bar dataKey={chartConfig.yKey} radius={[4, 4, 0, 0]} animationDuration={chartConfig.animate ? 800 : 0}>
              {data.map((_, i) => <Cell key={i} fill={chartConfig.colors[i % chartConfig.colors.length]} />)}
            </Bar>
          </BarChart>
        ) : type === 'pie' ? (
          <PieChart>
            <Pie 
              data={data} 
              cx="50%" 
              cy="50%" 
              innerRadius={45} 
              outerRadius={75}
              paddingAngle={2}
              dataKey={chartConfig.yKey}
              nameKey={chartConfig.xKey}
              onClick={(_, i) => handleClick(data[i])}
              style={{ cursor: drillDownEnabled ? 'pointer' : 'default' }}
              animationDuration={chartConfig.animate ? 800 : 0}
            >
              {data.map((_, i) => <Cell key={i} fill={chartConfig.colors[i % chartConfig.colors.length]} />)}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v) => [`₹${v.toLocaleString()}`, 'Amount']}
            />
            {chartConfig.showLegend && <Legend formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>} />}
          </PieChart>
        ) : type === 'line' || type === 'area' ? (
          <AreaChart data={data} onClick={handleClick} style={{ cursor: drillDownEnabled ? 'pointer' : 'default' }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={chartConfig.xKey} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v) => [`₹${v.toLocaleString()}`, 'Amount']}
            />
            <Area type="monotone" dataKey={chartConfig.yKey} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} animationDuration={chartConfig.animate ? 800 : 0} />
          </AreaChart>
        ) : null}
      </ResponsiveContainer>
      
      {drillDownEnabled && (
        <p className="text-xs text-gray-500 mt-3 text-center">Click any element to explore further</p>
      )}
    </div>
  );
};

// Dynamic List - For settlements, transactions, insights
const DynamicList = ({ spec, onAction }) => {
  const { items, title, type = 'default', showIndex, emptyMessage } = spec;
  
  if (!items || items.length === 0) {
    return emptyMessage ? (
      <div className="bg-dark-800 rounded-xl p-4 border border-dark-700 text-center">
        <CheckCircle className="w-8 h-8 text-primary-400 mx-auto mb-2" />
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    ) : null;
  }
  
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {title && (
        <div className="p-3 border-b border-dark-700 bg-dark-900/50">
          <h4 className="text-sm font-medium text-white">{title}</h4>
        </div>
      )}
      <div className="divide-y divide-dark-700">
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className={`p-3 flex items-center gap-3 ${item.action ? 'cursor-pointer hover:bg-dark-700/50 transition-colors' : ''}`}
            onClick={() => item.action && onAction && onAction(item.action)}
          >
            {showIndex && (
              <span className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-xs text-gray-400">
                {idx + 1}
              </span>
            )}
            {item.icon && (
              <div className={`p-1.5 rounded-lg ${item.iconBg || 'bg-primary-500/10'}`}>
                {(() => { const Icon = ICON_MAP[item.icon] || Info; return <Icon className={`w-4 h-4 ${item.iconColor || 'text-primary-400'}`} />; })()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{item.title || item.text}</p>
              {item.subtitle && <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>}
            </div>
            {item.value !== undefined && (
              <span 
                className={`text-sm font-medium ${sanitizeTextClass(item.valueColor) || 'text-white'}`}
                style={item.valueColor && !item.valueColor.startsWith('text-') ? { color: sanitizeColor(item.valueColor) } : {}}
              >
                {typeof item.value === 'number' ? `₹${item.value.toLocaleString()}` : item.value}
              </span>
            )}
            {item.badge && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${sanitizeTextClass(item.badgeColor) || 'bg-primary-500/20 text-primary-400'}`}>
                {item.badge}
              </span>
            )}
            {item.action && <ChevronRight className="w-4 h-4 text-dark-500" />}
          </div>
        ))}
      </div>
    </div>
  );
};

// Dynamic Insight Card - For AI-generated insights
const DynamicInsightCard = ({ spec, onAction }) => {
  const { insight, type = 'info', explanation, action, confidence } = spec;
  
  const typeStyles = {
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info, iconColor: 'text-blue-400' },
    success: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: CheckCircle, iconColor: 'text-green-400' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle, iconColor: 'text-amber-400' },
    idea: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: Lightbulb, iconColor: 'text-purple-400' },
    highlight: { bg: 'bg-primary-500/10', border: 'border-primary-500/30', icon: Sparkles, iconColor: 'text-primary-400' }
  };
  
  const style = typeStyles[type] || typeStyles.info;
  const Icon = style.icon;
  
  return (
    <div className={`${style.bg} border ${style.border} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className="text-sm text-white font-medium">{insight}</p>
          {explanation && <p className="text-xs text-gray-300 mt-1">{explanation}</p>}
          {confidence && (
            <p className="text-xs text-gray-400 mt-2">
              Confidence: <span className={confidence === 'high' ? 'text-green-400' : confidence === 'medium' ? 'text-amber-400' : 'text-red-400'}>{confidence}</span>
            </p>
          )}
        </div>
      </div>
      {action && (
        <button
          onClick={() => onAction && onAction(action)}
          className="mt-3 w-full py-2 text-sm text-primary-400 bg-dark-800/50 hover:bg-dark-800 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {action.label || 'Learn more'}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Dynamic Comparison - Side by side comparison
const DynamicComparison = ({ spec }) => {
  const { left, right, title, metrics } = spec;
  
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {title && (
        <div className="p-3 border-b border-dark-700 bg-dark-900/50">
          <h4 className="text-sm font-medium text-white">{title}</h4>
        </div>
      )}
      <div className="grid grid-cols-2 divide-x divide-dark-700">
        <div className="p-3">
          <p className="text-xs text-gray-400 text-center mb-2">{left.label}</p>
          <p className="text-xl font-bold text-white text-center">{typeof left.value === 'number' ? `₹${left.value.toLocaleString()}` : left.value}</p>
        </div>
        <div className="p-3">
          <p className="text-xs text-gray-400 text-center mb-2">{right.label}</p>
          <p className="text-xl font-bold text-white text-center">{typeof right.value === 'number' ? `₹${right.value.toLocaleString()}` : right.value}</p>
        </div>
      </div>
      {metrics && (
        <div className="p-3 border-t border-dark-700 space-y-2">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{m.label}</span>
              <span className={m.change > 0 ? 'text-red-400' : m.change < 0 ? 'text-green-400' : 'text-gray-300'}>
                {m.change > 0 ? '+' : ''}{m.change}% {m.direction}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Dynamic Grid Layout - For arranging multiple elements
const DynamicGrid = ({ spec, onAction, onDrillDown }) => {
  const { columns = 2, gap = 3, items } = spec;
  
  return (
    <div className={`grid grid-cols-${columns} gap-${gap}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `${gap * 4}px` }}>
      {items.map((item, idx) => (
        <ThesysGenUIRenderer key={idx} spec={item} onAction={onAction} onDrillDown={onDrillDown} />
      ))}
    </div>
  );
};

// Dynamic Flow - Step by step guide
const DynamicFlow = ({ spec, onAction }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { steps, title, allowSkip } = spec;
  
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {title && (
        <div className="p-3 border-b border-dark-700 bg-gradient-to-r from-primary-600/10 to-transparent">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-400" />
            {title}
          </h4>
        </div>
      )}
      <div className="p-4 space-y-3">
        {steps.map((step, idx) => (
          <div 
            key={idx} 
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
              idx === currentStep ? 'bg-primary-500/10 ring-1 ring-primary-500/30' : 
              idx < currentStep ? 'bg-dark-900/50 opacity-60' : 'bg-dark-900/30'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              idx < currentStep ? 'bg-primary-500 text-white' : 
              idx === currentStep ? 'bg-primary-500/20 text-primary-400 ring-2 ring-primary-500' : 
              'bg-dark-700 text-dark-500'
            }`}>
              {idx < currentStep ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs">{idx + 1}</span>}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${idx === currentStep ? 'text-white' : 'text-gray-400'}`}>{step.title}</p>
              {step.detail && idx === currentStep && (
                <p className="text-xs text-gray-400 mt-1">{step.detail}</p>
              )}
              {step.action && idx === currentStep && (
                <button
                  onClick={() => {
                    onAction && onAction(step.action);
                    setCurrentStep(idx + 1);
                  }}
                  className="mt-2 px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  {step.action.label || 'Continue'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {allowSkip && currentStep < steps.length && (
        <div className="p-3 border-t border-dark-700">
          <button 
            onClick={() => setCurrentStep(steps.length)}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Skip all steps
          </button>
        </div>
      )}
    </div>
  );
};

// Main GenUI Renderer - Interprets Thesys-generated specs and renders React components
const ThesysGenUIRenderer = ({ spec, onAction, onDrillDown }) => {
  if (!spec) return null;
  
  // Handle array of specs
  if (Array.isArray(spec)) {
    return (
      <div className="space-y-4">
        {spec.map((item, idx) => (
          <ThesysGenUIRenderer key={idx} spec={item} onAction={onAction} onDrillDown={onDrillDown} />
        ))}
      </div>
    );
  }
  
  const { component, ...props } = spec;
  
  switch (component) {
    case 'text':
      return <DynamicText spec={props} />;
    case 'metric':
    case 'metric_card':
      return <DynamicMetricCard spec={props} onAction={onAction} />;
    case 'chart':
    case 'dynamic_chart':
      return <DynamicChart spec={props} onDrillDown={onDrillDown} />;
    case 'list':
    case 'dynamic_list':
      return <DynamicList spec={props} onAction={onAction} />;
    case 'insight':
    case 'insight_card':
      return <DynamicInsightCard spec={props} onAction={onAction} />;
    case 'comparison':
      return <DynamicComparison spec={props} />;
    case 'grid':
      return <DynamicGrid spec={props} onAction={onAction} onDrillDown={onDrillDown} />;
    case 'flow':
    case 'steps':
      return <DynamicFlow spec={props} onAction={onAction} />;
    case 'container':
      return (
        <div className={`bg-dark-800 rounded-xl border border-dark-700 p-4 ${props.className || ''}`}>
          {props.title && <h3 className="text-sm font-medium text-white mb-3">{props.title}</h3>}
          <ThesysGenUIRenderer spec={props.children} onAction={onAction} onDrillDown={onDrillDown} />
        </div>
      );
    default:
      // Attempt to render raw data
      if (props.data) {
        return (
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <pre className="text-xs text-dark-400 overflow-auto">{JSON.stringify(props, null, 2)}</pre>
          </div>
        );
      }
      return null;
  }
};

// Main Export - ThesysGenUI Component
const ThesysGenUI = ({ generatedUI, onAction, onDrillDown }) => {
  // generatedUI is the spec from Thesys API
  if (!generatedUI) return null;
  
  return (
    <div className="thesys-genui-container">
      <ThesysGenUIRenderer spec={generatedUI} onAction={onAction} onDrillDown={onDrillDown} />
    </div>
  );
};

export { ThesysGenUI, ThesysGenUIRenderer };
export default ThesysGenUI;
