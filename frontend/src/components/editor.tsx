"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";

interface EditorProps {
  initialContent: string;
  onUpdate: (content: string) => void;
}

export function Editor({ initialContent, onUpdate }: EditorProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing... Use AI commands to enhance your content!",
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] max-w-none p-8 bg-white rounded-lg shadow-sm",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdate(html);
    },
  });

  async function handleAiCommand(command: string) {
    if (!editor) return;

    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to
    );

    if (!selectedText && command !== "generate") {
      alert("Please select some text first!");
      return;
    }

    setIsAiLoading(true);

    try {
      const { apiFetch } = await import("@/lib/api");

      interface AiResponse {
        result?: string;
        error?: string;
      }

      const data = await apiFetch<AiResponse>("/api/ai/process", {
        method: "POST",
        body: JSON.stringify({
          action: command === "fix-grammar" ? "fix_grammar" : command,
          text: selectedText,
        }),
      });

      if (data?.result) {
        if (command === "generate") {
          editor.commands.insertContent(data.result);
        } else {
          editor.commands.insertContent(data.result);
        }
      }
    } catch (error) {
      console.error("AI Error:", error);
      alert("AI command failed. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sticky top-20 z-10">
        <div className="flex flex-wrap gap-2">
          {/* Text Formatting */}
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("bold") ? "bg-indigo-100 text-indigo-600" : "text-gray-700"
                }`}
              title="Bold (Ctrl+B)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3H5a2 2 0 00-2 2v10a2 2 0 002 2h6a3 3 0 003-3V6a3 3 0 00-3-3zM7 11V7h4v4H7zm4 4H7v-2h4v2z" />
              </svg>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("italic") ? "bg-indigo-100 text-indigo-600" : "text-gray-700"
                }`}
              title="Italic (Ctrl+I)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 3v2h1.5l-2 10H6v2h8v-2h-1.5l2-10H16V3H8z" />
              </svg>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("strike") ? "bg-indigo-100 text-indigo-600" : "text-gray-700"
                }`}
              title="Strikethrough"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 10h14v1H3v-1zm4-3.5c0-1.38 1.12-2.5 2.5-2.5h1c1.38 0 2.5 1.12 2.5 2.5V9H11V6.5c0-.83-.67-1.5-1.5-1.5h-1c-.83 0-1.5.67-1.5 1.5V9H7V6.5zm3 7c-.83 0-1.5.67-1.5 1.5H7c0-1.38 1.12-2.5 2.5-2.5h1c1.38 0 2.5 1.12 2.5 2.5H11c0-.83-.67-1.5-1.5-1.5h-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Headings */}
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-3 py-2 rounded hover:bg-gray-100 transition-colors text-sm font-medium ${editor.isActive("heading", { level: 1 }) ? "bg-indigo-100 text-indigo-600" : "text-gray-700"
                }`}
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-3 py-2 rounded hover:bg-gray-100 transition-colors text-sm font-medium ${editor.isActive("heading", { level: 2 }) ? "bg-indigo-100 text-indigo-600" : "text-gray-700"
                }`}
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`px-3 py-2 rounded hover:bg-gray-100 transition-colors text-sm font-medium ${editor.isActive("heading", { level: 3 }) ? "bg-indigo-100 text-indigo-600" : "text-gray-700"
                }`}
            >
              H3
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("bulletList") ? "bg-indigo-100 text-indigo-600" : "text-gray-700"
                }`}
              title="Bullet List"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("orderedList") ? "bg-indigo-100 text-indigo-600" : "text-gray-700"
                }`}
              title="Numbered List"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* AI Commands */}
          <div className="flex items-center space-x-1">
            <span className="text-xs font-medium text-gray-500 mr-2">AI:</span>
            <button
              onClick={() => handleAiCommand("improve")}
              disabled={isAiLoading}
              className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              ✨ Improve
            </button>
            <button
              onClick={() => handleAiCommand("expand")}
              disabled={isAiLoading}
              className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              📝 Expand
            </button>
            <button
              onClick={() => handleAiCommand("summarize")}
              disabled={isAiLoading}
              className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              📊 Summarize
            </button>
            <button
              onClick={() => handleAiCommand("fix-grammar")}
              disabled={isAiLoading}
              className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              ✅ Fix Grammar
            </button>
          </div>
        </div>

        {isAiLoading && (
          <div className="mt-2 text-sm text-indigo-600 flex items-center">
            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            AI is thinking...
          </div>
        )}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}



