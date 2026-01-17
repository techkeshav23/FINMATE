import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Plus, 
  Trash2, 
  Menu,
  X,
  History,
  HelpCircle,
  Users,
  TrendingUp,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { transactionsAPI } from '../services/api';

const Sidebar = ({ 
  chatHistory, 
  onNewChat, 
  onClearHistory,
  isOpen,
  onToggle 
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [financialSummary, setFinancialSummary] = useState(null);

  // Fetch financial summary on mount
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await transactionsAPI.getAll();
        if (data && data.transactions) {
          const total = data.transactions.reduce((sum, t) => sum + t.amount, 0);
          const pending = data.transactions.filter(t => !t.settled);
          const pendingAmount = pending.reduce((sum, t) => sum + t.amount, 0);
          
          // Calculate balances
          const balances = {};
          data.roommates.forEach(name => balances[name] = 0);
          data.transactions.filter(t => !t.settled).forEach(t => {
            balances[t.payer] += t.amount;
            Object.entries(t.split).forEach(([person, share]) => {
              balances[person] -= share;
            });
          });
          
          setFinancialSummary({
            roommates: data.roommates,
            totalExpenses: total,
            pendingCount: pending.length,
            pendingAmount,
            balances
          });
        }
      } catch (err) {
        console.error('Failed to load financial summary:', err);
      }
    };
    fetchSummary();
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-[280px] sm:w-72 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 text-base">FinMate</h1>
                <p className="text-xs text-gray-500">Financial Assistant</p>
              </div>
            </div>
            <button 
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
        </div>

        {/* Financial Summary Card */}
        {financialSummary && (
          <div className="px-4 pb-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                <span className="text-xs font-medium text-gray-700">
                  Quick Summary
                </span>
              </div>
              
              {/* Roommates */}
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-600">
                  {financialSummary.roommates.join(', ')}
                </span>
              </div>
              
              {/* Total Expenses */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Total Expenses</span>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{financialSummary.totalExpenses.toLocaleString()}
                </span>
              </div>
              
              {/* Pending */}
              {financialSummary.pendingCount > 0 && (
                <div className="flex items-center justify-between p-2 bg-warning/10 rounded-md mt-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-warning" />
                    <span className="text-xs text-gray-700">{financialSummary.pendingCount} Pending</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900">
                    ₹{financialSummary.pendingAmount.toLocaleString()}
                  </span>
                </div>
              )}
              
              {/* Quick Balances */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500 mb-2 block">Balances</span>
                <div className="space-y-1.5">
                  {Object.entries(financialSummary.balances).map(([name, balance]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{name}</span>
                      <span className={`text-xs font-medium ${
                        balance > 0 ? 'text-success' : balance < 0 ? 'text-danger' : 'text-gray-500'
                      }`}>
                        {balance > 0 ? '+' : ''}₹{Math.round(balance).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Recent
            </span>
          </div>
          
          {chatHistory.length > 0 ? (
            <div className="space-y-1">
              {chatHistory.slice(0, 10).map((chat, index) => (
                <button
                  key={index}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-primary-500 flex-shrink-0" />
                  <span className="truncate flex-1">
                    {chat.content?.substring(0, 28) || 'New conversation'}...
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No chat history</p>
              <p className="text-xs text-gray-400 mt-1">Start a new conversation</p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-1">
            <button
              onClick={onClearHistory}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear history
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <HelpCircle className="w-4 h-4" />
              Help
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary-600">KU</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Keshav</p>
              <p className="text-xs text-gray-500">Free plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-3 left-3 z-30 lg:hidden p-2.5 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 shadow-md transition-colors"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>
    </>
  );
};

export default Sidebar;
