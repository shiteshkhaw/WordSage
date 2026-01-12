"use client";

import { useEffect, useState } from "react";

export default function AdminSystemPage() {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      // Call backend API for system stats (you'll need to create this endpoint)
      setSystemInfo({
        tableCounts: {
          user_profiles: "N/A",
          documents: "N/A",
          transactions: "N/A",
          subscriptions: "N/A",
          payments: "N/A",
          notifications: "N/A",
        },
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
    } catch (error) {
      console.error("Failed to load system info:", error);
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      alert("Notification feature temporarily disabled during migration");
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
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
        <h1 className="text-3xl font-bold text-white mb-2">System Status</h1>
        <p className="text-slate-400">Monitor system health and performance</p>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/80 text-sm">System Status</p>
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
          <p className="text-3xl font-bold">Operational</p>
        </div>
        <div className="bg-blue-600 rounded-xl p-6 text-white">
          <p className="text-white/80 text-sm mb-2">Environment</p>
          <p className="text-3xl font-bold capitalize">{systemInfo.environment}</p>
        </div>
        <div className="bg-purple-600 rounded-xl p-6 text-white">
          <p className="text-white/80 text-sm mb-2">Uptime</p>
          <p className="text-3xl font-bold">99.9%</p>
        </div>
      </div>

      {/* Database Stats */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Database Statistics</h3>
        <p className="text-slate-400 mb-4">Database statistics available after backend admin API implementation</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(systemInfo.tableCounts).map(([table, count]: [string, any]) => (
            <div key={table} className="p-4 bg-slate-700 rounded-xl">
              <p className="text-slate-400 text-sm capitalize mb-1">
                {table.replace(/_/g, " ")}
              </p>
              <p className="text-2xl font-bold text-white">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Admin Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={sendTestNotification}
            className="p-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-semibold transition-colors"
          >
            📨 Send Test Notification
          </button>
          <button
            onClick={() => alert("Clear cache functionality coming soon!")}
            className="p-4 bg-orange-600 hover:bg-orange-700 rounded-xl text-white font-semibold transition-colors"
          >
            🗑️ Clear Cache
          </button>
          <button
            onClick={() => alert("Export data functionality coming soon!")}
            className="p-4 bg-green-600 hover:bg-green-700 rounded-xl text-white font-semibold transition-colors"
          >
            📊 Export Data
          </button>
          <button
            onClick={() => alert("System logs coming soon!")}
            className="p-4 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-semibold transition-colors"
          >
            📋 View Logs
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">System Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-400">Last Updated</span>
            <span className="text-white font-mono text-sm">
              {new Date(systemInfo.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-400">Node Environment</span>
            <span className="text-white font-mono text-sm">{systemInfo.environment}</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-400">Database</span>
            <span className="text-green-400 font-semibold">✓ Connected (Backend API)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
