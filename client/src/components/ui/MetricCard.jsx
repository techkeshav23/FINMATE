import React from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Target,
  IndianRupee,
  Package,
  ShoppingCart
} from 'lucide-react';

const MetricCard = ({ label, value, subtext, icon, trend }) => {
  const getIcon = () => {
    switch(icon) {
      case 'rupee': return <IndianRupee className="w-4 h-4 text-amber-600" />;
      case 'trending-up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'trending-down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'target': return <Target className="w-4 h-4 text-blue-500" />;
      case 'alert': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'package': return <Package className="w-4 h-4 text-purple-500" />;
      case 'cart': return <ShoppingCart className="w-4 h-4 text-teal-500" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-400" />;
    }
  };
  
  return (
    <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex-1 min-w-0">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-500 font-medium truncate">{label}</span>
        {getIcon()}
      </div>
      <div className={`text-lg sm:text-xl font-bold ${trend === 'down' ? 'text-red-600' : trend === 'up' ? 'text-green-600' : 'text-gray-900'}`}>
        {value}
      </div>
      {subtext && <div className="text-xs text-gray-400 mt-1 truncate">{subtext}</div>}
    </div>
  );
};

export default MetricCard;
