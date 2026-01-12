"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

interface Subscription {
  id: string;
  user_id: string;
  status: string;
  plan_name: string;
  current_period_start: string;
  current_period_end: string;
  user_profiles?: {
    id: string;
    full_name: string | null;
  };
}

export default function AdminSubscriptionsPage() {
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const data = await apiFetch<{ subscriptions?: Subscription[] }>("/admin/subscriptions");
      setSubscriptions(data?.subscriptions || []);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      setSubscriptions([]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Subscriptions</h1>
        <p className="text-slate-400">Manage all active subscriptions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Active Subscriptions</p>
          <p className="text-4xl font-bold text-green-500">
            {subscriptions.filter(s => s.status === "active").length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Canceled</p>
          <p className="text-4xl font-bold text-red-500">
            {subscriptions.filter(s => s.status === "canceled").length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Total</p>
          <p className="text-4xl font-bold text-white">{subscriptions.length}</p>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700 border-b border-slate-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Plan</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Started</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Ends</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-indigo-500 mx-auto"></div>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">{sub.user_profiles?.full_name || "Unknown"}</p>
                      <p className="text-xs text-slate-400">{sub.user_profiles?.id?.slice(0, 8) || sub.user_id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                        {sub.plan_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sub.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                        }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      {new Date(sub.current_period_start).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
