import React from 'react';
import { 
  InteractiveBarChart, 
  InteractivePieChart, 
  InteractiveTimelineChart,
  ComparisonView 
} from './charts';
import { 
  AnomalyCard, 
  ChangeDetection, 
  DecisionGuide, 
  SimulationSlider 
} from './features';
import { 
    ClarificationOptions, 
    MetricCard, 
    GaugeCard, 
    ReasoningBlock, 
    AssumptionsBlock, 
    DecisionJustification,
    Container,
    Row,
    Column,
    DashboardGrid
} from './ui';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Target,
  IndianRupee,
  Package,
  ShoppingCart
} from 'lucide-react';

export const COMPONENT_REGISTRY = {
  // Map Native Thesys Components to Local Equivalents
  'Card': ({ children }) => (
    <div className="bg-white p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 shadow-sm space-y-3 sm:space-y-4 overflow-visible">
      {children}
    </div>
  ),
  'InlineHeader': ({ heading, description }) => {
    // Parse markdown bold
    const parseMarkdown = (text) => {
      if (!text) return text;
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };
    
    return (
      <div className="mb-2 sm:mb-3">
        <h3 className="text-sm sm:text-lg font-bold text-gray-900 leading-tight">{heading}</h3>
        {description && <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-1.5 leading-snug">{parseMarkdown(description)}</p>}
      </div>
    );
  },
  
  // Analysis Blocks (Imported)
  'ReasoningBlock': ReasoningBlock,
  'AssumptionsBlock': AssumptionsBlock,
  'DecisionJustification': DecisionJustification,
  
  // ConfidenceIndicator - Simple confidence badge
  'ConfidenceIndicator': ({ level, reason }) => {
    const styles = {
      high: 'bg-green-50 border-green-200 text-green-700',
      medium: 'bg-amber-50 border-amber-200 text-amber-700',
      low: 'bg-red-50 border-red-200 text-red-600'
    };
    const icons = { high: '✓', medium: '~', low: '?' };
    
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium ${styles[level] || styles.medium}`}>
        <span>{icons[level] || '~'}</span>
        <span>{level} confidence</span>
        {reason && <span className="text-gray-500">· {reason}</span>}
      </div>
    );
  },

  'DataTile': ({ amount, description, child }) => (
    <div className="flex flex-col">
      <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide font-semibold">{description}</span>
      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
        {child}
        <span className="text-base sm:text-2xl font-bold text-gray-900">{amount}</span>
      </div>
    </div>
  ),
  'Stats': ({ number, label }) => (
    <div className="flex flex-col items-end">
      <span className={`text-xs sm:text-sm font-bold ${number?.includes('-') ? 'text-red-600' : 'text-green-600'}`}>
        {number}
      </span>
      <span className="text-[10px] sm:text-xs text-gray-400">{label}</span>
    </div>
  ),
  'PieChartV2': ({ chartData, onDrillDown, ...props }) => {
    // Adapter: Transform Thesys V2 data to Local Chart data
    // Map 'value' to 'amount' and 'category' to 'category'
    const rawData = chartData?.data || [];
    const total = rawData.reduce((sum, d) => sum + (d.value || 0), 0);
    
    const adaptedData = rawData.map(d => ({ 
      category: d.category, 
      amount: d.value,
      percentage: total > 0 ? Math.round((d.value / total) * 100) : 0
    }));

    return (
      <div className="w-full overflow-visible">
         <InteractivePieChart 
            data={adaptedData} 
            title={chartData?.header?.props?.heading}
            onDrillDown={onDrillDown}
            {...props} 
         />
      </div>
    );
  },
  'BarChartV2': ({ chartData, onDrillDown, ...props }) => {
    // Adapter: Transform Thesys V2 data to Local Chart data
    // Structure examples: 
    // Single: labels: ["A", "B"], series: [{ values: [10, 20] }]
    // Multi: labels: ["Jan", "Feb"], series: [{ category: "Income", values: [10, 20] }, { category: "Expense", values: [5, 6] }]
    const labels = chartData?.data?.labels || [];
    const seriesList = chartData?.data?.series || [];
    
    let adaptedData = [];
    let seriesKeys = null;

    if (seriesList.length > 1) {
      // Handle Multiple Series
      seriesKeys = seriesList.map(s => s.category || s.name || 'Value');
      adaptedData = labels.map((label, idx) => {
        const item = { name: label };
        seriesList.forEach((s) => {
           const key = s.category || s.name || 'Value';
           item[key] = s.values[idx] || 0;
        });
        return item;
      });
    } else {
      // Handle Single Series (Legacy/Simple)
      const values = seriesList[0]?.values || [];
      adaptedData = labels.map((label, idx) => ({
        name: label,
        amount: values[idx] || 0
      }));
    }

    return (
      <div className="w-full">
        <InteractiveBarChart 
            data={adaptedData} 
            title={chartData?.header?.props?.heading}
            onDrillDown={onDrillDown}
            series={seriesKeys}
            {...props} 
        />
      </div>
    );
  },
  'LineChartV2': ({ chartData, onDrillDown, ...props }) => {
    // Adapter: Transform Thesys V2 line chart data to Local Chart data
    // Structure: labels: ["Day1", "Day2"], series: [{ values: [100, 200] }]
    const labels = chartData?.data?.labels || [];
    const values = chartData?.data?.series?.[0]?.values || [];
    
    // Zip labels and values into [{ date: "Day1", amount: 100 }, ...]
    const adaptedData = labels.map((label, idx) => ({
      date: label,
      amount: values[idx] || 0
    }));

    return (
      <div className="w-full">
        <InteractiveTimelineChart 
            data={adaptedData} 
            title={chartData?.header?.props?.heading}
            {...props} 
        />
      </div>
    );
  },
  'CalloutV2': ({ variant, title, description, children }) => {
    // Parse simple markdown (bold **text**)
    const parseMarkdown = (text) => {
      if (!text) return text;
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };
    
    return (
      <div className={`p-3 sm:p-4 rounded-lg border my-2 sm:my-3 ${
        variant === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
        variant === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
        variant === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
        'bg-blue-50 border-blue-200 text-blue-800'
      }`}>
        {title && <div className="font-semibold text-sm mb-1">{title}</div>}
        {description && <div className="text-xs sm:text-sm leading-relaxed">{parseMarkdown(description)}</div>}
        {children}
      </div>
    );
  },
  'TagBlock': ({ children }) => (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
      {children}
    </div>
  ),
  'Tag': ({ text, variant, onAction }) => (
    <button
      onClick={() => onAction && onAction(text)}
      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border cursor-pointer transition-all active:scale-95 ${
        variant === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200 active:bg-blue-100' :
        variant === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200 active:bg-amber-100' :
        'bg-gray-50 text-gray-700 border-gray-200 active:bg-gray-100'
      }`}
    >
      {text}
    </button>
  ),
  // Additional Thesys Components - Enhanced List with items array support
  'List': ({ children, items, variant, heading, onAction }) => {
    // Support both children-based and items array format from Thesys
    if (items && items.length > 0) {
      return (
        <div className="my-2 sm:my-3">
          {heading && <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">{heading}</h4>}
          <ul className="space-y-1.5 sm:space-y-2">
            {items.map((item, idx) => (
              <li 
                key={idx} 
                className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${onAction ? 'cursor-pointer' : ''}`}
                onClick={() => onAction && onAction(item.title)}
              >
                <span className="text-amber-500 mt-0.5 font-semibold text-xs">
                  {variant === 'number' ? `${idx + 1}.` : '•'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-gray-800 truncate">{item.title}</div>
                  {item.subtitle && <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{item.subtitle}</div>}
                </div>
                {item.iconName && <span className="text-amber-600">→</span>}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    // Fallback to children-based rendering
    return (
      <ul className="space-y-1.5 sm:space-y-2 my-1.5 sm:my-2">
        {children}
      </ul>
    );
  },
  'ListItem': ({ children, text, title, subtitle, onAction }) => (
    <li 
      className={`flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700 ${onAction ? 'cursor-pointer hover:text-amber-700' : ''}`}
      onClick={() => onAction && onAction(text || title)}
    >
      <span className="text-amber-500 mt-0.5">•</span>
      <div>
        <span>{text || title || children}</span>
        {subtitle && <span className="text-gray-500 ml-1">- {subtitle}</span>}
      </div>
    </li>
  ),
  'FollowUpBlock': ({ children, followUpText, onAction, title }) => {
    // Handle both children-based and followUpText-based formats from Thesys
    const items = followUpText || [];
    return (
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
        {title && (
          <div className="text-xs text-gray-500 mb-2 font-medium">
            💡 {title || "Explore further:"}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {items.length > 0 ? items.map((text, idx) => (
            <button
              key={idx}
              onClick={() => onAction && onAction(text)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 rounded-xl text-xs sm:text-sm font-medium active:scale-95 hover:from-amber-100 hover:to-orange-100 transition-all border border-amber-200 shadow-sm hover:shadow"
            >
              {text}
            </button>
          )) : children}
        </div>
      </div>
    );
  },
  'ClarificationCard': ClarificationOptions,
  'FollowUp': ({ text, onAction }) => (
    <button
      onClick={() => onAction && onAction(text)}
      className="px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] sm:text-sm font-medium active:bg-amber-100 transition-colors border border-amber-200"
    >
      {text}
    </button>
  ),
  'Callout': ({ children, variant }) => (
    <div className={`p-3 rounded-lg border my-2 ${
      variant === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
      variant === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
      variant === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
      'bg-blue-50 border-blue-200 text-blue-800'
    }`}>
      {children}
    </div>
  ),

  'Header': ({ title, subtitle }) => (
    <div className="mb-2 sm:mb-4">
      <h3 className="text-sm sm:text-lg font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs sm:text-sm text-gray-500">{subtitle}</p>}
    </div>
  ),
  'TextContent': ({ textMarkdown }) => {
    // Parse markdown: **bold**, *italic*, `code`
    const parseMarkdown = (text) => {
      if (!text) return text;
      // Split by bold markers first
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-gray-800">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };
    
    return (
      <div className="prose text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
        {textMarkdown && textMarkdown.split('\n').map((line, i) => (
          <p key={i} className="mb-0.5 sm:mb-1 leading-relaxed">{parseMarkdown(line)}</p>
        ))}
      </div>
    );
  },
  'MiniCardBlock': Row,
  'MiniCard': ({ lhs, rhs }) => (
    <div className="flex items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 bg-white border border-gray-200 rounded-lg shadow-sm flex-1 min-w-0">
      {lhs && <div className="flex-shrink-0">{lhs}</div>}
      {rhs && <div className="flex-grow text-right">{rhs}</div>}
    </div>
  ),
  'ProfileTile': ({ title, label, child }) => (
     <div className="flex flex-col">
        <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
           {child}
           <span className="text-sm sm:text-base font-semibold text-gray-900">{title}</span>
        </div>
     </div>
  ),
  'Icon': ({ name, category }) => {
      // Expanded icon mapper (Fix #6)
      const iconMap = {
        // Financial
        'dollar-sign': IndianRupee,
        'indian-rupee': IndianRupee,
        'rupee': IndianRupee,
        'currency': IndianRupee,
        'wallet': IndianRupee,
        // Trends
        'trending-up': TrendingUp,
        'trending-down': TrendingDown,
        'arrow-up': TrendingUp,
        'arrow-down': TrendingDown,
        // Charts
        'bar-chart': TrendingUp,
        'bar-chart-3': TrendingUp,
        'bar-chart-2': TrendingUp,
        'pie-chart': Target,
        'line-chart': TrendingUp,
        // Alerts
        'alert-triangle': AlertTriangle,
        'alert-circle': AlertTriangle,
        'warning': AlertTriangle,
        // Business
        'package': Package,
        'box': Package,
        'inventory': Package,
        'shopping-cart': ShoppingCart,
        'cart': ShoppingCart,
        'shop': ShoppingCart,
        // Documents
        'file-text': Package,
        'file': Package,
        'document': Package,
        // Goals
        'target': Target,
        'goal': Target,
        'bullseye': Target
      };
      const LucideIcon = iconMap[name] || iconMap[category] || IndianRupee;
      return <LucideIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />;
  },
  'Button': ({ children, variant, onAction, name }) => (
      <button 
        onClick={() => onAction && onAction(name)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          variant === 'primary' 
            ? 'bg-amber-600 text-white hover:bg-amber-700' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        {children}
      </button>
  ),
  'ButtonGroup': ({ children, className }) => (
      <div className={`flex flex-wrap gap-2 mt-4 ${className || ''}`}>{children}</div>
  ),

  // Layouts
  'container': Container,
  'row': Row,
  'column': Column,
  'grid': DashboardGrid,
  
  // Primitives (Vendor-focused)
  'metric_card': MetricCard,
  'gauge': GaugeCard,
  
  // Charts
  'bar_chart': InteractiveBarChart,
  'pie_chart': InteractivePieChart,
  'line_chart': InteractiveTimelineChart,
  
  // Features
  'comparison': ComparisonView,
  'anomaly': AnomalyCard,
  'simulation': SimulationSlider,
  'decision': DecisionGuide,
  'change_detection': ChangeDetection,
  'clarification': ClarificationOptions
};
