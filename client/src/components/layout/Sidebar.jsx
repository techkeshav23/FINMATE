import { useState } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Plus, 
  Trash2, 
  Menu,
  X,
  History,
  HelpCircle,
  LogOut,
  User,
  ChevronRight,
  Sparkles,
  Database
} from 'lucide-react';
import DataManager from './DataManager';
import UploadedFiles from './UploadedFiles';

/**
 * Sidebar - Navigation and chat history
 * 
 * PS.md Alignment:
 * - Chat history for context
 * - Clean, professional layout
 * - User profile for personalization
 * - Data management for fresh starts
 * - Uploaded files list with delete option
 */
const Sidebar = ({ 
  chatHistory, 
  onNewChat, 
  onClearHistory,
  onDeleteChat,
  isOpen,
  onToggle,
  userName = 'User',
  onDataChanged,
  uploadedFiles = [],
  onDeleteFile
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);

  // Extract first letter for avatar
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-[260px] bg-[#f0f2f5] text-gray-800
        transform transition-transform duration-200 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-full border-r border-gray-200
      `}>
        
        {/* Header */}
        <div className="p-6 flex flex-col items-center justify-center border-b border-gray-200/50">
          <img src="/logo.png" alt="FinMate Logo" className="w-24 h-24 object-contain mb-3" />
          <h1 className="font-bold text-2xl text-gray-800 tracking-tight">FinMate</h1>
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI Financial Assistant
          </p>
        </div>

        {/* New Chat Button */}
        <div className="p-3 mb-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-3 py-3 border border-gray-200 bg-white hover:bg-gray-50 rounded-md transition-colors text-sm text-gray-700 text-left shadow-sm"
            aria-label="Start new chat"
          >
            <Plus className="w-4 h-4 text-gray-500" />
            New chat
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          <div className="text-xs font-medium text-gray-400 px-3 mb-2 uppercase tracking-wider">
            Today
          </div>
          
          {chatHistory.length > 0 ? (
            <div className="space-y-1">
              {chatHistory.slice(0, 50).map((chat, index) => {
                // Ensure content is a string
                const contentText = typeof chat.content === 'string' 
                  ? chat.content 
                  : (chat.content?.message || chat.content?.text || JSON.stringify(chat.content) || 'New conversation');
                return (
                  <div
                    key={index}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors group cursor-pointer"
                    role="button"
                    tabIndex={0}
                  >
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate flex-1">
                      {contentText.substring(0, 24) || 'New conversation'}...
                    </span>
                    
                    {/* Delete Button (Visible on Hover) */}
                    {onDeleteChat && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 rounded text-gray-500 transition-all"
                        title="Delete chat"
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
            <div className="px-3 py-4 text-sm text-gray-500 flex flex-col items-center text-center">
              <MessageSquare className="w-8 h-8 text-gray-300 mb-2" />
              <span className="italic">No chat history yet.</span>
              <span className="text-xs mt-1">Start a conversation!</span>
            </div>
          )}

          {/* Uploaded Files Section */}
          <UploadedFiles 
            files={uploadedFiles} 
            onDeleteFile={onDeleteFile}
          />
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-gray-200 p-2 space-y-1 bg-white">
          {/* Manage Data Button - NEW */}
          <button
            onClick={() => setShowDataManager(true)}
            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Manage uploaded data"
          >
            <Database className="w-4 h-4 text-gray-500" />
            Manage Data
          </button>
          
          <button
            onClick={onClearHistory}
            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Clear all conversations"
          >
            <Trash2 className="w-4 h-4 text-gray-500" />
            Clear conversations
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4 text-gray-500" />
            Settings
          </button>

          {/* User Profile */}
          <div className="pt-2 border-t border-gray-100 mt-2">
            <button className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-left">
              <div className="w-6 h-6 rounded-sm bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{userName}</div>
              </div>
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
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

      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-3 left-3 z-30 lg:hidden p-2.5 bg-white text-gray-600 rounded-md shadow-md transition-colors border border-gray-200"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  );
};

export default Sidebar;
