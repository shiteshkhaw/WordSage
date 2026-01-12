"use client";

import { useState, ReactNode } from "react";

interface AccordionProps {
  title: string;
  icon: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

export default function Accordion({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  badge 
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-slate-900">{title}</span>
          {badge && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="p-4 bg-slate-50 space-y-3 animate-slideDown">
          {children}
        </div>
      )}
    </div>
  );
}
