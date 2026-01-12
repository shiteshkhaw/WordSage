"use client";

import { useState } from "react";

interface Suggestion {
  id: number;
  action: string;
  original: string;
  suggestion: string;
  accepted: boolean;
  timestamp: string;
}

interface FloatingSuggestionsProps {
  suggestions: Suggestion[];
  onAccept: (id: number) => void;
  onDismiss: (id: number) => void;
}

export default function FloatingSuggestions({
  suggestions,
  onAccept,
  onDismiss,
}: FloatingSuggestionsProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const unacceptedSuggestions = suggestions.filter(s => !s.accepted);

  if (unacceptedSuggestions.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
      {/* Minimized State */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center space-x-2"
        >
          <span className="text-xl">💡</span>
          <span className="font-bold">{unacceptedSuggestions.length}</span>
        </button>
      ) : (
        /* Expanded State */
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-indigo-200 w-96 max-h-[500px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">💡</span>
              <h3 className="font-bold text-slate-900">
                Suggestions ({unacceptedSuggestions.length})
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-indigo-100 rounded transition-colors"
                title="Minimize"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-indigo-100 rounded transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Suggestions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {unacceptedSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 uppercase">
                    {suggestion.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-slate-400">{suggestion.timestamp}</span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-3 mb-3">
                  {suggestion.suggestion}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onAccept(suggestion.id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => onDismiss(suggestion.id)}
                    className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-300 transition-colors"
                  >
                    ✕ Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
