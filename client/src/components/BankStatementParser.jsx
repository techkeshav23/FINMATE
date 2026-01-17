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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold text-white">Import from Bank/SMS/Email</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {result?.imported ? (
            // Success state
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-primary-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">Import Successful!</h4>
              <p className="text-dark-400 mb-4">
                Added {result.count} transactions from your {sourceTypes.find(s => s.id === sourceType)?.label}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          ) : parsedPreview.length > 0 ? (
            // Preview state
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-white">
                  Found {parsedPreview.length} transactions
                </h4>
                <span className="text-xs text-dark-400">Review before importing</span>
              </div>
              
              <div className="max-h-64 overflow-y-auto border border-dark-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-dark-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-dark-400">Date</th>
                      <th className="px-3 py-2 text-left text-xs text-dark-400">Description</th>
                      <th className="px-3 py-2 text-right text-xs text-dark-400">Amount</th>
                      <th className="px-3 py-2 text-left text-xs text-dark-400">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {parsedPreview.map((txn, idx) => (
                      <tr key={idx} className="hover:bg-dark-800/50">
                        <td className="px-3 py-2 text-dark-300">{txn.date}</td>
                        <td className="px-3 py-2 text-white">{txn.description}</td>
                        <td className="px-3 py-2 text-right text-white">₹{txn.amount?.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 text-xs bg-dark-700 text-dark-300 rounded">
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
                  className="flex-1 px-4 py-2.5 text-dark-300 bg-dark-800 hover:bg-dark-700 rounded-xl"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={parsing}
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl flex items-center justify-center gap-2"
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
                <label className="text-xs text-dark-400 mb-2 block">Select Source Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {sourceTypes.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setSourceType(id)}
                      className={`p-3 rounded-xl border transition-all ${
                        sourceType === id 
                          ? 'border-primary-500 bg-primary-500/10 text-primary-400' 
                          : 'border-dark-700 text-dark-400 hover:border-dark-600'
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
                  file ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600 hover:border-dark-500'
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
                    <FileText className="w-8 h-8 text-primary-400" />
                    <div className="text-left">
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-xs text-dark-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-dark-500 mx-auto mb-2" />
                    <p className="text-dark-300 text-sm">Drop your file here or click to browse</p>
                    <p className="text-xs text-dark-500 mt-1">
                      Supports: {sourceTypes.find(s => s.id === sourceType)?.accept}
                    </p>
                  </>
                )}
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-dark-700" />
                <span className="text-xs text-dark-500">OR PASTE TEXT</span>
                <div className="flex-1 h-px bg-dark-700" />
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
                className="w-full h-32 p-3 bg-dark-800 border border-dark-700 rounded-xl text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50 resize-none"
              />

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Sample Format */}
              <div className="mt-4 p-3 bg-dark-800 rounded-lg">
                <p className="text-xs text-dark-400 mb-2">
                  {sourceType === 'sms' ? 'SMS Format Examples:' : 
                   sourceType === 'email' ? 'Email Format Support:' : 
                   'Bank Statement Formats:'}
                </p>
                <code className="text-xs text-primary-400 block whitespace-pre-wrap">
                  {sourceType === 'sms' 
                    ? 'HDFC: Rs.1500 debited on 15-01-26 for SWIGGY\nICICI: INR 2000 spent at Amazon on 14/01/2026'
                    : sourceType === 'email'
                    ? 'Transaction alerts from banks, UPI receipts, bill confirmations'
                    : 'PDF statements from HDFC, ICICI, SBI, Axis\nCSV exports from any bank'}
                </code>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 text-dark-300 bg-dark-800 hover:bg-dark-700 rounded-xl">
                  Cancel
                </button>
                <button
                  onClick={handleParse}
                  disabled={(!file && !textContent.trim()) || parsing}
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white rounded-xl flex items-center justify-center gap-2"
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
