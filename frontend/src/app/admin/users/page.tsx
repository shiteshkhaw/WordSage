"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

interface UserProfile {
  id: string;
  full_name: string | null;
  subscription_tier: string;
  coins_balance: number;
  total_ai_requests: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState("all");

  useEffect(() => {
    loadUsers();
  }, [filterTier]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTier !== "all") {
        params.append("tier", filterTier);
      }
      const data = await apiFetch<{ users: UserProfile[] }>(`/admin/users?${params.toString()}`);
      setUsers(data?.users || []);
    } catch (error) {
      console.error("Failed to load users:", error);
      setUsers([]);
    }
    setLoading(false);
  };

  const updateUserTier = async (userId: string, newTier: string) => {
    try {
      await apiFetch(`/admin/users/${userId}/tier`, {
        method: "PATCH",
        body: JSON.stringify({ tier: newTier }),
      });
      alert("User tier updated!");
      loadUsers();
    } catch (error) {
      console.error("Failed to update user tier:", error);
      alert("Failed to update user tier");
    }
  };

  const addCoins = async (userId: string, amount: number) => {
    try {
      await apiFetch(`/admin/users/${userId}/coins`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      alert(`Added ${amount} coins!`);
      loadUsers();
    } catch (error) {
      console.error("Failed to add coins:", error);
      alert("Failed to add coins");
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-slate-400">Manage all platform users</p>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Tiers</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="team">Team</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total Users</p>
          <p className="text-3xl font-bold text-white mt-2">{users.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Free Tier</p>
          <p className="text-3xl font-bold text-white mt-2">
            {users.filter(u => u.subscription_tier === "free").length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Pro Tier</p>
          <p className="text-3xl font-bold text-white mt-2">
            {users.filter(u => u.subscription_tier === "pro").length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Team Tier</p>
          <p className="text-3xl font-bold text-white mt-2">
            {users.filter(u => u.subscription_tier === "team").length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700 border-b border-slate-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Tier</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Coins</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Requests</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Joined</th>
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
                          {user.full_name?.[0] || "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{user.full_name || "Unknown"}</p>
                          <p className="text-xs text-slate-400">{user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.subscription_tier}
                        onChange={(e) => updateUserTier(user.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${user.subscription_tier === "pro"
                          ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                          : user.subscription_tier === "team"
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            : "bg-slate-600 text-slate-300 border-slate-500"
                          }`}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="team">Team</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-semibold">{user.coins_balance}</span>
                        <button
                          onClick={() => addCoins(user.id, 100)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs text-white"
                        >
                          +100
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{user.total_ai_requests || 0}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-2 hover:bg-slate-600 rounded-lg transition-colors" title="View Details">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="p-2 hover:bg-red-600/20 rounded-lg transition-colors" title="Suspend User">
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      </div>
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
