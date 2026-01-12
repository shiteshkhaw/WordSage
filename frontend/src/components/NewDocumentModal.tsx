"use client";

import { useState } from "react";

interface NewDocumentModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

export default function NewDocumentModal({ onClose, onCreate }: NewDocumentModalProps) {
  const [documentName, setDocumentName] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    const trimmedName = documentName.trim();
    
    if (!trimmedName) {
      setError("Document name cannot be empty");
      return;
    }
    
    if (trimmedName.length > 100) {
      setError("Document name must be less than 100 characters");
      return;
    }
    
    onCreate(trimmedName);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scaleIn">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Create New Document</h2>
        <p className="text-slate-600 mb-6 text-sm">Give your document a name to get started</p>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Document Name
          </label>
          <input
            type="text"
            value={documentName}
            onChange={(e) => {
              setDocumentName(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyPress}
            placeholder="e.g., My Research Paper, Blog Post Draft..."
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-slate-900 transition-all"
            autoFocus
            maxLength={100}
          />
          {error && (
            <p className="text-red-600 text-sm mt-2">⚠️ {error}</p>
          )}
          <p className="text-slate-400 text-xs mt-2">
            {documentName.length}/100 characters
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!documentName.trim()}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
