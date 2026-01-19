import { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Menu,
  Coffee,
  TrendingUp,
  Store,
  Clock
} from 'lucide-react';
import DataManager from './DataManager';
import UploadedFiles from './UploadedFiles';

/**
 * Sidebar - Chat Sessions for Small Business
 * 
 * PS.md Alignment:
 * - Chat-first interface (no tabs)
 * - Business-friendly branding
 * - Chat sessions for context
 * - Uploaded files management
 * - Amber/Orange color scheme
 */
const Sidebar = ({ 
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewChat, 
  onClearHistory,
  onDeleteSession,
  isOpen,
  onToggle,
  userName = 'Business Owner',
  onDataChanged,
  uploadedFiles = [],
  onDeleteFile
}) => {
  const [showDataManager, setShowDataManager] = useState(false);

  // Format relative time
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Sidebar */}
      <div className="w-full bg-amber-50 text-amber-900 flex flex-col h-full border-r border-amber-200">
        
        {/* Vendor Header */}
        <div className="p-4 flex flex-col items-center justify-center border-b border-amber-200 bg-gradient-to-b from-amber-100 to-amber-50">
          <div className="w-24 h-24 flex items-center justify-center mb-2">
            <img
              src="/logo.png"
              alt="FinMate logo"
              className="w-24 h-24 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-amber-900">FinMate</h1>
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <Store className="w-3 h-3" />
            Business Finance Tracker
          </p>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 border border-amber-300 bg-white hover:bg-amber-100 rounded-md transition-colors text-sm text-amber-800 text-left shadow-sm"
            aria-label="Start new conversation"
          >
            <Plus className="w-4 h-4 text-amber-600" />
            New Chat
          </button>
        </div>

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          <div className="text-xs font-medium text-amber-700 px-3 mb-2 uppercase tracking-wider">
            Chat Sessions
          </div>
          
          {sessions.length > 0 ? (
            <div className="space-y-1">
              {sessions.slice(0, 50).map((session) => {
                const isActive = session.id === currentSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession && onSelectSession(session.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm rounded-md transition-colors group cursor-pointer ${
                      isActive 
                        ? 'bg-amber-200 text-amber-900' 
                        : 'text-amber-800 hover:bg-amber-100'
                    }`}
                    role="button"
                    tabIndex={0}
                  >
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-700' : 'text-amber-600'}`} />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block font-medium">
                        {session.title || 'New Chat'}
                      </span>
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(session.updatedAt || session.createdAt)}
                      </span>
                    </div>
                    
                    {onDeleteSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-300 rounded text-amber-600 transition-all"
                        title="Delete"
                        aria-label="Delete this chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-amber-600 flex flex-col items-center text-center">
              <Coffee className="w-8 h-8 text-amber-500 mb-2" />
              <span className="italic">No chats yet</span>
              <span className="text-xs mt-1">Ask your first question!</span>
            </div>
          )}

          {/* Uploaded Files Section */}
          <UploadedFiles 
            files={uploadedFiles} 
            onDeleteFile={onDeleteFile}
          />
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-amber-200 p-2 space-y-1 bg-amber-50">
          {/* Clear conversations */}
          <button
            onClick={onClearHistory}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-amber-700 hover:bg-amber-100 rounded-md transition-colors"
            aria-label="Clear all conversations"
          >
            <Trash2 className="w-4 h-4 text-amber-600" />
            Clear all chats
          </button>

          {/* Business Profile */}
          <div className="pt-2 border-t border-amber-200 mt-2">
            <div className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-amber-800 rounded-md">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-sm">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{userName}</div>
                <div className="text-xs text-amber-600">Business Account</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Manager Modal */}
      <DataManager 
        isOpen={showDataManager} 
        onClose={() => setShowDataManager(false)}
        onDataChanged={() => {
          setShowDataManager(false);
          if (onDataChanged) onDataChanged();
        }}
      />
    </>
  );
};

export default Sidebar;
