"use client";

import { useState } from "react";

interface AdvancedPanelProps {
  content: string;
  onApplyResult: (result: string) => void;
  coinsBalance: number;
}

interface PlagiarismResult {
  similarity: number;
  isPlagiarized: boolean;
  sources: Array<{
    url: string;
    title: string;
    similarity: number;
  }>;
  message: string;
}

export default function AdvancedPanel({ content, onApplyResult, coinsBalance }: AdvancedPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
  const [showCitationStyle, setShowCitationStyle] = useState(false);
  const [selectedCitationStyle, setSelectedCitationStyle] = useState("APA");

  const handleAdvancedAction = async (action: string, citationStyle?: string) => {
    if (!content.trim()) {
      setError("Please enter some text first!");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setError("");
    setIsProcessing(true);
    setPlagiarismResult(null);

    try {
      const { apiFetch } = await import("@/lib/api");

      interface AdvancedResponse {
        error?: string;
        result?: {
          similarity?: number;
          isPlagiarized?: boolean;
          sources?: Array<{ url: string; title: string; similarity: number }>;
          message?: string;
          rewritten?: string;
          humanized?: string;
          bypassed?: string;
          cited?: string;
        };
      }

      const response = await apiFetch<AdvancedResponse>("/api/ai/advanced", {
        method: "POST",
        body: JSON.stringify({
          action,
          text: content,
          citationStyle,
        }),
      });

      if (!response || response.error) {
        setError(response?.error || "Processing failed");
        setTimeout(() => setError(""), 3000);
        return;
      }

      // Handle different result types
      if (action === 'plagiarism_check' && response.result) {
        setPlagiarismResult(response.result as PlagiarismResult);
      } else if (response.result?.rewritten) {
        onApplyResult(response.result.rewritten);
      } else if (response.result?.humanized) {
        onApplyResult(response.result.humanized);
      } else if (response.result?.bypassed) {
        onApplyResult(response.result.bypassed);
      } else if (response.result?.cited) {
        onApplyResult(response.result.cited);
      }

      // Show success message
      alert(response.result?.message || 'Success!');

    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center justify-between">
        <span>🚀 Advanced Tools</span>
        {isProcessing && (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
        )}
      </h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Plagiarism Check */}
      <button
        onClick={() => handleAdvancedAction('plagiarism_check')}
        disabled={isProcessing || coinsBalance < 30}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg hover:shadow-md transition-all disabled:opacity-50"
      >
        <div className="flex items-center space-x-3">
          <span>🔍</span>
          <span className="font-medium text-red-700">Check Plagiarism</span>
        </div>
        <span className="text-xs text-red-600 font-semibold">30 coins</span>
      </button>

      {/* Plagiarism Results */}
      {plagiarismResult && (
        <div className={`p-4 rounded-lg border-2 ${plagiarismResult.isPlagiarized
          ? 'bg-red-50 border-red-300'
          : 'bg-green-50 border-green-300'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-900">Plagiarism Report</h4>
            <span className={`text-2xl font-bold ${plagiarismResult.isPlagiarized ? 'text-red-600' : 'text-green-600'
              }`}>
              {plagiarismResult.similarity}%
            </span>
          </div>
          <p className="text-sm text-slate-700 mb-3">{plagiarismResult.message}</p>

          {plagiarismResult.sources.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">Potential Sources:</p>
              {plagiarismResult.sources.map((source, idx) => (
                <div key={idx} className="text-xs bg-white p-2 rounded border border-slate-200">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {source.title}
                  </a>
                  <span className="ml-2 text-slate-500">({source.similarity}% match)</span>
                </div>
              ))}
            </div>
          )}

          {plagiarismResult.isPlagiarized && (
            <button
              onClick={() => handleAdvancedAction('rewrite_unique')}
              disabled={isProcessing}
              className="mt-3 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all"
            >
              Make 100% Unique (25 coins)
            </button>
          )}
        </div>
      )}

      {/* Humanize AI Text */}
      <button
        onClick={() => handleAdvancedAction('humanize')}
        disabled={isProcessing || coinsBalance < 20}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg hover:shadow-md transition-all disabled:opacity-50"
      >
        <div className="flex items-center space-x-3">
          <span>🧑</span>
          <span className="font-medium text-blue-700">Humanize AI Text</span>
        </div>
        <span className="text-xs text-blue-600 font-semibold">20 coins</span>
      </button>

      {/* Bypass AI Detector */}
      <button
        onClick={() => handleAdvancedAction('bypass_detector')}
        disabled={isProcessing || coinsBalance < 20}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg hover:shadow-md transition-all disabled:opacity-50"
      >
        <div className="flex items-center space-x-3">
          <span>🔓</span>
          <span className="font-medium text-purple-700">Bypass AI Detector</span>
        </div>
        <span className="text-xs text-purple-600 font-semibold">20 coins</span>
      </button>

      {/* Generate Citations */}
      <div className="space-y-2">
        <button
          onClick={() => setShowCitationStyle(!showCitationStyle)}
          disabled={isProcessing || coinsBalance < 10}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:shadow-md transition-all disabled:opacity-50"
        >
          <div className="flex items-center space-x-3">
            <span>📚</span>
            <span className="font-medium text-green-700">Generate Citations</span>
          </div>
          <span className="text-xs text-green-600 font-semibold">10 coins</span>
        </button>

        {showCitationStyle && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <label className="text-xs font-semibold text-slate-700">Citation Style:</label>
            <div className="flex space-x-2">
              {['APA', 'MLA', 'Chicago', 'Harvard'].map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedCitationStyle(style)}
                  className={`flex-1 px-3 py-2 rounded font-semibold text-sm transition-all ${selectedCitationStyle === style
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  {style}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                handleAdvancedAction('generate_citation', selectedCitationStyle);
                setShowCitationStyle(false);
              }}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
            >
              Generate {selectedCitationStyle} Citations
            </button>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700">
        <p className="font-semibold mb-1">💡 Pro Tips:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Check plagiarism before submitting</li>
          <li>Humanize AI text to sound natural</li>
          <li>Bypass detectors for academic use</li>
          <li>Add citations for credibility</li>
        </ul>
      </div>
    </div>
  );
}
