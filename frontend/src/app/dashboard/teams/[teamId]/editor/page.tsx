"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StyleGuide {
  id: string;
  brand_voice: string;
  tone: string;
  approved_terms: string[];
  forbidden_terms: string[];
}

interface Collaborator {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  cursor_pos?: number;
  initials: string;
  color?: string;
}

interface Version {
  id: string;
  version_num: number;
  title: string;
  content: string;
  change_note?: string;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  content: string;
  selection?: { from: number; to: number; text: string };
  resolved: boolean;
  created_at: string;
}

interface Approval {
  id: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  submitted_by?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
}

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700 border-slate-300',
  pending_review: 'bg-amber-100 text-amber-700 border-amber-300',
  approved: 'bg-green-100 text-green-700 border-green-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
};

const STATUS_LABELS = {
  draft: '📝 Draft',
  pending_review: '👀 Pending Review',
  approved: '✅ Approved',
  rejected: '❌ Rejected',
};

export default function PremiumTeamEditor() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const teamId = params.teamId as string;

  const [title, setTitle] = useState("Untitled Strategy Doc");
  const [docId, setDocId] = useState<string | null>(null);
  const [styleGuide, setStyleGuide] = useState<StyleGuide | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activeViolations, setActiveViolations] = useState<string[]>([]);

  // SIDEBAR STATE - Only one sidebar open at a time
  type SidebarType = 'ai' | 'versions' | 'comments' | null;
  const [activeSidebar, setActiveSidebar] = useState<SidebarType>('ai');

  // NEW STATE FOR FEATURES
  const [versions, setVersions] = useState<Version[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [approval, setApproval] = useState<Approval | null>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [showExport, setShowExport] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      Typography,
      Placeholder.configure({
        placeholder: "Start writing your team's masterpiece...",
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-lg focus:outline-none max-w-none min-h-[500px] p-8 text-slate-900 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-p:my-4",
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      checkCompliance(text);
      triggerAutoSave();
    },
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!user) {
      router.push('/login');
      return;
    }

    const init = async () => {
      // Load style guide
      const response = await apiFetch(`/api/teams/${teamId}/style-guide`) as { data?: { styleGuide?: StyleGuide } } | null;
      if (response?.data?.styleGuide) {
        setStyleGuide(response.data.styleGuide);
      }

      // Load user role
      try {
        const roleRes = await apiFetch(`/api/teams/${teamId}/role`) as { data?: { role?: string } } | null;
        if (roleRes?.data?.role) {
          setUserRole(roleRes.data.role);
        }
      } catch (e) { }
    };
    init();

    // Set up presence heartbeat
    presenceIntervalRef.current = setInterval(() => {
      updatePresence();
    }, 10000);

    // Initial presence
    updatePresence();

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [session, status, teamId]);

  // Load data when docId changes
  useEffect(() => {
    if (docId) {
      loadVersions();
      loadComments();
      loadApproval();
      loadCollaborators();
    }
  }, [docId]);

  // === PRESENCE ===
  const updatePresence = async () => {
    if (!docId || !user) return;
    try {
      await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/presence`, {
        method: 'POST',
        body: JSON.stringify({ cursorPos: editor?.state?.selection?.anchor }),
      });
    } catch (e) { }
  };

  const loadCollaborators = async () => {
    if (!docId) return;
    try {
      const res = await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/presence`) as { data?: any[] } | null;
      if (res?.data) {
        const collabs = res.data.map((p: any) => ({
          ...p,
          initials: (p.user_name || p.user_email || 'U').substring(0, 2).toUpperCase(),
        }));
        setCollaborators(collabs);
      }
    } catch (e) { }
  };

  // === VERSION HISTORY ===
  const loadVersions = async () => {
    if (!docId) return;
    try {
      const res = await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/versions`) as { data?: Version[] } | null;
      if (res?.data) setVersions(res.data);
    } catch (e) { }
  };

  const createVersion = async (changeNote?: string) => {
    if (!docId || !editor) return;
    try {
      await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/versions`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          content: editor.getHTML(),
          changeNote: changeNote || 'Manual save',
        }),
      });
      loadVersions();
      toast.success('Version saved!');
    } catch (e) {
      toast.error('Failed to save version');
    }
  };

  const restoreVersion = (version: Version) => {
    if (!editor) return;
    editor.commands.setContent(version.content);
    setTitle(version.title);
    toast.success(`Restored to version ${version.version_num}`);
    setActiveSidebar('ai');
    triggerAutoSave();
  };

  // === COMMENTS ===
  const loadComments = async () => {
    if (!docId) return;
    try {
      const res = await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/comments`) as { data?: Comment[] } | null;
      if (res?.data) setComments(res.data);
    } catch (e) { }
  };

  const addComment = async () => {
    if (!docId || !newComment.trim()) return;

    const selection = editor?.state?.selection;
    let selectionData = null;
    if (selection && selection.from !== selection.to) {
      selectionData = {
        from: selection.from,
        to: selection.to,
        text: editor?.state?.doc.textBetween(selection.from, selection.to) || '',
      };
    }

    try {
      await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: newComment,
          selection: selectionData,
        }),
      });
      setNewComment('');
      loadComments();
      toast.success('Comment added!');
    } catch (e) {
      toast.error('Failed to add comment');
    }
  };

  const resolveComment = async (commentId: string, resolved: boolean) => {
    if (!docId) return;
    try {
      await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ resolved }),
      });
      loadComments();
    } catch (e) { }
  };

  const deleteComment = async (commentId: string) => {
    if (!docId) return;
    try {
      await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      loadComments();
      toast.success('Comment deleted');
    } catch (e) { }
  };

  // === APPROVAL WORKFLOW ===
  const loadApproval = async () => {
    if (!docId) return;
    try {
      const res = await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/approval`) as { data?: Approval } | null;
      if (res?.data) setApproval(res.data);
    } catch (e) { }
  };

  const submitForReview = async () => {
    if (!docId) return;
    try {
      await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/submit-review`, {
        method: 'POST',
      });
      loadApproval();
      toast.success('Submitted for review!');
    } catch (e) {
      toast.error('Failed to submit');
    }
  };

  const approveDocument = async () => {
    if (!docId) return;
    try {
      await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ note: 'Approved' }),
      });
      loadApproval();
      toast.success('Document approved!');
    } catch (e) {
      toast.error('Failed to approve');
    }
  };

  const rejectDocument = async (note: string) => {
    if (!docId) return;
    try {
      await apiFetch(`/api/team-editor/${teamId}/documents/${docId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      loadApproval();
      toast.success('Document rejected');
    } catch (e) {
      toast.error('Failed to reject');
    }
  };

  // === EXISTING FUNCTIONS ===
  const checkCompliance = useCallback((text: string) => {
    if (!styleGuide) return;
    const violations: string[] = [];
    styleGuide.forbidden_terms?.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(text)) violations.push(term);
    });
    setActiveViolations(Array.from(new Set(violations)));
  }, [styleGuide]);

  const triggerAutoSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(() => saveDocument(), 2000);
  };

  const saveDocument = async () => {
    if (!editor || !user) return;

    try {
      const content = editor.getHTML();

      const payload = {
        team_id: teamId,
        title: title,
        content: content,
      };

      if (docId) {
        await apiFetch(`/api/documents/${docId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        const response = await apiFetch('/api/documents', {
          method: 'POST',
          body: JSON.stringify(payload),
        }) as { data?: { id?: string } } | null;
        if (response?.data?.id) {
          setDocId(response.data.id);
        }
      }

      setLastSaved(new Date());
    } catch (err: any) {
      console.error("Auto-save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // === ENHANCED AI COMMANDS ===
  const runAiCommand = async (command: string) => {
    if (!editor || isProcessingAI) return;

    const { from, to } = editor.state.selection;
    let text = editor.state.doc.textBetween(from, to);
    let isFullSelection = false;

    if (!text) {
      text = editor.getText();
      isFullSelection = true;
      if (!text.trim()) {
        toast.error("Write something first!");
        return;
      }
    }

    setIsProcessingAI(true);
    const actionLabels: Record<string, string> = {
      fix: '✨ Fixing grammar...',
      brand_voice: '🎭 Applying brand voice...',
      summarize: '📝 Summarizing...',
      expand: '📖 Expanding...',
      simplify: '💡 Simplifying...',
      formal: '👔 Making formal...',
      casual: '😊 Making casual...',
      improve: '🚀 Improving...',
    };

    const toastId = toast.loading(actionLabels[command] || 'Processing...');

    try {
      const actionMap: Record<string, string> = {
        fix: 'fix_grammar',
        brand_voice: 'brand_voice',
        summarize: 'summarize',
        expand: 'expand',
        simplify: 'improve',
        formal: 'rewrite',
        casual: 'rewrite',
        improve: 'improve',
      };

      const response = await fetch("/api/ai/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          action: actionMap[command] || 'improve',
          teamId,
          styleGuide,
          mode: command === 'formal' ? 'academic' : command === 'casual' ? 'casual' : 'professional',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI failed");

      if (data.result) {
        if (isFullSelection) {
          editor.commands.setContent(data.result);
        } else {
          editor.chain().focus().insertContentAt({ from, to }, data.result).run();
        }

        toast.success("Content updated!", { id: toastId });
        checkCompliance(editor.getText());
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      toast.error("AI Processing Failed: " + error.message, { id: toastId });
    } finally {
      setIsProcessingAI(false);
    }
  };

  // === EXPORT ===
  const exportDocument = async (format: string) => {
    if (!editor) return;

    const content = editor.getHTML();
    const plainText = editor.getText();

    switch (format) {
      case 'html':
        const htmlBlob = new Blob([`<!DOCTYPE html><html><head><title>${title}</title></head><body>${content}</body></html>`], { type: 'text/html' });
        downloadBlob(htmlBlob, `${title}.html`);
        break;
      case 'txt':
        const txtBlob = new Blob([plainText], { type: 'text/plain' });
        downloadBlob(txtBlob, `${title}.txt`);
        break;
      case 'md':
        // Simple HTML to Markdown
        const markdown = content
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<em>(.*?)<\/em>/gi, '*$1*')
          .replace(/<[^>]+>/g, '');
        const mdBlob = new Blob([markdown], { type: 'text/markdown' });
        downloadBlob(mdBlob, `${title}.md`);
        break;
      case 'pdf':
        // Open print dialog for PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html><html><head><title>${title}</title>
            <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;}</style>
            </head><body>${content}</body></html>
          `);
          printWindow.document.close();
          setTimeout(() => printWindow.print(), 500);
        }
        break;
    }
    setShowExport(false);
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const publishToLibrary = async () => {
    if (!editor || !user) return;
    setIsPublishing(true);
    const toastId = toast.loading("Publishing...");

    try {
      await apiFetch(`/api/teams/${teamId}/content`, {
        method: 'POST',
        body: JSON.stringify({
          title: title,
          content: editor.getText(),
          category: "General",
          tags: ["editor-published"],
          approved: true,
        }),
      });
      toast.success("Published!", { id: toastId });
    } catch (err: any) {
      toast.error("Failed: " + err.message, { id: toastId });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      <Toaster position="bottom-right" />

      {/* --- LEFT: MAIN EDITOR AREA --- */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOP NAVBAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-indigo-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); triggerAutoSave(); }}
              className="text-lg font-bold text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-100 rounded px-2"
            />
            {isSaving ? (
              <span className="text-xs text-slate-400 animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full"></span> Saving...
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Unsaved"}
              </span>
            )}

            {/* APPROVAL STATUS BADGE */}
            {approval && (
              <span className={cn("px-2 py-1 text-xs font-medium rounded border", STATUS_COLORS[approval.status])}>
                {STATUS_LABELS[approval.status]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* REAL-TIME COLLABORATORS BUBBLES */}
            <div className="flex -space-x-2 mr-4">
              <AnimatePresence>
                {collaborators.map((collab) => (
                  <motion.div
                    key={collab.user_id || collab.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm transform hover:scale-110 transition-transform cursor-default relative group"
                    title={collab.user_name || collab.user_email || 'User'}
                  >
                    {collab.initials}
                    {/* Online indicator dot */}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {collaborators.length === 0 && (
                <div className="text-xs text-slate-400 italic px-2">
                  Just you
                </div>
              )}
            </div>

            {/* VERSION HISTORY */}
            <button
              onClick={() => setActiveSidebar(activeSidebar === 'versions' ? 'ai' : 'versions')}
              className={cn("p-2 rounded-lg transition-all", activeSidebar === 'versions' ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600")}
              title="Version History"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* COMMENTS */}
            <button
              onClick={() => setActiveSidebar(activeSidebar === 'comments' ? 'ai' : 'comments')}
              className={cn("p-2 rounded-lg transition-all relative", activeSidebar === 'comments' ? "bg-amber-100 text-amber-700" : "hover:bg-slate-100 text-slate-600")}
              title="Comments"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {comments.filter(c => !c.resolved).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {comments.filter(c => !c.resolved).length}
                </span>
              )}
            </button>

            {/* EXPORT */}
            <div className="relative">
              <button
                onClick={() => setShowExport(!showExport)}
                className={cn("p-2 rounded-lg transition-all", showExport ? "bg-green-100 text-green-700" : "hover:bg-slate-100 text-slate-600")}
                title="Export"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              {showExport && (
                <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-50 min-w-[160px]">
                  <button onClick={() => exportDocument('pdf')} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 rounded">📄 Export PDF</button>
                  <button onClick={() => exportDocument('html')} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 rounded">🌐 Export HTML</button>
                  <button onClick={() => exportDocument('txt')} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 rounded">📝 Export Text</button>
                  <button onClick={() => exportDocument('md')} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 rounded">📋 Export Markdown</button>
                  <div className="border-t border-slate-200 my-1"></div>
                  <button onClick={copyShareLink} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 rounded">🔗 Copy Link</button>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveSidebar(activeSidebar === 'ai' ? null : 'ai')}
              className={cn("p-2 rounded-lg transition-all", activeSidebar === 'ai' ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-600")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>
        </header>

        {/* TOOLBAR */}
        <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar">
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} isActive={editor?.isActive('bold')}>B</ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} isActive={editor?.isActive('italic')}>I</ToolbarBtn>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor?.isActive('heading', { level: 1 })}>H1</ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor?.isActive('heading', { level: 2 })}>H2</ToolbarBtn>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <span className="text-xs font-medium text-slate-400 px-2 select-none">AI Actions:</span>
          <button onClick={() => runAiCommand('fix')} disabled={isProcessingAI} className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-100 disabled:opacity-50">
            ✨ Fix Grammar
          </button>
          <button onClick={() => runAiCommand('brand_voice')} disabled={isProcessingAI} className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors border border-purple-100 disabled:opacity-50">
            🎭 {styleGuide?.brand_voice || "Brand"} Voice
          </button>
          <button onClick={() => runAiCommand('improve')} disabled={isProcessingAI} className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-100 disabled:opacity-50">
            🚀 Improve
          </button>
          <button onClick={() => runAiCommand('summarize')} disabled={isProcessingAI} className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors border border-green-100 disabled:opacity-50">
            📝 Summarize
          </button>
          <button onClick={() => runAiCommand('expand')} disabled={isProcessingAI} className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors border border-amber-100 disabled:opacity-50">
            📖 Expand
          </button>
        </div>

        {/* EDITOR CANVAS */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 flex justify-center cursor-text" onClick={() => editor?.chain().focus().run()}>
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200 min-h-[800px] relative">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* --- VERSION HISTORY SIDEBAR --- */}
      <AnimatePresence mode="wait">
        {activeSidebar === 'versions' && (
          <motion.div
            key="versions"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20"
          >
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-xl">🕐</span> Version History</h3>
                <p className="text-xs text-slate-500 mt-1">Restore previous versions</p>
              </div>
              <button onClick={() => setActiveSidebar('ai')} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <button onClick={() => createVersion()} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                💾 Save Current Version
              </button>
              {versions.map((v) => (
                <div key={v.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-800">Version {v.version_num}</p>
                      <p className="text-xs text-slate-500">{new Date(v.created_at).toLocaleString()}</p>
                      {v.change_note && <p className="text-xs text-slate-600 mt-1">{v.change_note}</p>}
                    </div>
                    <button onClick={() => restoreVersion(v)} className="text-xs text-blue-600 hover:underline">Restore</button>
                  </div>
                </div>
              ))}
              {versions.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">No versions saved yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- COMMENTS SIDEBAR --- */}
      <AnimatePresence mode="wait">
        {activeSidebar === 'comments' && (
          <motion.div
            key="comments"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20"
          >
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-xl">💬</span> Comments</h3>
                <p className="text-xs text-slate-500 mt-1">Team discussions</p>
              </div>
              <button onClick={() => setActiveSidebar('ai')} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none"
                rows={2}
              />
              <button onClick={addComment} disabled={!newComment.trim()} className="mt-2 w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                Add Comment
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.map((c) => (
                <div key={c.id} className={cn("p-3 rounded-lg border", c.resolved ? "bg-green-50 border-green-200" : "bg-white border-slate-200")}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold">
                        {(c.user_name || c.user_email || 'U').substring(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-slate-700">{c.user_name || c.user_email}</span>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  {c.selection?.text && (
                    <div className="mt-2 p-2 bg-slate-100 rounded text-xs text-slate-600 italic">
                      "{c.selection.text}"
                    </div>
                  )}
                  <p className="mt-2 text-sm text-slate-800">{c.content}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => resolveComment(c.id, !c.resolved)} className={cn("text-xs", c.resolved ? "text-green-600" : "text-blue-600")}>
                      {c.resolved ? '↩️ Unresolve' : '✓ Resolve'}
                    </button>
                    <button onClick={() => deleteComment(c.id)} className="text-xs text-red-600">🗑️ Delete</button>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">No comments yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- RIGHT: AI SIDEBAR --- */}
      <AnimatePresence mode="wait">
        {activeSidebar === 'ai' && (
          <motion.div
            key="ai"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20"
          >
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-xl">🛡️</span> Brand Sentinel</h3>
              <p className="text-xs text-slate-500 mt-1">Real-time compliance checking</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-slate-600">Compliance Score</span>
                  <span className={cn("text-2xl font-bold", activeViolations.length === 0 ? "text-green-600" : "text-amber-600")}>
                    {activeViolations.length === 0 ? "100%" : `${Math.max(0, 100 - (activeViolations.length * 10))}%`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className={cn("h-2 rounded-full transition-all duration-500", activeViolations.length === 0 ? "bg-green-500" : "bg-amber-500")} style={{ width: activeViolations.length === 0 ? "100%" : `${Math.max(0, 100 - (activeViolations.length * 10))}%` }} />
                </div>
              </div>

              {activeViolations.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Violations Detected
                  </h4>
                  {activeViolations.map((term) => (
                    <div key={term} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-red-900 line-through decoration-red-900/50">{term}</span>
                        <button onClick={() => runAiCommand('brand_voice')} className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50">Fix</button>
                      </div>
                      <p className="text-xs text-red-700 mt-1">Contrary to brand voice.</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 opacity-75">
                  <div className="text-4xl mb-2 animate-pulse">✨</div>
                  <p className="text-sm font-medium text-slate-600">No content violations.</p>
                </div>
              )}

              {/* APPROVAL WORKFLOW SECTION */}
              {docId && (
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">📋 Approval Workflow</h4>

                  {approval?.status === 'draft' && (
                    <button onClick={submitForReview} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                      👀 Submit for Review
                    </button>
                  )}

                  {approval?.status === 'pending_review' && (userRole === 'owner' || userRole === 'admin') && (
                    <div className="space-y-2">
                      <button onClick={approveDocument} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                        ✅ Approve
                      </button>
                      <button onClick={() => rejectDocument('Needs revisions')} className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  {approval?.review_note && (
                    <div className="p-3 bg-slate-100 rounded-lg text-sm">
                      <p className="text-xs text-slate-500 mb-1">Review Note:</p>
                      <p className="text-slate-800">{approval.review_note}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button onClick={publishToLibrary} disabled={isPublishing} className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {isPublishing ? "Publishing..." : "📚 Publish to Team Library"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolbarBtn({ children, onClick, isActive }: { children: React.ReactNode, onClick: () => void, isActive?: boolean }) {
  return (
    <button onClick={onClick} className={cn("p-2 min-w-[32px] rounded text-sm font-bold transition-all", isActive ? "bg-slate-900 text-white shadow-md transform scale-105" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}>
      {children}
    </button>
  );
}