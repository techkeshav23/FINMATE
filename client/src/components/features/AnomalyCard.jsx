import { useState } from 'react';
import { 
  AlertTriangle, TrendingUp, TrendingDown, Eye, EyeOff,
  ChevronDown, ChevronRight, Lightbulb, X
} from 'lucide-react';

/**
 * AnomalyCard - Displays detected spending anomalies
 * 
 * PS.md Alignment:
 * - "Surface insights, surprises, and risks"
 * - "Spots unusual patterns, recurring mistakes, or opportunities"
 * - "Flags risks or concerns"
 * - "Explains its patterns, anomalies, and conclusions"
 */
const AnomalyCard = ({ data }) => {
  const [expanded, setExpanded] = useState(true);
  const [dismissedIds, setDismissedIds] = useState([]);

  if (!data || !data.anomalies || data.anomalies.length === 0) return null;

  const visibleAnomalies = data.anomalies.filter(a => !dismissedIds.includes(a.id));
  
  if (visibleAnomalies.length === 0) return null;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'border-red-500/50 bg-red-500/10';
      case 'medium': return 'border-amber-500/50 bg-amber-500/10';
      case 'low': return 'border-blue-500/50 bg-blue-500/10';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getSeverityIcon = (severity, type) => {
    if (type === 'spike') return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (type === 'drop') return <TrendingDown className="w-4 h-4 text-primary-600" />;
    return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  };

  const handleDismiss = (id) => {
    setDismissedIds([...dismissedIds, id]);
  };

  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2.5 sm:p-4 flex items-center justify-between hover:bg-gray-100/30 transition-colors"
        aria-expanded={expanded}
        aria-label="Toggle anomalies"
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          <h3 className="text-xs sm:text-sm font-medium text-gray-900">
            Anomalies Detected
          </h3>
          <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-amber-500/20 text-amber-400 rounded-full">
            {visibleAnomalies.length}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-2.5 sm:p-4 pt-0 space-y-2 sm:space-y-3">
          {visibleAnomalies.map((anomaly, idx) => (
            <div 
              key={anomaly.id || idx}
              className={`p-2 sm:p-3 rounded-lg border ${getSeverityColor(anomaly.severity)} relative`}
            >
              <button
                onClick={() => handleDismiss(anomaly.id)}
                className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-0.5 sm:p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Dismiss anomaly"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
              
              <div className="flex items-start gap-2 sm:gap-3">
                {getSeverityIcon(anomaly.severity, anomaly.type)}
                <div className="flex-1 pr-5 sm:pr-6">
                  <p className="text-xs sm:text-sm text-gray-900 font-medium">{anomaly.title}</p>
                  <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">{anomaly.description}</p>
                  
                  {/* Stats */}
                  {anomaly.stats && (
                    <div className="flex items-center gap-2 sm:gap-4 mt-1.5 sm:mt-2 flex-wrap">
                      <div className="text-[10px] sm:text-xs">
                        <span className="text-gray-500">Expected: </span>
                        <span className="text-gray-700">₹{anomaly.stats.expected?.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] sm:text-xs">
                        <span className="text-gray-500">Actual: </span>
                        <span className={anomaly.stats.actual > anomaly.stats.expected ? 'text-red-400' : 'text-primary-600'}>
                          ₹{anomaly.stats.actual?.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-xs">
                        <span className="text-gray-500">Diff: </span>
                        <span className={anomaly.stats.diff > 0 ? 'text-red-400' : 'text-primary-600'}>
                          {anomaly.stats.diff > 0 ? '+' : ''}{anomaly.stats.diffPercent}%
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Suggestion */}
                  {anomaly.suggestion && (
                    <div className="flex items-start gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 p-1.5 sm:p-2 bg-gray-50/50 rounded">
                      <Lightbulb className="w-3 h-3 text-primary-600 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] sm:text-xs text-gray-700">{anomaly.suggestion}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnomalyCard;
