'use client';

import { useState } from 'react';
import type { RewriteRequest } from '@/types/rewrite';

interface IntentSelectorProps {
  onRewrite: (request: Partial<RewriteRequest>) => void;
  disabled?: boolean;
}

export function IntentSelector({ onRewrite, disabled }: IntentSelectorProps) {
  const [intent, setIntent] = useState<RewriteRequest['intent']>('clarify');
  const [tone, setTone] = useState<RewriteRequest['tone']>('formal');

  const intents: Array<{ value: RewriteRequest['intent']; label: string; description: string }> = [
    { value: 'clarify', label: '✨ Clarify', description: 'Make it clearer' },
    { value: 'expand', label: '📝 Expand', description: 'Add more detail' },
    { value: 'simplify', label: '🎯 Simplify', description: 'Make it simpler' },
    { value: 'professional', label: '💼 Professional', description: 'More formal' },
    { value: 'casual', label: '😊 Casual', description: 'More relaxed' },
  ];

  const tones: Array<{ value: RewriteRequest['tone']; label: string }> = [
    { value: 'formal', label: 'Formal' },
    { value: 'informal', label: 'Informal' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'authoritative', label: 'Authoritative' },
  ];

  const handleRewrite = () => {
    onRewrite({ intent, tone });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Intent</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {intents.map((item) => (
            <button
              key={item.value}
              onClick={() => setIntent(item.value)}
              className={`p-3 rounded-lg border-2 transition text-left ${
                intent === item.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="font-medium text-sm">{item.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tone</label>
        <div className="flex gap-2">
          {tones.map((item) => (
            <button
              key={item.value}
              onClick={() => setTone(item.value)}
              className={`px-4 py-2 rounded-lg border transition ${
                tone === item.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleRewrite}
        disabled={disabled}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? 'Rewriting...' : '✨ Rewrite with AI'}
      </button>
    </div>
  );
}
