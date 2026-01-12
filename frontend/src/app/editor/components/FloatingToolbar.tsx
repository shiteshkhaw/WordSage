"use client";

import { useEffect, useState } from "react";

interface FloatingToolbarProps {
  onAction: (action: string) => void;
}

export default function FloatingToolbar({ onAction }: FloatingToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        setSelectedText(text);
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect) {
          // Calculate position with bounds checking
          const toolbarWidth = 300; // Approximate toolbar width
          const toolbarHeight = 80; // Approximate toolbar height
          
          // Get viewport dimensions
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Calculate initial position (centered above selection)
          let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
          let top = rect.top + window.scrollY - toolbarHeight - 10; // 10px above selection

          // Keep within horizontal bounds
          if (left < 10) {
            left = 10; // Min 10px from left edge
          } else if (left + toolbarWidth > viewportWidth - 10) {
            left = viewportWidth - toolbarWidth - 10; // Max 10px from right edge
          }

          // Keep within vertical bounds
          if (top < window.scrollY + 10) {
            // If toolbar would go above viewport, show below selection instead
            top = rect.bottom + window.scrollY + 10;
          }

          setPosition({ top, left });
        }
      } else {
        setPosition(null);
        setSelectedText("");
      }
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("selectionchange", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("selectionchange", handleSelection);
    };
  }, []);

  if (!position || !selectedText) return null;

  const tools = [
    { icon: "✏️", label: "Fix", action: "fix_grammar" },
    { icon: "🔄", label: "Rewrite", action: "rewrite" },
    { icon: "📊", label: "Summarize", action: "summarize" },
    { icon: "🧑", label: "Humanize", action: "humanize" },
  ];

  return (
    <div
      className="fixed z-50 animate-fadeIn"
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        maxWidth: '300px'
      }}
    >
      <div className="bg-slate-900 text-white rounded-lg shadow-2xl flex items-center space-x-1 p-2">
        {tools.map((tool) => (
          <button
            key={tool.action}
            onClick={() => {
              onAction(tool.action);
              window.getSelection()?.removeAllRanges();
            }}
            className="flex flex-col items-center px-3 py-2 hover:bg-slate-700 rounded transition-colors min-w-[60px]"
            title={tool.label}
          >
            <span className="text-lg">{tool.icon}</span>
            <span className="text-xs mt-1">{tool.label}</span>
          </button>
        ))}
      </div>
      {/* Arrow pointing to selection */}
      <div className="absolute left-1/2 transform -translate-x-1/2 top-full">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-900"></div>
      </div>
    </div>
  );
}
