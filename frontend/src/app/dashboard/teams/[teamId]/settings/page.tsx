"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useNotify } from "@/components/notifications";

type Member = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending" | string;
  invited_at?: string;
  user_profiles?: {
    email: string;
    full_name: string;
  } | null;
};

export default function TeamSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const teamId = params.teamId as string;

  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Member[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await apiFetch(`/api/teams/${teamId}/members`) as { data?: Member[] } | null;
        if (response?.data) {
          const members = response.data;
          setTeamMembers(members.filter((m: any) => m.status === "active"));
          setPendingInvites(members.filter((m: any) => m.status === "pending"));
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
        setTeamMembers([]);
        setPendingInvites([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [teamId, session]);

  const removeMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await apiFetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
      });
      notify.success("Member removed successfully");
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (error: any) {
      notify.error("Failed to remove member: " + error.message);
    }
  };

  const changeRole = async (memberId: string, newRole: "admin" | "member") => {
    try {
      await apiFetch(`/api/teams/${teamId}/members/${memberId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      notify.success("Role updated to " + newRole);
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (error: any) {
      notify.error("Failed to update role: " + error.message);
    }
  };

  const transferOwnership = async (memberId: string) => {
    if (!confirm("Are you sure you want to transfer ownership? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/teams/${teamId}/members/${memberId}/ownership`, {
        method: 'PATCH',
      });
      notify.success("Ownership transferred successfully");
      router.refresh();
    } catch (error: any) {
      notify.error("Failed to transfer ownership: " + error.message);
    }
  };

  const deleteTeam = async () => {
    if (!confirm("Are you sure you want to delete this team? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });
      notify.success("Team deleted successfully");
      router.push("/dashboard/teams");
    } catch (error: any) {
      notify.error("Failed to delete team: " + error.message);
      setDeleting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      owner: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
      admin: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white",
      member: "bg-gradient-to-r from-slate-400 to-slate-500 text-white",
    };
    return styles[role] || styles.member;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-8 border border-indigo-200 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100 to-transparent rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">⚙️ Team Settings</h1>
            <p className="text-slate-600">Manage members, roles, and team configuration</p>
          </div>
          <Link
            href={`/dashboard/teams/${teamId}`}
            className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all inline-flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Team</span>
          </Link>
        </div>
      </div>

      {/* Active Members Section */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Active Members</h2>
              <p className="text-sm text-slate-600">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {teamMembers.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              No active members found
            </div>
          ) : (
            teamMembers.map((member) => (
              <div
                key={member.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {(member.user_profiles?.full_name || member.user_profiles?.email || "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {member.user_profiles?.full_name || member.user_profiles?.email || "Unknown User"}
                    </p>
                    <p className="text-sm text-slate-500">{member.user_profiles?.email || member.user_id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getRoleBadge(member.role)}`}>
                    {member.role}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {member.role !== "owner" && (
                    <>
                      <button
                        onClick={() => removeMember(member.id)}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                      {member.role === "member" && (
                        <button
                          onClick={() => changeRole(member.id, "admin")}
                          className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          Make Admin
                        </button>
                      )}
                      {member.role === "admin" && (
                        <button
                          onClick={() => changeRole(member.id, "member")}
                          className="px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          Remove Admin
                        </button>
                      )}
                      <button
                        onClick={() => transferOwnership(member.id)}
                        className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        Transfer Ownership
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Pending Invitations Section */}
      {pendingInvites.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Pending Invitations</h2>
                <p className="text-sm text-slate-600">{pendingInvites.length} pending invite{pendingInvites.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="px-6 py-4 flex items-center justify-between bg-amber-50/30"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {(invite.user_profiles?.full_name || invite.user_profiles?.email || "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {invite.user_profiles?.full_name || invite.user_profiles?.email || "Unknown User"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Invited {invite.invited_at ? new Date(invite.invited_at).toLocaleDateString() : "recently"}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-700">
                    Pending
                  </span>
                </div>
                <button
                  onClick={() => removeMember(invite.id)}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Cancel Invite
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Danger Zone */}
      <section className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-red-50 to-rose-50 px-6 py-4 border-b border-red-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-900">Danger Zone</h2>
              <p className="text-sm text-red-700">Irreversible actions</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Delete this team</p>
              <p className="text-sm text-slate-500">Once deleted, this team and all its data will be permanently removed.</p>
            </div>
            <button
              onClick={deleteTeam}
              disabled={deleting}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-red-200 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{deleting ? "Deleting..." : "Delete Team"}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
