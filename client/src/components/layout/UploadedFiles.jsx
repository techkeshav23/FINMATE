import { useState } from 'react';
import { 
  FileText, Trash2, ChevronDown, ChevronRight, 
  Calendar, IndianRupee, AlertTriangle, X 
} from 'lucide-react';

/**
 * UploadedFiles - Shows uploaded files in sidebar with delete option
 * All data stored in localStorage
 */
const UploadedFiles = ({ files, onDeleteFile, compact = false }) => {
  const [expanded, setExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!files || files.length === 0) {
    return null;
  }

  const handleDelete = (fileId) => {
    if (confirmDelete === fileId) {
      onDeleteFile(fileId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(fileId);
      // Auto-cancel after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Compact mode for ProfileTab (no outer wrapper, no header toggle)
  if (compact) {
    return (
      <div className="space-y-2">
        {files.map((file) => (
          <FileItem 
            key={file.id} 
            file={file} 
            confirmDelete={confirmDelete}
            onDelete={handleDelete}
            onCancelDelete={() => setConfirmDelete(null)}
            formatDate={formatDate}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="px-3 mb-2">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span className="uppercase tracking-wider">Uploaded Files</span>
        <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded">
          {files.length}
        </span>
      </button>

      {/* File List */}
      {expanded && (
        <div className="space-y-1 mt-1">
          {files.map((file) => (
            <FileItem 
              key={file.id} 
              file={file} 
              confirmDelete={confirmDelete}
              onDelete={handleDelete}
              onCancelDelete={() => setConfirmDelete(null)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Extracted FileItem component for reuse
const FileItem = ({ file, confirmDelete, onDelete, onCancelDelete, formatDate }) => (
  <div className="group relative bg-white border border-gray-200 rounded-lg p-2.5 hover:border-gray-300 transition-colors">
    {/* Confirm Delete Overlay */}
    {confirmDelete === file.id && (
      <div className="absolute inset-0 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center gap-2 z-10">
        <button
          onClick={onCancelDelete}
          className="p-1.5 bg-white border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
        >
          <X className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDelete(file.id)}
          className="px-2 py-1 bg-red-500 text-gray-900 text-xs rounded hover:bg-red-600 flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    )}

    <div className="flex items-start gap-2">
      <div className="p-1.5 bg-primary-50 rounded">
        <FileText className="w-3.5 h-3.5 text-primary-500" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-600">
          <span className="flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            {formatDate(file.uploadedAt)}
          </span>
          <span>•</span>
          <span>{file.transactionCount} txns</span>
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(file.id)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-gray-600 hover:text-red-500 transition-all"
        title="Delete this file"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

export default UploadedFiles;
