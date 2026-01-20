import React from 'react';

export const AssumptionsBlock = ({ assumptions, dataQuality }) => {
  const qualityConfig = {
    complete: { icon: '✓', label: 'Complete Data', color: 'text-emerald-600 bg-emerald-50' },
    partial: { icon: '~', label: 'Partial Data', color: 'text-amber-600 bg-amber-50' },
    limited: { icon: '!', label: 'Limited Data', color: 'text-red-600 bg-red-50' }
  };
  const quality = qualityConfig[dataQuality] || qualityConfig.partial;
  
  return (
    <div className="my-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${quality.color}`}>
          {quality.icon}
        </span>
        <span className="text-xs font-semibold text-slate-700">{quality.label}</span>
      </div>
      {assumptions && assumptions.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">Assumptions Made:</span>
          <ul className="space-y-1">
            {assumptions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="text-slate-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const DecisionJustification = ({ recommendation, reasons, impact, alternative }) => {
  return (
    <div className="my-3 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm">💡</span>
          </div>
          <div>
            <span className="text-sm font-bold text-amber-900">Recommendation</span>
            <p className="text-[10px] text-amber-700">Based on your data analysis</p>
          </div>
        </div>
      </div>
      
      {/* Recommendation Body */}
       <div className="p-3">
         <div className="text-base font-semibold text-gray-900 mb-3">{recommendation}</div>
         
         <div className="space-y-3">
            {reasons && (
                <div>
                   <h4 className="text-[10px] uppercase tracking-wide font-semibold text-amber-800/60 mb-1">Why?</h4>
                   <ul className="space-y-1">
                     {reasons.map((r, i) => (
                         <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-amber-500 mt-1">•</span>
                            <span>{r}</span>
                         </li>
                     ))}
                   </ul>
                </div>
            )}
            
            {impact && (
                 <div className="bg-white/60 p-2 rounded-lg border border-amber-200/50">
                    <h4 className="text-[10px] uppercase tracking-wide font-semibold text-amber-800/60 mb-1">Potential Impact</h4>
                    <p className="text-sm text-amber-900">{impact}</p>
                 </div>
            )}
         </div>
       </div>
    </div>
  );
};
