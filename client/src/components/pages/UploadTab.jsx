import { useState } from 'react';
import { Upload, FileText, MessageSquare, CreditCard, ChevronRight } from 'lucide-react';
import CSVUpload from '../layout/CSVUpload';
import BankStatementParser from '../layout/BankStatementParser';

/**
 * UploadTab - Combined upload options for CSV and Bank Statements
 * Works on both mobile and desktop
 */
const UploadTab = ({ onUploadSuccess, onParseSuccess }) => {
  const [activeUploader, setActiveUploader] = useState(null); // 'csv' | 'statement' | null

  const uploadOptions = [
    {
      id: 'csv',
      title: 'CSV File',
      description: 'Upload a CSV file with your transactions',
      icon: FileText,
      color: 'bg-blue-50 text-blue-500',
    },
    {
      id: 'statement',
      title: 'Bank Statement / SMS',
      description: 'Import from PDF, SMS messages, or email',
      icon: CreditCard,
      color: 'bg-green-50 text-green-500',
    },
  ];

  if (activeUploader === 'csv') {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveUploader(null)}
            className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
          >
            ← Back to options
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <CSVUpload 
            onClose={() => setActiveUploader(null)}
            onUploadSuccess={(result, fileInfo) => {
              onUploadSuccess?.(result, fileInfo);
              setActiveUploader(null);
            }}
          />
        </div>
      </div>
    );
  }

  if (activeUploader === 'statement') {
    return (
      <div className="h-full">
        <BankStatementParser
          onClose={() => setActiveUploader(null)}
          onParseSuccess={(result, fileInfo) => {
            onParseSuccess?.(result, fileInfo);
            setActiveUploader(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 sm:p-6 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-xl">
            <Upload className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
              Upload Data
            </h1>
            <p className="text-sm text-gray-500">
              Import your financial data
            </p>
          </div>
        </div>
      </div>

      {/* Upload Options */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-lg mx-auto space-y-4">
          {uploadOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setActiveUploader(option.id)}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-primary-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${option.color}`}>
                  <option.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {option.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-primary-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        {/* Tips Section */}
        <div className="max-w-lg mx-auto mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h4 className="text-sm font-medium text-amber-800 mb-2">💡 Tips</h4>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• CSV should have: date, description, amount columns</li>
            <li>• Bank PDFs: HDFC, ICICI, SBI formats supported</li>
            <li>• SMS: Copy-paste your bank transaction messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadTab;
