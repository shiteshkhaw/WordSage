"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

interface AnalyticsStats {
  actionCounts: Record<string, number>;
  totalCoins: number;
  totalRevenue: number;
  totalTransactions: number;
  recentTransactions: Array<{
    id: string;
    action: string;
    coins_used: number;
    words_processed?: number;
    created_at: string;
  }>;
}

export default function AdminAnalyticsPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await apiFetch<AnalyticsStats>("/admin/analytics");
      setStats(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setStats({
        actionCounts: {},
        totalCoins: 0,
        totalRevenue: 0,
        totalTransactions: 0,
        recentTransactions: [],
      });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Platform Analytics</h1>
        <p className="text-slate-400">System-wide usage statistics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <p className="text-white/80 text-sm mb-2">Total Transactions</p>
          <p className="text-4xl font-bold">{stats?.totalTransactions || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white">
          <p className="text-white/80 text-sm mb-2">Coins Used</p>
          <p className="text-4xl font-bold">{stats?.totalCoins || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-6 text-white">
          <p className="text-white/80 text-sm mb-2">Total Revenue</p>
          <p className="text-4xl font-bold">₹{((stats?.totalRevenue || 0) / 100).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-6 text-white">
          <p className="text-white/80 text-sm mb-2">Avg. Coins/User</p>
          <p className="text-4xl font-bold">{Math.round((stats?.totalCoins || 0) / Math.max(stats?.totalTransactions || 1, 1))}</p>
        </div>
      </div>

      {/* AI Actions Distribution */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">AI Actions Distribution</h3>
        <div className="space-y-4">
          {stats?.actionCounts && Object.entries(stats.actionCounts).map(([action, count]) => (
            <div key={action} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium capitalize">{action.replace(/_/g, " ")}</span>
                <span className="text-white font-bold">{count}</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
                  style={{ width: `${(count / (stats?.totalTransactions || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Recent AI Transactions</h3>
        <div className="space-y-3">
          {stats?.recentTransactions?.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-xl">
              <div>
                <p className="text-white font-medium capitalize">{tx.action.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">{tx.coins_used} coins</p>
                <p className="text-xs text-slate-400">{tx.words_processed || 0} words</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
