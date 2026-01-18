import { MessageSquare, Upload, TrendingUp, FileText, Sparkles } from 'lucide-react';

/**
 * HomeTab - Welcome screen with activity summary and quick actions
 * Works on both mobile and desktop
 */
const HomeTab = ({ 
  transactionCount = 0, 
  uploadedFilesCount = 0, 
  onNavigate,
  userName = 'User'
}) => {
  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-b from-white to-gray-50 px-4 py-8">
      {/* Logo */}
      <div className="mb-6">
        <img 
          src="/logo.png" 
          alt="FinMate Logo" 
          className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
        />
      </div>

      {/* Welcome Text */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {getGreeting()}, {userName.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 text-sm sm:text-base">
          Your AI-powered financial co-pilot
        </p>
      </div>

      {/* Activity Stats */}
      <div className="flex gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2 text-primary-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-2xl font-bold">{transactionCount}</span>
          </div>
          <p className="text-xs text-gray-500">Transactions</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2 text-primary-500 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-2xl font-bold">{uploadedFilesCount}</span>
          </div>
          <p className="text-xs text-gray-500">Files Uploaded</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-full max-w-sm space-y-3">
        <p className="text-xs text-gray-600 uppercase tracking-wider text-center mb-2">
          Quick Actions
        </p>
        
        <button
          onClick={() => onNavigate('chat')}
          className="w-full flex items-center justify-center gap-3 bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-sm"
        >
          <MessageSquare className="w-5 h-5" />
          Start Chatting
        </button>
        
        <button
          onClick={() => onNavigate('upload')}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-xl border border-gray-200 transition-colors"
        >
          <Upload className="w-5 h-5" />
          Upload Statement
        </button>
      </div>

      {/* Tagline */}
      <div className="mt-8 flex items-center gap-2 text-xs text-gray-600">
        <Sparkles className="w-3 h-3" />
        <span>Powered by Thesys AI</span>
      </div>
    </div>
  );
};

export default HomeTab;
