import { useState } from 'react';
import { 
  AlertTriangle, TrendingUp, TrendingDown, Eye, EyeOff,
  ChevronDown, ChevronRight, Lightbulb, X
} from 'lucide-react';

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
      default: return 'border-dark-600 bg-dark-800';
    }
  };

  const getSeverityIcon = (severity, type) => {
    if (type === 'spike') return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (type === 'drop') return <TrendingDown className="w-4 h-4 text-primary-400" />;
    return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  };

  const handleDismiss = (id) => {
    setDismissedIds([...dismissedIds, id]);
  };

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-dark-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-medium text-white">
            Anomalies Detected
          </h3>
          <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
            {visibleAnomalies.length}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-dark-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-dark-400" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-4 pt-0 space-y-3">
          {visibleAnomalies.map((anomaly, idx) => (
            <div 
              key={anomaly.id || idx}
              className={`p-3 rounded-lg border ${getSeverityColor(anomaly.severity)} relative`}
            >
              <button
                onClick={() => handleDismiss(anomaly.id)}
                className="absolute top-2 right-2 p-1 hover:bg-dark-700 rounded transition-colors"
              >
                <X className="w-3 h-3 text-dark-500" />
              </button>
              
              <div className="flex items-start gap-3">
                {getSeverityIcon(anomaly.severity, anomaly.type)}
                <div className="flex-1 pr-6">
                  <p className="text-sm text-white font-medium">{anomaly.title}</p>
                  <p className="text-xs text-dark-400 mt-1">{anomaly.description}</p>
                  
                  {/* Stats */}
                  {anomaly.stats && (
                    <div className="flex items-center gap-4 mt-2">
                      <div className="text-xs">
                        <span className="text-dark-500">Expected: </span>
                        <span className="text-dark-300">₹{anomaly.stats.expected?.toLocaleString()}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-dark-500">Actual: </span>
                        <span className={anomaly.stats.actual > anomaly.stats.expected ? 'text-red-400' : 'text-primary-400'}>
                          ₹{anomaly.stats.actual?.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-dark-500">Diff: </span>
                        <span className={anomaly.stats.diff > 0 ? 'text-red-400' : 'text-primary-400'}>
                          {anomaly.stats.diff > 0 ? '+' : ''}{anomaly.stats.diffPercent}%
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Suggestion */}
                  {anomaly.suggestion && (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-dark-900/50 rounded">
                      <Lightbulb className="w-3 h-3 text-primary-400 mt-0.5" />
                      <p className="text-xs text-dark-300">{anomaly.suggestion}</p>
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
