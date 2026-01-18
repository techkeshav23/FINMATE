import { useState } from 'react';
import { Shield, ShieldAlert, ShieldQuestion, Info, ChevronDown, ChevronUp, AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * ConfidenceBadge - Displays AI confidence level with expandable details
 * 
 * PS.md Alignment:
 * - "Communicates uncertainty and assumptions honestly"
 * - "Justifies its recommendations"
 * - "Users feel in control - never guessing what the AI meant"
 * 
 * @param {Object} confidence - Confidence data from AI response
 * @param {string} confidence.level - 'high' | 'medium' | 'low'
 * @param {string} confidence.reason - Brief explanation
 * @param {string} confidence.details - Detailed explanation
 * @param {string[]} confidence.assumptions - List of assumptions made
 * @param {Object} confidence.dataQuality - Data quality indicators
 */
const ConfidenceBadge = ({ confidence }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!confidence) return null;

  const { level, reason, details, assumptions, dataQuality } = confidence;

  const getBadgeStyle = () => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-primary-500/10 border-primary-500/30',
          text: 'text-primary-600',
          icon: Shield,
          label: 'High Confidence',
          description: "I'm quite sure about this"
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30',
          text: 'text-amber-400',
          icon: ShieldAlert,
          label: 'Moderate Confidence',
          description: 'I made some assumptions'
        };
      case 'low':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          text: 'text-red-400',
          icon: ShieldQuestion,
          label: 'Low Confidence',
          description: 'Take this with a grain of salt'
        };
      default:
        return {
          bg: 'bg-gray-100 border-gray-300',
          text: 'text-gray-500',
          icon: Info,
          label: 'Analysis',
          description: 'General insight'
        };
    }
  };

  const style = getBadgeStyle();
  const Icon = style.icon;

  // Check if we have detailed info to show
  const hasDetails = details || assumptions || dataQuality || (reason && reason.length > 50);

  return (
    <div className="inline-block">
      {/* Badge */}
      <button
        onClick={() => hasDetails && setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${style.bg} group relative ${hasDetails ? 'cursor-pointer hover:opacity-90' : ''}`}
        aria-expanded={showDetails}
        aria-label={`Confidence level: ${style.label}`}
      >
        <Icon className={`w-3 h-3 ${style.text}`} />
        <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
        {hasDetails && (
          showDetails ? 
            <ChevronUp className={`w-3 h-3 ${style.text}`} /> :
            <ChevronDown className={`w-3 h-3 ${style.text}`} />
        )}
        
        {/* Simple tooltip for non-expandable */}
        {!hasDetails && reason && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
            {reason}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-dark-700" />
          </div>
        )}
      </button>

      {/* Expanded Details Panel */}
      {showDetails && hasDetails && (
        <div className="mt-2 p-3 bg-gray-50/80 border border-gray-200 rounded-lg text-xs space-y-3 animate-fade-in max-w-sm">
          {/* Main Reason */}
          {reason && (
            <div>
              <p className="text-gray-700">{reason}</p>
            </div>
          )}

          {/* Why This Confidence Level */}
          {details && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-400 font-medium mb-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Why this confidence level?
              </p>
              <p className="text-gray-500">{details}</p>
            </div>
          )}

          {/* Assumptions Made */}
          {assumptions && assumptions.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-amber-400/80 font-medium mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Assumptions I made
              </p>
              <ul className="space-y-1">
                {assumptions.map((assumption, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-500">
                    <span className="text-amber-400">•</span>
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Data Quality */}
          {dataQuality && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-400 font-medium mb-1 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Data quality
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      dataQuality.score >= 80 ? 'bg-primary-500' :
                      dataQuality.score >= 50 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${dataQuality.score}%` }}
                  />
                </div>
                <span className="text-gray-500">{dataQuality.score}%</span>
              </div>
              {dataQuality.note && (
                <p className="text-gray-400 mt-1">{dataQuality.note}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfidenceBadge;
