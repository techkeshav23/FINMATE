import { 
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, 
  ArrowRight, ChevronRight, RefreshCw
} from 'lucide-react';

/**
 * ChangeDetection - Shows detected changes from usual patterns
 * 
 * PS.md Alignment:
 * - "What changed this month?" query type
 * - "Surface insights, surprises, and risks"
 * - "Spots unusual patterns"
 * - "Timeline for changes"
 */
const ChangeDetection = ({ changes, onExplore }) => {
  if (!changes || changes.length === 0) return null;

  const getChangeIcon = (type, direction) => {
    if (type === 'anomaly') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    if (direction === 'up') return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (direction === 'down') return <TrendingDown className="w-4 h-4 text-primary-400" />;
    return <RefreshCw className="w-4 h-4 text-blue-400" />;
  };

  const getChangeBg = (type, direction) => {
    if (type === 'anomaly') return 'bg-amber-500/10 border-amber-500/30';
    if (direction === 'up') return 'bg-red-500/10 border-red-500/30';
    if (direction === 'down') return 'bg-primary-500/10 border-primary-500/30';
    return 'bg-blue-500/10 border-blue-500/30';
  };

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-dark-700 bg-gradient-to-r from-amber-600/10 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="font-medium text-white">I noticed some changes...</h3>
        </div>
        <p className="text-xs text-dark-400 mt-1">
          Here's what's different from your usual patterns
        </p>
      </div>

      {/* Changes List */}
      <div className="p-4 space-y-3">
        {changes.map((change, idx) => (
          <div 
            key={idx}
            className={`p-3 rounded-lg border ${getChangeBg(change.type, change.direction)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {getChangeIcon(change.type, change.direction)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{change.title}</p>
                <p className="text-xs text-dark-400 mt-1">{change.description}</p>
                
                {/* Change Stats */}
                {change.stats && (
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <div className="text-xs">
                      <span className="text-dark-500">Before: </span>
                      <span className="text-dark-300">₹{change.stats.before?.toLocaleString()}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-dark-600" />
                    <div className="text-xs">
                      <span className="text-dark-500">Now: </span>
                      <span className={change.direction === 'up' ? 'text-red-400' : 'text-primary-400'}>
                        ₹{change.stats.after?.toLocaleString()}
                      </span>
                    </div>
                    <div className={`text-xs font-medium ${
                      change.direction === 'up' ? 'text-red-400' : 'text-primary-400'
                    }`}>
                      ({change.stats.changePercent > 0 ? '+' : ''}{change.stats.changePercent}%)
                    </div>
                  </div>
                )}

                {/* Why this matters */}
                {change.reason && (
                  <div className="mt-2 p-2 bg-dark-900/50 rounded text-xs text-dark-400">
                    <span className="text-dark-500">Why this matters: </span>
                    {change.reason}
                  </div>
                )}
              </div>

              {/* Explore button */}
              {onExplore && (
                <button
                  onClick={() => onExplore(change.exploreQuery || `Tell me more about ${change.title}`)}
                  className="p-2 hover:bg-dark-700 rounded-lg transition-colors group flex-shrink-0"
                  title="Explore this change"
                  aria-label="Explore this change"
                >
                  <ChevronRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Prompt */}
      <div className="p-4 border-t border-dark-700 bg-dark-900/50">
        <p className="text-xs text-dark-400 text-center">
          💡 Ask me about any of these changes to understand them better
        </p>
      </div>
    </div>
  );
};

export default ChangeDetection;
