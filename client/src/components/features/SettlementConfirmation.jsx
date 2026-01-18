import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight, Wallet, Clock } from 'lucide-react';

/**
 * SettlementConfirmation - Confirms group expense settlements
 * 
 * PS.md Alignment:
 * - "Settle up" command for Group Expense Splitter persona
 * - "End conversations with clarity and agency"
 * - "Users feel in control"
 * - "Smart follow-up questions when intent is unclear"
 */
const SettlementConfirmation = ({ data, onAction }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!data || !data.settlements) return null;

  const { settlements, balances, totalAmount, transactionCount, justification } = data;

  const handleConfirm = () => {
    setIsConfirming(true);
    if (onAction) {
      onAction("Yes, settle now");
    }
  };

  const handleCancel = () => {
    if (onAction) {
      onAction("No, cancel");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-amber-500/30 overflow-hidden">
      {/* Header with Warning */}
      <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-gray-900">Confirm Settlement</h3>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Please review and confirm the following payments
        </p>
      </div>

      {/* Settlement Details */}
      <div className="p-4 space-y-3">
        {settlements.map((settlement, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-xs font-medium text-red-400">
                  {settlement.from.charAt(0)}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500" />
              <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-600">
                  {settlement.to.charAt(0)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                ₹{settlement.amount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {settlement.from} → {settlement.to}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-gray-50/30 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Total Amount
          </span>
          <span className="font-semibold text-gray-900">₹{totalAmount?.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-gray-500 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Transactions to settle
          </span>
          <span className="text-gray-600">{transactionCount}</span>
        </div>
      </div>

      {/* Justification */}
      {justification && justification.reasons && justification.reasons.length > 0 && (
        <div className="px-4 py-3 bg-primary-500/5 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Why now?</p>
          <ul className="text-xs text-gray-700 space-y-1">
            {justification.reasons.slice(0, 2).map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary-600">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 flex gap-3 border-t border-gray-200">
        <button
          onClick={handleCancel}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-900 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:cursor-wait rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isConfirming ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Confirm Settlement
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SettlementConfirmation;
