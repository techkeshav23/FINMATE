import { useState } from 'react';
import { 
  User, Settings, Database, FileText, Trash2, 
  ChevronRight, LogOut, Moon, Bell, Shield,
  HelpCircle, Info, ExternalLink
} from 'lucide-react';
import UploadedFiles from '../layout/UploadedFiles';
import DataManager from '../layout/DataManager';

/**
 * ProfileTab - User settings, data management, and uploaded files
 * Works on both mobile and desktop
 */
const ProfileTab = ({ 
  userName = 'User',
  uploadedFiles = [],
  onDeleteFile,
  onDataChanged,
  persona
}) => {
  const [showDataManager, setShowDataManager] = useState(false);

  const userInitial = userName.charAt(0).toUpperCase();

  const menuSections = [
    {
      title: 'Data Management',
      items: [
        {
          icon: Database,
          label: 'Manage Data',
          description: 'Clear or view your transaction data',
          action: () => setShowDataManager(true),
          color: 'text-blue-500 bg-blue-50'
        },
      ]
    },
    {
      title: 'About',
      items: [
        {
          icon: Info,
          label: 'About FinMate',
          description: 'Version 1.0.0 • ENCODE Hackathon',
          action: null,
          color: 'text-gray-500 bg-gray-50'
        },
        {
          icon: ExternalLink,
          label: 'Powered by Thesys AI',
          description: 'Dynamic UI generation',
          action: () => window.open('https://thesys.dev', '_blank'),
          color: 'text-purple-500 bg-purple-50'
        },
      ]
    }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Profile Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {userInitial}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{userName}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              {persona ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-primary-400"></span>
                  {persona.charAt(0).toUpperCase() + persona.slice(1)} Mode
                </>
              ) : (
                'Personal Finance Tracker'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Uploaded Files Section */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Uploaded Files ({uploadedFiles.length})
              </h2>
            </div>
            <div className="p-3">
              <UploadedFiles 
                files={uploadedFiles} 
                onDeleteFile={onDeleteFile}
                compact={true}
              />
            </div>
          </div>
        )}

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-medium text-gray-700">{section.title}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  disabled={!item.action}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-default text-left"
                >
                  <div className={`p-2 rounded-lg ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  {item.action && (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            FinMate • Built for ENCODE Hackathon 2026
          </p>
        </div>
      </div>

      {/* Data Manager Modal */}
      {showDataManager && (
        <DataManager 
          onClose={() => setShowDataManager(false)}
          onDataChanged={onDataChanged}
        />
      )}
    </div>
  );
};

export default ProfileTab;
