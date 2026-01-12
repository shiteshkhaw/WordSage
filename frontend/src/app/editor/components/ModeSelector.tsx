"use client";

import { useState } from "react";
import { INDUSTRY_MODES, IndustryMode } from "@/lib/ai/modes";

interface ModeSelectorProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
}

const colorClasses: Record<string, string> = {
  slate: 'from-slate-50 to-slate-100 border-slate-300 text-slate-700',
  blue: 'from-blue-50 to-blue-100 border-blue-300 text-blue-700',
  red: 'from-red-50 to-red-100 border-red-300 text-red-700',
  purple: 'from-purple-50 to-purple-100 border-purple-300 text-purple-700',
  indigo: 'from-indigo-50 to-indigo-100 border-indigo-300 text-indigo-700',
  green: 'from-green-50 to-green-100 border-green-300 text-green-700',
};

export default function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const modes = Object.values(INDUSTRY_MODES);
  const selectedMode = INDUSTRY_MODES[currentMode] || INDUSTRY_MODES.general;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 font-semibold transition-all hover:shadow-md bg-gradient-to-r ${colorClasses[selectedMode.color]}`}
      >
        <span className="text-xl">{selectedMode.icon}</span>
        <span>{selectedMode.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border-2 border-slate-200 z-20 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Select Writing Mode</h3>
              <p className="text-xs text-slate-600 mt-1">
                Choose industry-specific AI optimization
              </p>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    onModeChange(mode.id);
                    setShowDropdown(false);
                  }}
                  className={`w-full p-4 text-left transition-all hover:bg-slate-50 border-b border-slate-100 last:border-b-0 ${
                    currentMode === mode.id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl flex-shrink-0">{mode.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-900">{mode.name}</h4>
                        {currentMode === mode.id && (
                          <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{mode.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {mode.examples.slice(0, 3).map((example, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
                          >
                            {example}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-indigo-200">
              <p className="text-xs text-indigo-700">
                💡 <strong>Tip:</strong> AI will optimize your writing for the selected industry
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
