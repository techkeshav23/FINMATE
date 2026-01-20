import React from 'react';

const ReasoningBlock = ({ steps, conclusion, confidence }) => {
  const getConfidenceConfig = () => {
    if (confidence === 'high') return { 
      bg: 'bg-emerald-50', 
      border: 'border-emerald-200', 
      text: 'text-emerald-700',
      icon: '✓',
      label: 'High Confidence'
    };
    if (confidence === 'medium') return { 
      bg: 'bg-amber-50', 
      border: 'border-amber-200', 
      text: 'text-amber-700',
      icon: '~',
      label: 'Medium Confidence'
    };
    return { 
      bg: 'bg-slate-50', 
      border: 'border-slate-200', 
      text: 'text-slate-600',
      icon: '?',
      label: 'Limited Data'
    };
  };
  
  const conf = getConfidenceConfig();
  
  return (
    <div className="my-3 sm:my-4 rounded-xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-indigo-100/80 to-purple-100/50 border-b border-indigo-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm">🧠</span>
            </div>
            <div>
              <span className="text-sm font-bold text-indigo-900">My Analysis</span>
              <p className="text-[10px] text-indigo-600">Here's how I reached this conclusion</p>
            </div>
          </div>
          {confidence && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${conf.bg} ${conf.border} border`}>
              <span className={`text-xs font-bold ${conf.text}`}>{conf.icon}</span>
              <span className={`text-[10px] font-semibold ${conf.text}`}>{conf.label}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Steps */}
      {steps && steps.length > 0 && (
        <div className="px-3 sm:px-4 py-3">
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 group">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center mt-0.5 group-hover:bg-indigo-200 transition-colors">
                  <span className="text-xs font-bold text-indigo-600">{idx + 1}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Conclusion */}
      {conclusion && (
        <div className="mx-3 sm:mx-4 mb-3 p-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 shadow-md">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div>
              <span className="text-[10px] font-semibold text-indigo-100 uppercase tracking-wide">Key Takeaway</span>
              <p className="text-sm font-semibold text-white mt-0.5">{conclusion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReasoningBlock;
