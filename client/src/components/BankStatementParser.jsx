import { useState, useRef } from 'react';
import { 
  Upload, X, FileText, CheckCircle, AlertCircle, Loader2, 
  CreditCard, Building2, MessageSquare, Mail 
} from 'lucide-react';
import { transactionsAPI } from '../services/api';

const BankStatementParser = ({ onClose, onParseSuccess }) => {
  const [file, setFile] = useState(null);
  const [sourceType, setSourceType] = useState('bank'); // bank, sms, email
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [parsedPreview, setParsedPreview] = useState([]);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const [textContent, setTextContent] = useState('');

  const sourceTypes = [
    { id: 'bank', label: 'Bank Statement', icon: Building2, accept: '.pdf,.csv,.txt' },
    { id: 'sms', label: 'SMS/Messages', icon: MessageSquare, accept: '.txt' },
    { id: 'email', label: 'Email Export', icon: Mail, accept: '.txt,.eml' },
  ];

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setParsedPreview([]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!file && !textContent.trim()) {
      setError('Please upload a file or paste content');
      return;
    }
    
    setParsing(true);
    setError(null);
    
    try {
      let response;
      if (file) {
        response = await transactionsAPI.parseStatement(file, sourceType);
      } else {
        response = await transactionsAPI.parseText(textContent, sourceType);
      }
      
      setParsedPreview(response.parsed || []);
      setResult(response);
    } catch (err) {
      console.error('Parse failed:', err);
      setError(err.response?.data?.error || 'Failed to parse. Please check the format.');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    setParsing(true);
    try {
      const response = await transactionsAPI.confirmImport(parsedPreview);
      setResult({ ...result, imported: true, count: response.added });
      if (onParseSuccess) {
        onParseSuccess(response);
      }
    } catch (err) {
      setError('Failed to import transactions');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-gray-900">Import from Bank/SMS/Email</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {result?.imported ? (
            // Success state
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Import Successful!</h4>
              <p className="text-gray-500 mb-4">
                Added {result.count} transactions from your {sourceTypes.find(s => s.id === sourceType)?.label}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          ) : parsedPreview.length > 0 ? (
            // Preview state
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Found {parsedPreview.length} transactions
                </h4>
                <span className="text-xs text-gray-500">Review before importing</span>
              </div>
              
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">Date</th>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">Description</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-500">Amount</th>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedPreview.map((txn, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600">{txn.date}</td>
                        <td className="px-3 py-2 text-gray-900">{txn.description}</td>
                        <td className="px-3 py-2 text-right text-gray-900">₹{txn.amount?.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                            {txn.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setParsedPreview([])}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={parsing}
                  className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Confirm Import
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Source Type Selector */}
              <div className="mb-4">
                <label className="text-xs text-gray-600 mb-2 block">Select Source Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {sourceTypes.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setSourceType(id)}
                      className={`p-3 rounded-xl border transition-all ${
                        sourceType === id 
                          ? 'border-primary-500 bg-primary-50 text-primary-600' 
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  file ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={sourceTypes.find(s => s.id === sourceType)?.accept}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-primary-500" />
                    <div className="text-left">
                      <p className="text-gray-900 font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-700 text-sm">Drop your file here or click to browse</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports: {sourceTypes.find(s => s.id === sourceType)?.accept}
                    </p>
                  </>
                )}
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-500">OR PASTE TEXT</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Text Input */}
              <textarea
                ref={textInputRef}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={sourceType === 'sms' 
                  ? "Paste SMS messages here...\nExample:\nHDFC Bank: Rs.1500 debited from a/c **1234 on 15-01-26. Info: SWIGGY"
                  : "Paste bank statement text or email content here..."
                }
                className="w-full h-32 p-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-none"
              />

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              {/* Sample Format */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-2">
                  {sourceType === 'sms' ? 'SMS Format Examples:' : 
                   sourceType === 'email' ? 'Email Format Support:' : 
                   'Bank Statement Formats:'}
                </p>
                <code className="text-xs text-primary-600 block whitespace-pre-wrap">
                  {sourceType === 'sms' 
                    ? 'HDFC: Rs.1500 debited on 15-01-26 for SWIGGY\nICICI: INR 2000 spent at Amazon on 14/01/2026'
                    : sourceType === 'email'
                    ? 'Transaction alerts from banks, UPI receipts, bill confirmations'
                    : 'PDF statements from HDFC, ICICI, SBI, Axis\nCSV exports from any bank'}
                </code>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={handleParse}
                  disabled={(!file && !textContent.trim()) || parsing}
                  className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Parse & Preview
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankStatementParser;
