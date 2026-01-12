"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface Template {
  id: string;
  name: string;
  category: string;
  mode: string;
  icon: string;
  description: string;
  structure: {
    sections: string[];
  };
}

interface TemplateLibraryProps {
  currentMode: string;
  onSelectTemplate: (template: Template) => void;
  onClose: () => void;
}

export default function TemplateLibrary({
  currentMode,
  onSelectTemplate,
  onClose,
}: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedCategory === "all") {
      setFilteredTemplates(templates);
    } else {
      setFilteredTemplates(templates.filter(t => t.category === selectedCategory));
    }
  }, [selectedCategory, templates]);

  const loadTemplates = async () => {
    try {
      const response = await apiFetch<{ data: Template[] }>('/api/templates');
      if (response?.data) {
        setTemplates(response.data);
        setFilteredTemplates(response.data);
      }
    } catch (error) {
      console.error('Load templates error:', error);
    }
    setLoading(false);
  };

  const categories = Array.from(new Set(templates.map(t => t.category)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-slate-900">📄 Template Library</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-slate-600">
            Choose a template to start writing with industry-specific structure
          </p>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${selectedCategory === "all"
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
            >
              All Templates ({templates.length})
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all capitalize ${selectedCategory === category
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
              >
                {category} ({templates.filter(t => t.category === category).length})
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  className="p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{template.icon}</span>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full capitalize">
                      {template.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-indigo-600">
                    {template.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">
                    {template.description}
                  </p>
                  <div className="text-xs text-slate-500">
                    {template.structure.sections.length} sections
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600 text-center">
            💡 Templates are optimized for their respective writing modes
          </p>
        </div>
      </div>
    </div>
  );
}
