import { Home, MessageSquare, Upload, User } from 'lucide-react';

/**
 * BottomNav - Mobile bottom navigation bar
 * Only visible on mobile screens (< lg breakpoint)
 */
const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? 'text-primary-500' 
                  : 'text-gray-600 hover:text-gray-600'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-12 h-0.5 bg-primary-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
