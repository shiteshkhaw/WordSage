"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalRequests: number;
  recentUsers: Array<{
    id: string;
    full_name: string | null;
    subscription_tier: string;
    coins_balance: number;
    created_at: string;
  }>;
}

export default function AdminOverview() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await apiFetch<AdminStats>("/admin/stats");
        setStats(data);
      } catch (error) {
        console.error("Failed to load admin stats:", error);
        // Set default empty stats on error
        setStats({
          totalUsers: 0,
          proUsers: 0,
          activeSubscriptions: 0,
          totalRevenue: 0,
          totalRequests: 0,
          recentUsers: [],
        });
      }
      setLoading(false);
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: "Total Users",
            value: stats?.totalUsers || 0,
            change: "+12%",
            icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
            color: "from-blue-600 to-indigo-600",
          },
          {
            label: "Pro Users",
            value: stats?.proUsers || 0,
            change: "+8%",
            icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
            color: "from-purple-600 to-pink-600",
          },
          {
            label: "Active Subs",
            value: stats?.activeSubscriptions || 0,
            change: "+5%",
            icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
            color: "from-green-600 to-emerald-600",
          },
          {
            label: "Total Revenue",
            value: `₹${((stats?.totalRevenue || 0) / 100).toLocaleString()}`,
            change: "+18%",
            icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            color: "from-orange-600 to-red-600",
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <span className="text-sm font-semibold bg-white/20 px-2 py-1 rounded">{stat.change}</span>
            </div>
            <p className="text-white/80 text-sm mb-1">{stat.label}</p>
            <p className="text-4xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Requests Chart */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">AI Requests</h3>
          <div className="text-center py-12">
            <p className="text-3xl font-bold text-indigo-500">{stats?.totalRequests || 0}</p>
            <p className="text-slate-400 text-sm mt-2">Total requests processed</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">Revenue Growth</h3>
          <div className="text-center py-12">
            <p className="text-3xl font-bold text-green-500">₹{((stats?.totalRevenue || 0) / 100).toLocaleString()}</p>
            <p className="text-slate-400 text-sm mt-2">Total revenue earned</p>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Recent Users</h3>
        <div className="space-y-3">
          {stats?.recentUsers?.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
                  {user.full_name?.[0] || "U"}
                </div>
                <div>
                  <p className="font-semibold text-white">{user.full_name || "Unknown"}</p>
                  <p className="text-sm text-slate-400">{new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.subscription_tier === 'pro'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-slate-600 text-slate-300'
                  }`}>
                  {user.subscription_tier}
                </span>
                <span className="text-sm text-slate-400">{user.coins_balance} coins</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
