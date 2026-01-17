import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Settings, 
  PlusCircle, 
  Trash2, 
  Menu,
  X,
  Sparkles,
  History,
  HelpCircle,
  Moon,
  Sun,
  ChevronRight,
  Users,
  IndianRupee,
  TrendingUp,
  AlertCircle
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-72 bg-dark-950/80 backdrop-blur-xl border-r border-white/5
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col shadow-2xl
      `}>
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg tracking-tight">FinMate</h1>
                <p className="text-xs text-slate-400">Financial Workspace</p>
              </div>
            </div>
            <button 
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dark-400" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* Financial Summary Card */}
        {financialSummary && (
          <div className="px-4 pb-4">
            <div className="bg-dark-900/50 rounded-xl p-3 border border-dark-800">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary-400" />
                <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">
                  Quick Stats
                </span>
              </div>
              
              {/* Roommates */}
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3 h-3 text-dark-500" />
                <span className="text-xs text-dark-400">
                  {financialSummary.roommates.join(', ')}
                </span>
              </div>
              
              {/* Total Expenses */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-dark-400">Total Expenses</span>
                <span className="text-sm font-semibold text-white">
                  ₹{financialSummary.totalExpenses.toLocaleString()}
                </span>
              </div>
              
              {/* Pending */}
              {financialSummary.pendingCount > 0 && (
                <div className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg">
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span className="text-xs text-amber-400">{financialSummary.pendingCount} Pending</span>
                  </div>
                  <span className="text-xs font-medium text-amber-400">
                    ₹{financialSummary.pendingAmount.toLocaleString()}
                  </span>
                </div>
              )}
              
              {/* Quick Balances */}
              <div className="mt-3 pt-3 border-t border-dark-800">
                <span className="text-xs text-dark-500 mb-2 block">Balances</span>
                <div className="space-y-1">
                  {Object.entries(financialSummary.balances).map(([name, balance]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-xs text-dark-400">{name}</span>
                      <span className={`text-xs font-medium ${
                        balance > 0 ? 'text-primary-400' : balance < 0 ? 'text-red-400' : 'text-dark-500'
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
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-dark-500" />
            <span className="text-xs font-medium text-dark-500 uppercase tracking-wider">
              Recent Chats
            </span>
          </div>
          
          {chatHistory.length > 0 ? (
            <div className="space-y-2">
              {chatHistory.slice(0, 10).map((chat, index) => (
                <button
                  key={index}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-dark-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors group"
                >
                  <MessageSquare className="w-4 h-4 text-dark-500 group-hover:text-primary-400" />
                  <span className="truncate flex-1">
                    {chat.content?.substring(0, 30) || 'New conversation'}...
                  </span>
                  <ChevronRight className="w-4 h-4 text-dark-600 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-dark-700 mx-auto mb-2" />
              <p className="text-sm text-dark-500">No chat history yet</p>
              <p className="text-xs text-dark-600 mt-1">Start a conversation!</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-dark-800">
          <div className="space-y-1">
            <button
              onClick={onClearHistory}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
              <HelpCircle className="w-4 h-4" />
              Help & FAQ
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute bottom-20 left-4 right-4 bg-dark-900 border border-dark-700 rounded-xl p-4 shadow-xl">
            <h3 className="text-sm font-medium text-white mb-3">Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-300">Dark Mode</span>
                <button className="p-2 bg-dark-800 rounded-lg">
                  <Moon className="w-4 h-4 text-primary-400" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-300">Notifications</span>
                <div className="w-10 h-6 bg-primary-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">KU</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Keshav</p>
              <p className="text-xs text-dark-500">Free Plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 lg:hidden p-2 bg-dark-800 hover:bg-dark-700 rounded-lg border border-dark-700 transition-colors"
      >
        <Menu className="w-5 h-5 text-dark-300" />
      </button>
    </>
  );
};

export default Sidebar;
