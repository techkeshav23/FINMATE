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
  Database,
  Home,
  Upload
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
 * - Tab navigation for desktop
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
  onDeleteFile,
  activeTab = 'chat',
  onTabChange
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);

  // Extract first letter for avatar
  const userInitial = userName.charAt(0).toUpperCase();

  // Navigation tabs
  const navTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'profile', label: 'Profile', icon: User },
  ];

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
        <div className="p-4 flex flex-col items-center justify-center border-b border-gray-200/50">
          <img src="/logo.png" alt="FinMate Logo" className="w-16 h-16 object-contain mb-2" />
          <h1 className="font-bold text-xl text-gray-800 tracking-tight">FinMate</h1>
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI Financial Assistant
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="p-2 border-b border-gray-200">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  isActive 
                    ? 'bg-primary-50 text-primary-600 font-medium' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? 'text-primary-500' : 'text-gray-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* New Chat Button - Only show when on chat tab */}
        {activeTab === 'chat' && (
          <div className="p-3">
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-md transition-colors text-sm text-gray-700 text-left shadow-sm"
              aria-label="Start new chat"
            >
              <Plus className="w-4 h-4 text-gray-500" />
              New chat
            </button>
          </div>
        )}

        {/* Chat History - Only show when on chat tab */}
        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          {activeTab === 'chat' && (
            <>
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
            </>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-gray-200 p-2 space-y-1 bg-white">
          {/* Clear conversations - Only show when on chat tab */}
          {activeTab === 'chat' && (
            <button
              onClick={onClearHistory}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Clear all conversations"
            >
              <Trash2 className="w-4 h-4 text-gray-500" />
              Clear conversations
            </button>
          )}

          {/* User Profile */}
          <div className="pt-2 border-t border-gray-100 mt-2">
            <button 
              onClick={() => onTabChange?.('profile')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-sm bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{userName}</div>
              </div>
              <Settings className="w-4 h-4 text-gray-400" />
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
