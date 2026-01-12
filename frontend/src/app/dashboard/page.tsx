"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Team {
  id: string;
  name: string;
  owner_id: string;
  subscription_tier: string;
  max_members: number;
  created_at: string;
  member_count?: number;
  role?: string;
}

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);

  // Delete-related states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadUser();
    const t = setTimeout(() => setAnimateCards(true), 200);
    return () => clearTimeout(t);
  }, [session]);

  const loadUser = async () => {
    try {
      if (status === "loading") return;
      if (user) {
        await loadTeams();
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("loadUser error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await apiFetch<{ teams?: Team[] }>('/api/teams');
      // Backend returns { teams: [...] }, not { data: [...] }
      if (response?.teams) {
        setTeams(response.teams);
      } else if (Array.isArray(response)) {
        setTeams(response);
      } else {
        setTeams([]);
      }
    } catch (err) {
      console.error("loadTeams error:", err);
      setTeams([]);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim() || !user) return;

    setCreating(true);
    try {
      const response = await apiFetch<{ success?: boolean; team?: Team; error?: string }>('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: newTeamName }),
      });

      if (response?.success && !response.error) {
        setShowCreateModal(false);
        setNewTeamName("");
        await loadTeams();
      } else {
        alert(`❌ Error: ${response?.error || "Could not create team"}`);
      }
    } catch (err) {
      console.error("createTeam error:", err);
      alert("❌ Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  // Delete flow
  const openDeleteModal = (e: React.MouseEvent, team: Team) => {
    e.preventDefault();
    e.stopPropagation();
    setTeamToDelete(team);
    setDeleteConfirmText("");
    setShowDeleteModal(true);
  };

  const deleteTeam = async () => {
    if (!teamToDelete || deleteConfirmText.toLowerCase() !== "delete my team") {
      alert("Type 'delete my team' exactly to confirm.");
      return;
    }
    setDeleting(true);
    try {
      const response = await apiFetch<{ success?: boolean; error?: string }>(`/api/teams/${teamToDelete.id}`, {
        method: 'DELETE',
      });

      if (response?.success && !response.error) {
        setShowDeleteModal(false);
        setDeleteConfirmText("");
        setTeamToDelete(null);
        await loadTeams();
      } else {
        alert("Error: " + (response?.error || "Failed to delete team"));
      }
    } catch (err) {
      console.error("deleteTeam error:", err);
      alert("Failed to delete team");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-12 border border-indigo-200">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-100 to-transparent rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-6xl font-bold text-slate-900 mb-3 leading-tight">
                Your <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Teams</span> 🤝
              </h1>
              <p className="text-lg text-slate-700">
                Collaborate with your team using AI-powered writing tools and shared style guides
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all transform hover:scale-105 inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create New Team</span>
              </button>
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-indigo-600 hover:text-indigo-600 transition-all inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        {teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team, idx) => (
              <div
                key={team.id}
                onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                className={`bg-white rounded-2xl p-8 border border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer relative overflow-hidden group ${animateCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                style={{ transition: `all 0.4s ease-out ${idx * 100}ms` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="absolute top-4 right-4 z-10">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${team.role === "owner"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                      : "bg-slate-50 text-slate-700 border-slate-100"
                      }`}
                  >
                    {team.role === "owner" ? "👑 Owner" : `👤 ${team.role}`}
                  </span>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg text-white font-bold text-2xl">
                  {team.name.substring(0, 2).toUpperCase()}
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors">{team.name}</h3>
                <p className="text-sm text-slate-500 mb-6">
                  {team.member_count || 0} member{team.member_count !== 1 ? "s" : ""}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Tier</p>
                    <p className="text-sm font-bold text-indigo-700 capitalize">{team.subscription_tier}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Created</p>
                    <p className="text-sm font-bold text-slate-700">{new Date(team.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                  <span className="text-sm font-bold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Open Dashboard <span className="text-lg">→</span>
                  </span>

                  {team.role === "owner" && (
                    <button
                      onClick={(e) => openDeleteModal(e, team)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all z-20"
                      title="Delete Team"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-16 border-2 border-dashed border-slate-300 text-center">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm">
              🚀
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No teams yet</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Create your first team to start collaborating with others using AI-powered writing tools and shared style guides
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg transition-all"
            >
              Create Your First Team
            </button>
          </div>
        )}

        {/* Create Team Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-8 bg-gradient-to-br from-white to-slate-50">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Create Team</h2>
                      <p className="text-slate-500 text-sm mt-1">Start a new workspace for your brand.</p>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Team Name</label>
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. Marketing Squad"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none text-slate-900 text-lg placeholder:text-slate-300 transition-all bg-white"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && createTeam()}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={createTeam}
                        disabled={creating || !newTeamName.trim()}
                        className="flex-1 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                      >
                        {creating ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <span>Create Team</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && teamToDelete && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-red-100"
              >
                <div className="p-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Delete Team?</h2>
                    <p className="text-slate-500 mt-2">
                      Are you sure you want to delete <strong className="text-slate-800">{teamToDelete.name}</strong>?
                      This action <span className="text-red-600 font-bold">cannot be undone</span>.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 text-center">
                      Type <span className="text-slate-800">delete my team</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-red-500 focus:outline-none text-center font-mono text-slate-900"
                      placeholder="delete my team"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeleteConfirmText("");
                        setTeamToDelete(null);
                      }}
                      disabled={deleting}
                      className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={deleteTeam}
                      disabled={deleting || deleteConfirmText.toLowerCase() !== "delete my team"}
                      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 hover:shadow-lg hover:shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                    >
                      {deleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Delete Team</span>
                      )}
                    </button>
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