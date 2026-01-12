'use client';

import React, { useState, useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { EditorToolbar } from "@/components/EditorToolbar";
import { IntentSelector } from '@/components/editor/IntentSelector';
import { useRouter } from 'next/navigation';
import type { RewriteRequest } from '@/types/rewrite';
import NewDocumentModal from '../NewDocumentModal';
import RenameModal from '../RenameModal';
export default function EditorPage() {
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [title, setTitle] = useState('Untitled Document');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [coinBalance, setCoinBalance] = useState(100);

  // Document naming states
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showDocMenu, setShowDocMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document...',
      }),
      CharacterCount,
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none min-h-[500px] p-6',
      },
    },
  });

  // Auto-save functionality
  useEffect(() => {
    if (!editor || !documentId) return;

    const saveTimeout = setTimeout(async () => {
      await saveDocument();
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [editor?.getHTML(), title, documentId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N = New Document
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowNewDocModal(true);
      }

      // Ctrl/Cmd + R = Rename Document
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        setShowRenameModal(true);
      }

      // F2 = Rename Document
      if (e.key === 'F2') {
        e.preventDefault();
        setShowRenameModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, []);

  // Create initial document
  useEffect(() => {
    createDocument();
  }, []);

  const createDocument = async (documentName?: string) => {
    try {
      const newTitle = documentName || 'Untitled Document';
      const { apiFetch } = await import("@/lib/api");

      interface DocResponse {
        data?: { id: string };
        error?: string;
      }

      const res = await apiFetch<DocResponse>('/api/docs', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, content: '' }),
      });

      if (!res?.data?.id) throw new Error('Failed to create document');

      setDocumentId(res.data.id);
      setTitle(newTitle);

      if (editor) {
        editor.commands.setContent('');
      }

      setShowNewDocModal(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveDocument = async () => {
    if (!documentId || !editor) return;

    setIsSaving(true);
    try {
      const { apiFetch } = await import("@/lib/api");

      await apiFetch(`/api/docs/${documentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          content: editor.getHTML(),
        }),
      });
    } catch (err: any) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenameDocument = async (newName: string) => {
    setTitle(newName);
    setIsEditingTitle(false);

    // Save immediately
    if (documentId && editor) {
      try {
        const { apiFetch } = await import("@/lib/api");

        await apiFetch(`/api/docs/${documentId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: newName,
            content: editor.getHTML(),
          }),
        });
      } catch (err: any) {
        console.error('Rename error:', err);
        setError('Failed to rename document');
      }
    }
  };

  const handleDuplicateDocument = async () => {
    if (!documentId || !editor) return;

    try {
      const duplicateName = `${title} (Copy)`;
      const { apiFetch } = await import("@/lib/api");

      interface DocResponse {
        data?: { id: string };
        error?: string;
      }

      const res = await apiFetch<DocResponse>('/api/docs', {
        method: 'POST',
        body: JSON.stringify({
          title: duplicateName,
          content: editor.getHTML(),
        }),
      });

      if (!res?.data?.id) throw new Error('Failed to duplicate document');

      alert(`Document duplicated as "${duplicateName}"`);

      // Optionally load the new document
      setDocumentId(res.data.id);
      setTitle(duplicateName);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentId) return;

    if (!confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { apiFetch } = await import("@/lib/api");

      await apiFetch(`/api/docs/${documentId}`, {
        method: 'DELETE',
      });

      // Create new blank document
      createDocument();
    } catch (err: any) {
      setError('Failed to delete document');
    }
  };

  const handleRewrite = async (request: Partial<RewriteRequest>) => {
    if (!editor || !documentId) return;

    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to
    );

    const contentToRewrite = selectedText || editor.getText();

    if (!contentToRewrite.trim()) {
      setError('Please write some content first');
      return;
    }

    setIsRewriting(true);
    setError(null);
    setRewriteResult(null);

    try {
      const { apiFetch } = await import("@/lib/api");

      interface RewriteResponse {
        data?: {
          rewritten_content?: string;
          remaining_balance?: number;
        };
        error?: string;
      }

      const data = await apiFetch<RewriteResponse>('/api/ai/process', {
        method: 'POST',
        body: JSON.stringify({
          action: 'rewrite',
          text: contentToRewrite,
          ...request,
        }),
      });

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.data?.rewritten_content) {
        setRewriteResult(data.data.rewritten_content);
      }
      if (data?.data?.remaining_balance !== undefined) {
        setCoinBalance(data.data.remaining_balance);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRewriting(false);
    }
  };

  const applyRewrite = () => {
    if (!editor || !rewriteResult) return;

    const hasSelection =
      editor.state.selection.from !== editor.state.selection.to;

    if (hasSelection) {
      editor.commands.insertContentAt(
        { from: editor.state.selection.from, to: editor.state.selection.to },
        rewriteResult
      );
    } else {
      editor.commands.setContent(rewriteResult);
    }

    setRewriteResult(null);
  };

  if (!editor) return <div>Loading editor...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              ← Back
            </button>

            {/* Inline Title Editor with Rename */}
            <div className="flex items-center gap-2 flex-1 max-w-md group">
              {!isEditingTitle ? (
                <>
                  <h1
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xl font-semibold cursor-pointer hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Click to rename (F2)"
                  >
                    {title}
                  </h1>
                  <button
                    onClick={() => setShowRenameModal(true)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all"
                    title="Rename document (F2)"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </>
              ) : (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => {
                    setIsEditingTitle(false);
                    handleRenameDocument(title);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false);
                      handleRenameDocument(title);
                    } else if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                    }
                  }}
                  className="text-xl font-semibold bg-white dark:bg-gray-800 border-2 border-blue-500 focus:outline-none px-2 py-1 rounded flex-1"
                  autoFocus
                  maxLength={100}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* New Document Button */}
            <button
              onClick={() => setShowNewDocModal(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
              title="New Document (Ctrl+N)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>

            {/* Document Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDocMenu(!showDocMenu)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Document menu"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {showDocMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 py-2">
                  <button
                    onClick={() => {
                      setShowRenameModal(true);
                      setShowDocMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                  >
                    <span>✏️</span>
                    <span>Rename</span>
                    <span className="ml-auto text-xs text-gray-400">F2</span>
                  </button>

                  <button
                    onClick={() => {
                      handleDuplicateDocument();
                      setShowDocMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                  >
                    <span>📋</span>
                    <span>Duplicate</span>
                  </button>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                  <button
                    onClick={() => {
                      handleDeleteDocument();
                      setShowDocMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900 transition-colors flex items-center gap-3 text-red-600"
                  >
                    <span>🗑️</span>
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-500">
              {isSaving ? 'Saving...' : 'Saved'}
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <span className="text-lg">🪙</span>
              <span className="font-semibold">{coinBalance}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <EditorToolbar editor={editor} />
            <div className="min-h-[600px]">
              <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6">
                <div
                  className="ProseMirror"
                  style={{ minHeight: '500px' }}
                >
                  {React.createElement(
                    'div',
                    { ref: (el: HTMLDivElement | null) => el && editor.view.dom.parentElement !== el && el.appendChild(editor.view.dom) }
                  )}
                </div>
              </div>
            </div>

            {/* Stats Footer */}
            <div className="border-t px-6 py-3 text-sm text-gray-500 flex justify-between bg-gray-50 dark:bg-gray-700">
              <span>{editor.storage.characterCount.characters()} characters</span>
              <span>{editor.storage.characterCount.words()} words</span>
              <span>
                ~{Math.ceil(editor.storage.characterCount.words() / 200)} min read
              </span>
            </div>
          </div>

          {/* Rewrite Preview */}
          {rewriteResult && (
            <div className="bg-green-50 dark:bg-green-900 border-2 border-green-200 dark:border-green-700 rounded-lg p-6">
              <h3 className="font-semibold mb-3 text-green-800 dark:text-green-100">
                ✨ AI Rewrite Result
              </h3>
              <div
                className="prose prose-sm dark:prose-invert mb-4"
                dangerouslySetInnerHTML={{ __html: rewriteResult }}
              />
              <div className="flex gap-3">
                <button
                  onClick={applyRewrite}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                >
                  ✓ Apply This Version
                </button>
                <button
                  onClick={() => setRewriteResult(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <IntentSelector onRewrite={handleRewrite} disabled={isRewriting} />

          {error && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-100 p-4 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
            <h3 className="font-semibold mb-2">💡 Tips</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Select text to rewrite just that part</li>
              <li>• Each rewrite costs 5 coins</li>
              <li>• Press F2 to rename document</li>
              <li>• Ctrl+N for new document</li>
            </ul>
          </div>
        </div>
      </div>

      {/* New Document Modal */}
      {showNewDocModal && (
        <NewDocumentModal
          onClose={() => setShowNewDocModal(false)}
          onCreate={createDocument}
        />
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <RenameModal
          currentName={title}
          onClose={() => setShowRenameModal(false)}
          onRename={handleRenameDocument}
        />
      )}
    </div>
  );
}


