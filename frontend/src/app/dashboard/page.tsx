"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

// Types
interface UserProfile {
  id: string;
  coins_balance: number;
  total_ai_requests: number;
  words_processed: number;
  login_streak: number;
  subscription_tier: string;
  referral_code: string;
  total_referrals: number;
  [key: string]: any;
}

interface Document {
  id: string;
  title: string;
  updated_at: string;
  word_count: number;
}

interface CoinTransaction {
  id: string;
  action: string;
  coins_used: number;
  created_at: string;
  details?: any;
}

interface TeamInvitation {
  id: string;
  team_id: string;
  status: string;
  invited_at: string;
  teams: {
    name?: string | null;
  } | null;
}

export default function DashboardHome() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<CoinTransaction[]>([]);
  const [pendingInvites, setPendingInvites] = useState<TeamInvitation[]>([]);

  const [animateStats, setAnimateStats] = useState(false);
  const [dateTime, setDateTime] = useState("");
  const [loading, setLoading] = useState(true);

  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    // Auth Check
    if (status === "loading") return;
    if (!user) {
      router.push("/login");
      return;
    }

    // Initial Load
    loadData();
    updateDateTime();
    setTimeout(() => setAnimateStats(true), 200);

    const dateInterval = setInterval(updateDateTime, 60000);
    const pollInterval = setInterval(loadData, 10000); // Poll every 10s

    return () => {
      clearInterval(dateInterval);
      clearInterval(pollInterval);
    };
  }, [user, status]);

  const loadData = async () => {
    try {
      // 1. Profile & Stats
      const profileRes = await apiFetch<{ data: UserProfile }>('/api/profile');
      if (profileRes?.data) setProfile(profileRes.data);

      // 2. Recent Documents
      const docsRes = await apiFetch<{ documents: Document[] }>('/api/documents');
      if (docsRes?.documents) setDocuments(docsRes.documents.slice(0, 5));

      // 3. Transactions
      const transRes = await apiFetch<{ transactions: CoinTransaction[] }>('/api/transactions');
      if (transRes?.transactions) setRecentTransactions(transRes.transactions.slice(0, 10));

      // 4. Pending Invites
      const invitesRes = await apiFetch<{ data: TeamInvitation[] }>('/api/teams/invites');
      if (invitesRes?.data) setPendingInvites(invitesRes.data);

      setLoading(false);
    } catch (error) {
      console.error("Dashboard load error:", error);
      setLoading(false);
    }
  };

  const acceptInvitation = async (teamId: string, inviteId: string) => {
    try {
      const response = await apiFetch<{ success: boolean; error?: string }>(`/api/teams/${teamId}/accept`, {
        method: 'POST'
      });
      if (response?.success) {
        alert('✅ Successfully joined the team!');
        loadData(); // Refresh all
      } else {
        alert(`❌ Error: ${response?.error || 'Failed to join'}`);
      }
    } catch (error) {
      console.error('Accept error:', error);
      alert('❌ Failed to accept invitation');
    }
  };

  const rejectInvitation = async (teamId: string, inviteId: string) => {
    try {
      const response = await apiFetch<{ success: boolean; error?: string }>(`/api/teams/${teamId}/reject`, {
        method: 'POST'
      });
      if (response?.success) {
        alert('✅ Invitation declined');
        loadData();
      } else {
        alert(`❌ Error: ${response?.error || 'Failed'}`);
      }
    } catch (error) {
      console.error('Reject error:', error);
      alert('❌ Failed to reject invitation');
    }
  };

  const updateDateTime = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setDateTime(formatter.format(now));
  };

  // Helpers
  const copyReferralLink = () => {
    const code = profile?.referral_code || "";
    const referralUrl = `${window.location.origin}/signup?ref=${code}`;
    navigator.clipboard.writeText(referralUrl);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const shareViaEmail = () => {
    const code = profile?.referral_code || "";
    const referralUrl = `${window.location.origin}/signup?ref=${code}`;
    const subject = "Join WordSage - Get 25 Bonus Coins!";
    const body = `Hey! I'm using WordSage for AI-powered writing and it's amazing. Join using my referral link and get 25 bonus coins:\n\n${referralUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareViaWhatsApp = () => {
    const code = profile?.referral_code || "";
    const referralUrl = `${window.location.origin}/signup?ref=${code}`;
    const message = `Hey! I'm using WordSage for AI-powered writing. Join using my referral code ${code} and get 25 bonus coins! ${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getTransactionIcon = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('bonus') || a.includes('referral')) return '🎁';
    if (a.includes('purchase')) return '💳';
    if (a.includes('grammar')) return '✅';
    if (a.includes('improve')) return '📝';
    if (a.includes('rewrite')) return '🔄';
    if (a.includes('summarize')) return '📊';
    return '🪙';
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getDocumentIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('email')) return "✉️";
    if (t.includes('blog')) return "📝";
    if (t.includes('report')) return "📊";
    return "📄";
  };

  const AnimatedNumber = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
      if (!animateStats) return;
      let current = 0;
      const increment = Math.max(1, value / 30);
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, 30);
      return () => clearInterval(interval);
    }, [animateStats, value]);
    return <>{displayValue}</>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto relative p-6">

      {/* 1. Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-8 border-2 border-indigo-200 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-indigo-900 mb-2">📬 Team Invitations</h2>
              <p className="text-indigo-700">You have {pendingInvites.length} pending team invitation{pendingInvites.length > 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="space-y-4">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-white rounded-2xl p-6 border-2 border-indigo-200 shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                      <span className="text-3xl">👥</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-slate-900">
                        {invite?.teams?.name || "Unknown Team"}
                      </h3>
                      <p className="text-sm text-slate-600">
                        Invited {invite?.invited_at ? new Date(invite.invited_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => acceptInvitation(invite.team_id, invite.id)}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all inline-flex items-center space-x-2"
                    >
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => rejectInvitation(invite.team_id, invite.id)}
                      className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-all"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Welcome Header */}
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-12 border border-indigo-200">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-100 to-transparent rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-3 leading-tight">
              {greeting()}, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{user?.email?.split("@")[0]}</span> 👋
            </h1>
            <div className="flex items-center space-x-4 mb-6">
              <p className="text-lg text-slate-700 font-light">
                Continue refining your craft with AI-powered insights
              </p>
              {profile?.login_streak && profile.login_streak > 0 && (
                <div className="inline-flex items-center space-x-2 bg-orange-100 px-4 py-2 rounded-full border border-orange-200">
                  <span className="text-2xl animate-pulse">🔥</span>
                  <span className="text-sm font-bold text-orange-700">{profile.login_streak} day streak!</span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-600">
              🕘 {dateTime} • <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse">🟢 Auto-refresh</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/editor"
            className="flex-1 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all transform hover:scale-105 text-center inline-flex items-center justify-center space-x-2 group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Start Writing</span>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex-1 px-8 py-4 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-center inline-flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Analytics</span>
          </Link>
        </div>
      </div>

      {/* 3. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: "AI Requests Made",
            value: profile?.total_ai_requests || 0,
            delta: "Total Lifetime",
            gradient: "from-blue-500 to-indigo-600",
            icon: "M13 10V3L4 14h7v7l9-11h-7z",
          },
          {
            label: "Words Enhanced",
            value: profile?.words_processed || 0,
            delta: "Total Processed",
            gradient: "from-purple-500 to-pink-600",
            icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
          },
          {
            label: "SkillsCoins Balance",
            value: profile?.coins_balance || 0,
            delta: "+10 daily login bonus",
            gradient: "from-orange-500 to-red-600",
            icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-8 text-white shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-white/10 ${animateStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            style={{
              transition: `all 0.6s ease-out ${idx * 100}ms`,
            }}
          >
            <div className="flex items-start justify-between mb-8">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md hover:bg-white/30 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                </svg>
              </div>
              <div className="text-3xl opacity-20">→</div>
            </div>
            <p className="text-white/80 text-sm font-medium mb-2">
              {stat.label}
            </p>
            <p className="text-5xl font-bold mb-2">
              {animateStats ? <AnimatedNumber value={stat.value} /> : stat.value}
            </p>
            <p className="text-xs text-white/70">{stat.delta}</p>
          </div>
        ))}
      </div>

      {/* 4. Referral Section */}
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-3xl p-8 border-2 border-purple-200 shadow-lg">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-purple-900 mb-2">🎁 Refer & Earn Coins</h2>
            <p className="text-purple-700">Invite friends and both of you get bonus coins!</p>
          </div>
          <div className="text-center bg-white rounded-2xl p-6 shadow-md min-w-[150px]">
            <p className="text-sm text-purple-600 font-semibold mb-1">Your Referrals</p>
            <p className="text-5xl font-bold text-purple-900">{profile?.total_referrals || 0}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <label className="text-sm font-bold text-purple-900 mb-3 block flex items-center">
              <span className="text-2xl mr-2">🎟️</span>
              Your Referral Code
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={profile?.referral_code || "Loading..."}
                readOnly
                className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-lg bg-purple-50 text-purple-900 font-mono font-bold text-2xl text-center"
              />
              <button
                onClick={copyReferralLink}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                {copiedReferral ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md">
            <label className="text-sm font-bold text-purple-900 mb-3 block flex items-center">
              <span className="text-2xl mr-2">🔗</span>
              Share Your Referral Link
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${profile?.referral_code || ''}`}
                readOnly
                className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-lg bg-purple-50 text-purple-700 text-sm truncate"
              />
              <button
                onClick={copyReferralLink}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-md"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={shareViaEmail}
            className="flex-1 min-w-[200px] px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center justify-center space-x-2"
          >
            <span>📧 Share via Email</span>
          </button>
          <button
            onClick={shareViaWhatsApp}
            className="flex-1 min-w-[200px] px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center justify-center space-x-2"
          >
            <span>💬 Share via WhatsApp</span>
          </button>
        </div>
      </div>

      {/* 5. Recent Activity */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-slate-900">💰 Recent Coin Activity</h2>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Activity</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Date</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-700">Coins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((trans) => (
                    <tr key={trans.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getTransactionIcon(trans.action)}</span>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {trans.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </p>
                            {trans.details && (
                              <p className="text-xs text-slate-500">
                                {trans.details.bonus_type || trans.details.mode || ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(trans.created_at).toLocaleDateString()} {new Date(trans.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-bold text-lg ${trans.coins_used < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trans.coins_used < 0 ? '+' : '-'}{Math.abs(trans.coins_used)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                      No transactions yet. Start using AI features to see your activity here!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Quick Actions */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: "M12 4v16m8-8H4", title: "New Document", href: "/editor", desc: "Start fresh" },
            { icon: "M9 12l2 2 4-4", title: "Improve Writing", href: "/editor", desc: "Enhance clarity" },
            { icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", title: "Summarize", href: "/editor", desc: "Make concise" },
            { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", title: "AI Assistant", href: "/editor", desc: "Get help instantly" },
          ].map((action, idx) => (
            <Link
              key={idx}
              href={action.href}
              className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all space-y-4 group cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {action.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {action.desc}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 7. Teams CTA */}
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-3xl p-12 border-2 border-purple-200 shadow-lg">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-6">
          <div>
            <h2 className="text-3xl font-bold text-purple-900 mb-2">👥 Team Collaboration</h2>
            <p className="text-purple-700">Work with your team using shared style guides</p>
          </div>
          <Link
            href="/dashboard/teams"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all transform hover:scale-105 inline-flex items-center space-x-2"
          >
            <span>Go to Teams</span>
          </Link>
        </div>
      </div>

      {/* 8. Recent Documents */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-slate-900">Recent Work</h2>
        </div>

        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc, idx) => (
              <Link
                key={doc.id}
                href={`/editor?doc=${doc.id}`}
                className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all flex justify-between items-center group cursor-pointer"
                style={{
                  animation: `slideIn 0.5s ease-out ${idx * 100}ms both`,
                }}
              >
                <div className="flex-1 flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <span className="text-2xl">{getDocumentIcon(doc.title)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {new Date(doc.updated_at).toLocaleDateString()} • {doc.word_count || 0} words
                    </p>
                  </div>
                </div>
                <div className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm opacity-0 group-hover:opacity-100">
                  Open
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-16 border-2 border-dashed border-indigo-300 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto">
              <span className="text-3xl">📝</span>
            </div>
            <div>
              <p className="text-lg text-slate-700 font-semibold">No documents yet</p>
              <p className="text-slate-600 mb-6">
                Create your first document to start your writing journey
              </p>
            </div>
            <Link
              href="/editor"
              className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Create Your First Document
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}