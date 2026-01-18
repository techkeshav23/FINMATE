import { useState, useEffect } from 'react';
import { 
  Database, Trash2, RefreshCw, AlertTriangle, X, 
  FileText, Upload, Calendar, Users, CheckCircle 
} from 'lucide-react';
import { transactionsAPI } from '../../services/api';

/**
 * DataManager - Manage uploaded transaction data
 * 
 * Features:
 * - View data statistics
 * - Clear all data (fresh start)
 * - Replace data with new upload
 */
const DataManager = ({ isOpen, onClose, onDataChanged }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await transactionsAPI.getStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load data statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const result = await transactionsAPI.clearAll();
      setSuccess(`Cleared ${result.deletedCount} transactions`);
      setConfirmDelete(false);
      await loadStats();
      if (onDataChanged) onDataChanged();
      
      // Auto-hide success after 3s
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to clear data');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setConfirmDelete(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Database className="w-5 h-5 text-primary-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Data</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Alerts */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Stats */}
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-20 bg-gray-100 rounded-xl" />
              <div className="h-12 bg-gray-100 rounded-xl" />
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Transaction Count */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">Total Transactions</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {stats.transactionCount}
                  </span>
                </div>
                
                {stats.transactionCount > 0 && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Total Amount</span>
                      <span className="font-medium text-gray-700">
                        ₹{stats.totalAmount?.toLocaleString() || 0}
                      </span>
                    </div>
                    
                    {stats.dateRange && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Date Range
                        </span>
                        <span className="font-medium text-gray-700">
                          {stats.dateRange.from} to {stats.dateRange.to}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Sources */}
              {stats.sources && Object.keys(stats.sources).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Data Sources
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(stats.sources).map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{source}</span>
                        <span className="font-medium text-gray-700">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Persona & Participants */}
              {stats.persona && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Mode</span>
                    <span className="font-medium text-gray-700 capitalize">
                      {stats.persona}
                    </span>
                  </div>
                  {stats.participants?.length > 0 && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Participants
                      </span>
                      <span className="font-medium text-gray-700">
                        {stats.participants.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No data available</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-600 text-center">
              To add new data, use the upload buttons in the chat
            </p>

            {/* Clear All Button */}
            {stats?.transactionCount > 0 && (
              confirmDelete ? (
                <div className="bg-red-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Delete all {stats.transactionCount} transactions?</span>
                  </div>
                  <p className="text-sm text-red-500">
                    This cannot be undone. Your config (persona, participants) will be preserved.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelDelete}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearAll}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-900 bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {deleting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Yes, Delete All
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleClearAll}
                  className="w-full px-4 py-3 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Data & Start Fresh
                </button>
              )
            )}

            {/* Refresh Stats */}
            <button
              onClick={loadStats}
              disabled={loading}
              className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManager;
