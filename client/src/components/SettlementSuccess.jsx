import { CheckCircle, PartyPopper, ArrowRight, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

const SettlementSuccess = ({ data }) => {
  useEffect(() => {
    // Trigger confetti animation on mount
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Confetti not available, that's fine
    }
  }, []);

  if (!data || !data.settlements) return null;

  const { settlements, totalAmount, transactionCount, timestamp } = data;

  return (
    <div className="bg-dark-800 rounded-xl border border-primary-500/30 overflow-hidden">
      {/* Success Header */}
      <div className="p-6 bg-gradient-to-r from-primary-600/20 to-primary-500/10 border-b border-primary-500/20 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary-500/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-primary-400" />
        </div>
        <h3 className="text-lg font-semibold text-white flex items-center justify-center gap-2">
          Settlement Complete!
          <PartyPopper className="w-5 h-5 text-amber-400" />
        </h3>
        <p className="text-sm text-dark-400 mt-1">
          All balances have been cleared
        </p>
      </div>

      {/* Settlement Details */}
      <div className="p-4 space-y-2">
        {settlements.map((settlement, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between p-3 bg-primary-500/5 rounded-lg border border-primary-500/20"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-dark-300">
                {settlement.from} paid {settlement.to}
              </span>
            </div>
            <span className="text-sm font-medium text-primary-400">
              ₹{settlement.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-3 bg-dark-900/50 border-t border-dark-700 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-400">₹{totalAmount?.toLocaleString()}</p>
          <p className="text-xs text-dark-500">Total Settled</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{transactionCount}</p>
          <p className="text-xs text-dark-500">Transactions</p>
        </div>
      </div>

      {/* Timestamp */}
      {timestamp && (
        <div className="px-4 py-2 border-t border-dark-700 flex items-center justify-center gap-2 text-xs text-dark-500">
          <Calendar className="w-3 h-3" />
          Settled on {new Date(timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default SettlementSuccess;
