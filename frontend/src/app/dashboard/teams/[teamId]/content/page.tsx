"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface ContentLibraryItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  usage_count: number;
  approved: boolean;
  created_at: string;
  created_by: string;
  approved_by?: string;
  creator_email?: string;
  approver_email?: string;
}

export default function ContentLibraryPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const teamId = params.teamId as string;

  const [userRole, setUserRole] = useState<string>("");
  const [contentLibrary, setContentLibrary] = useState<ContentLibraryItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showApprovedOnly, setShowApprovedOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState({
    title: "",
    content: "",
    category: "",
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentLibraryItem | null>(null);

  useEffect(() => {
    const init = async () => {
      if (status === "loading") return;
      if (user) {
        await checkUserRole();
      } else {
        router.push("/login");
      }
    };
    init();
  }, [session, status]);

  const checkUserRole = async () => {
    try {
      const response = await apiFetch<{ data: { role: string } }>(`/api/teams/${teamId}/role`);
      setUserRole(response?.data?.role || "member");
    } catch (error) {
      console.error("Role check error:", error);
      setUserRole("member");
    }
  };

  const loadContent = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);

    try {
      const response = await apiFetch<{ data: ContentLibraryItem[] }>(`/api/teams/${teamId}/content`);
      if (response?.data) {
        setContentLibrary(response.data);
      }
    } catch (error) {
      console.error("Error loading content:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (!user || !teamId) return;

    loadContent();

    // Polling instead of realtime (every 10 seconds)
    const interval = setInterval(() => {
      loadContent(true);
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [user, teamId, loadContent]);

  useEffect(() => {
    let filtered = [...contentLibrary];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    if (showApprovedOnly) {
      filtered = filtered.filter((item) => item.approved);
    }

    setFilteredContent(filtered);
  }, [searchQuery, selectedCategory, showApprovedOnly, contentLibrary]);

  const addContent = async () => {
    if (!newContent.title.trim() || !newContent.content.trim()) return;
    setSaving(true);

    try {
      await apiFetch(`/api/teams/${teamId}/content`, {
        method: 'POST',
        body: JSON.stringify(newContent),
      });

      setShowAddModal(false);
      setNewContent({ title: "", content: "", category: "", tags: [] });
      setTagInput("");
      loadContent(true);
    } catch (error) {
      console.error("Add error:", error);
      alert("Failed to add content.");
    } finally {
      setSaving(false);
    }
  };

  const approveContent = async (itemId: string) => {
    try {
      await apiFetch(`/api/teams/${teamId}/content/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ approved: true }),
      });
      setSelectedItem(null);
      loadContent(true);
    } catch (error) {
      console.error("Approve error:", error);
      alert("Failed to approve content.");
    }
  };

  const rejectContent = async (itemId: string) => {
    if (!confirm("Rejecting this content will remove it. Continue?")) return;
    try {
      await apiFetch(`/api/teams/${teamId}/content/${itemId}`, {
        method: 'DELETE',
      });
      setSelectedItem(null);
      loadContent(true);
    } catch (error) {
      console.error("Reject error:", error);
      alert("Failed to reject/delete content.");
    }
  };

  const useContent = async (item: ContentLibraryItem) => {
    await navigator.clipboard.writeText(item.content);

    await apiFetch(`/api/teams/${teamId}/content/${item.id}/use`, {
      method: 'POST',
    });

    alert("✅ Copied to clipboard!");
  };

  const addTag = () => {
    if (tagInput.trim() && !newContent.tags.includes(tagInput.trim())) {
      setNewContent(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setNewContent(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const categories = Array.from(new Set(contentLibrary.map(i => i.category))).filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-10 shadow-xl text-white">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">Content Library</h1>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold border border-white/30">
                  {contentLibrary.length} Items
                </span>
              </div>
              <p className="text-indigo-100 text-lg max-w-xl">
                A shared repository of approved messaging, templates, and snippets for your team.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-lg text-xs font-mono text-indigo-200">
                <span>Viewing as:</span>
                <span className="font-bold text-white uppercase">{userRole}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Content
              </button>
              <Link href={`/dashboard/teams/${teamId}`}>
                <button className="px-6 py-3 bg-indigo-800/50 text-white border border-white/20 rounded-xl font-bold hover:bg-indigo-800/70 transition-all flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Back
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filters and Grid */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-48 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 capitalize"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <button
            onClick={() => setShowApprovedOnly(!showApprovedOnly)}
            className={`w-full md:w-auto px-6 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border ${showApprovedOnly
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
          >
            {showApprovedOnly ? (
              <><span className="w-2 h-2 bg-green-500 rounded-full"></span> Approved Only</>
            ) : (
              "Show All"
            )}
          </button>
        </div>

        {/* Content Grid */}
        {filteredContent.length > 0 ? (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredContent.map((item) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedItem(item)}
                  className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer group flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg uppercase tracking-wider">
                      {item.category}
                    </span>
                    {item.approved ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>

                  <div className="flex-1">
                    <p className="text-slate-500 text-sm line-clamp-3 mb-4 leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded font-medium">#{tag}</span>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
                    <span>By {item.creator_email?.split('@')[0]}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      {item.usage_count}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="text-6xl mb-4">🧐</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No content found</h3>
            <p className="text-slate-500">Try adjusting your filters or add something new.</p>
          </div>
        )}

        {/* Add Content Modal & Detail Modal omitted for brevity, they are same as previous valid version */}
        {/* Add Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Add Content</h2>
                      <p className="text-slate-500 text-sm">Share a template or snippet with the team.</p>
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Quarterly Report Intro"
                        value={newContent.title}
                        onChange={e => setNewContent({ ...newContent, title: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Content</label>
                      <textarea
                        rows={5}
                        placeholder="Type the reusable content here..."
                        value={newContent.content}
                        onChange={e => setNewContent({ ...newContent, content: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-800 resize-none font-mono text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                        <input
                          type="text"
                          placeholder="e.g. Email"
                          value={newContent.category}
                          onChange={e => setNewContent({ ...newContent, category: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tags</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Type & Enter"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTag()}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-800"
                          />
                          <button onClick={addTag} className="absolute right-2 top-2 p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                        </div>
                      </div>
                    </div>

                    {newContent.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newContent.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-full flex items-center gap-1">
                            #{tag}
                            <button onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={addContent}
                      disabled={saving || !newContent.title || !newContent.content}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Add to Library"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedItem && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="p-8 overflow-y-auto flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedItem.title}</h2>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold">{selectedItem.category}</span>
                        <span>•</span>
                        <span>Added by {selectedItem.creator_email}</span>
                        <span>•</span>
                        <span>{new Date(selectedItem.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>

                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${selectedItem.approved ? "bg-green-50 text-green-800 border border-green-100" : "bg-amber-50 text-amber-800 border border-amber-100"}`}>
                    {selectedItem.approved ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-semibold">Approved for team use by {selectedItem.approver_email}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-semibold">Pending Approval from Team Owner</span>
                      </>
                    )}
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                    <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed text-base">{selectedItem.content}</pre>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex gap-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => useContent(selectedItem)}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex justify-center items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy & Use
                    </button>

                    {(userRole === "owner" || userRole === "admin") && !selectedItem.approved && (
                      <button
                        onClick={() => approveContent(selectedItem.id)}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Approve
                      </button>
                    )}

                    {(userRole === "owner" || userRole === "admin" || user?.id === selectedItem.created_by) && (
                      <button
                        onClick={() => rejectContent(selectedItem.id)}
                        className="px-6 py-3 border-2 border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}