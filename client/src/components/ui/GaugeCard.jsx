import React from 'react';

// Gauge Component for Target Progress
const GaugeCard = ({ label, value, max, status, unit = '₹' }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  const getStatusColor = () => {
    switch(status) {
      case 'achieved': return 'bg-green-500';
      case 'on-track': return 'bg-amber-500';
      case 'behind': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };
  
  const getStatusText = () => {
    switch(status) {
      case 'achieved': return '🎯 Target Hit!';
      case 'on-track': return '👍 On Track';
      case 'behind': return '⚠️ Behind';
      default: return `${percentage.toFixed(0)}%`;
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600 font-medium">{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${status === 'achieved' ? 'bg-green-100 text-green-700' : status === 'behind' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
          {getStatusText()}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold text-gray-900">{unit}{value?.toLocaleString()}</span>
        <span className="text-sm text-gray-400 mb-1">/ {unit}{max?.toLocaleString()}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ${getStatusColor()}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default GaugeCard;
