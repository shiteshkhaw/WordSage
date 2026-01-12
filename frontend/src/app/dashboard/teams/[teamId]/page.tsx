"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

interface Team {
  id: string;
  name: string;
  owner_id: string;
  subscription_tier: string;
  max_members: number;
  created_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  profile?: {
    email: string;
    total_ai_requests: number;
    words_processed: number;
  };
}

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
  creator_email?: string;
}

export default function TeamDashboard() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [contentLibrary, setContentLibrary] = useState<ContentLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [animateStats, setAnimateStats] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimateStats(true), 100);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (user) {
      loadTeamData();
    } else {
      router.push("/login");
    }
  }, [session, status, teamId]);

  const loadTeamData = async () => {
    try {
      const response = await apiFetch<{ data: { team: Team; userRole: string; members: TeamMember[]; contentLibrary: ContentLibraryItem[] } }>(`/api/teams/${teamId}`);
      if (!response?.data) {
        router.push("/dashboard/teams");
        return;
      }

      setTeam(response.data.team);
      setUserRole(response.data.userRole);
      setMembers(response.data.members || []);
      setContentLibrary(response.data.contentLibrary || []);

    } catch (error: any) {
      console.error("Load team error:", error);
      // Redirect to teams list if team not found or access denied
      router.push("/dashboard/teams");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    const response = await apiFetch<{ data: { members: TeamMember[] } }>(`/api/teams/${teamId}`);
    if (response?.data?.members) {
      setMembers(response.data.members);
    }
  };

  const loadContentLibrary = async () => {
    const response = await apiFetch<{ data: ContentLibraryItem[] }>(`/api/teams/${teamId}/content?limit=10`);
    if (response?.data) {
      setContentLibrary(response.data);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);

    try {
      await apiFetch(`/api/teams/${teamId}/invite`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail }),
      });

      alert("✅ Invitation sent successfully!");
      setShowInviteModal(false);
      setInviteEmail("");
      await loadMembers();
    } catch (error: any) {
      alert(`❌ Error: ${error.message || "Failed to send invitation"}`);
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-12 border border-indigo-200 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-100 to-transparent rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-4">
            <div>
              <h1 className="text-6xl font-bold text-slate-900 mb-3 leading-tight tracking-tight">
                {team?.name} <span className="text-4xl inline-block animate-bounce-slow">👥</span>
              </h1>
              <p className="text-lg text-slate-700 font-medium">
                {members.length} member{members.length !== 1 ? "s" : ""} • {userRole === "owner" ? "You own this team" : `You're a ${userRole}`}
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap gap-3">
              {/* PRIMARY ACTION: Write Content */}
              <Link
                href={`/dashboard/teams/${teamId}/editor`}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Write Content</span>
              </Link>

              {/* SECONDARY ACTION: Invite */}
              {(userRole === "owner" || userRole === "admin") && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 hover:-translate-y-0.5 transition-all duration-300 inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Invite</span>
                </button>
              )}

              {/* SECONDARY ACTION: Style Guide */}
              <Link
                href={`/dashboard/teams/${teamId}/style-guide`}
                className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 hover:-translate-y-0.5 transition-all duration-300 inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343" />
                </svg>
                <span>Style Guide</span>
              </Link>

              {/* Team Settings (Owner/Admin only) */}
              {(userRole === "owner" || userRole === "admin") && (
                <Link
                  href={`/dashboard/teams/${teamId}/settings`}
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-red-500 hover:text-red-600 hover:bg-red-50 hover:-translate-y-0.5 transition-all duration-300 inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </Link>
              )}

              {/* TERTIARY ACTION: Back */}
              <Link
                href="/dashboard/teams"
                className="px-4 py-3 border border-transparent text-slate-500 rounded-xl font-semibold hover:text-slate-800 hover:bg-slate-100 transition-all duration-300 inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: "Total AI Requests",
            value: members.reduce((sum, m) => sum + (m.profile?.total_ai_requests || 0), 0),
            gradient: "from-blue-500 to-indigo-600",
            icon: "M13 10V3L4 14h7v7l9-11h-7z",
          },
          {
            label: "Words Processed",
            value: members.reduce((sum, m) => sum + (m.profile?.words_processed || 0), 0),
            gradient: "from-purple-500 to-pink-600",
            icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
          },
          {
            label: "Shared Content",
            value: contentLibrary.length,
            gradient: "from-green-500 to-emerald-600",
            icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-8 text-white shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-500 transform ${animateStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            style={{ transitionDelay: `${idx * 150}ms` }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                </svg>
              </div>
            </div>
            <p className="text-white/80 text-sm font-medium mb-2 tracking-wide uppercase">{stat.label}</p>
            <p className="text-5xl font-bold tracking-tight">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Team Members Section */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg shadow-slate-200/50">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          Team Members
          <span className="text-sm font-normal text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {members.length}
          </span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-white group-hover:ring-indigo-100 transition-all">
                  {member.profile?.email?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                    {member.profile?.email || "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider bg-slate-50 inline-block px-2 py-0.5 rounded mt-1">
                    {member.role}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div className="mb-1">
                  <span className="font-bold text-slate-700 text-sm">
                    {member.profile?.total_ai_requests || 0}
                  </span>
                  <span className="ml-1">reqs</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 text-sm">
                    {member.profile?.words_processed || 0}
                  </span>
                  <span className="ml-1">words</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Library Section */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg shadow-slate-200/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Shared Content Library</h2>
          <Link
            href={`/dashboard/teams/${teamId}/content`}
            className="group px-4 py-2 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold transition-all duration-300 text-sm flex items-center gap-1"
          >
            View All
            <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
          </Link>
        </div>

        {contentLibrary.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contentLibrary.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-1">{item.title}</h3>
                  {item.approved && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wide border border-green-200">
                      Approved
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">{item.content}</p>
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span className="bg-slate-100 px-2 py-1 rounded text-slate-500 capitalize">{item.category || "General"}</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    {item.usage_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-lg font-medium text-slate-900 mb-1">Library is empty</p>
            <p className="text-sm text-slate-500">Create content in the editor and save it here.</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Invite Team Member</h2>
              <p className="text-slate-600">Send an invitation to join <span className="font-semibold text-indigo-600">{team?.name}</span></p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-50 text-slate-900 transition-all placeholder:text-slate-400"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={inviteMember}
                  disabled={inviting || !inviteEmail.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-2"
                >
                  {inviting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Send Invite</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail("");
                  }}
                  disabled={inviting}
                  className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}