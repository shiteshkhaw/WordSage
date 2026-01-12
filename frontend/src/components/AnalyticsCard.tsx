"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

interface AnalyticsData {
  totalDocuments: number;
  totalWords: number;
  totalAIRequests: number;
  coinsUsed: number;
  loginStreak: number;
  monthlyAIRequests: number;
  favoriteDocuments: number;
  averageWordCount: number;
}

export default function AnalyticsCard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AnalyticsData>({
    totalDocuments: 0,
    totalWords: 0,
    totalAIRequests: 0,
    coinsUsed: 0,
    loginStreak: 0,
    monthlyAIRequests: 0,
    favoriteDocuments: 0,
    averageWordCount: 0,
  });

  // Load initial analytics
  useEffect(() => {
    loadAnalytics();
    // Poll every 30 seconds for updates
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [session]);

  // Core analytics loader
  const loadAnalytics = async () => {
    if (!session?.user) return;

    try {
      const response = await apiFetch<{ data: AnalyticsData }>('/api/profile/analytics');
      if (response?.data) {
        setStats({
          totalDocuments: response.data.totalDocuments || 0,
          totalWords: response.data.totalWords || 0,
          totalAIRequests: response.data.totalAIRequests || 0,
          coinsUsed: response.data.coinsUsed || 0,
          loginStreak: response.data.loginStreak || 0,
          monthlyAIRequests: response.data.monthlyAIRequests || 0,
          favoriteDocuments: response.data.favoriteDocuments || 0,
          averageWordCount: response.data.averageWordCount || 0,
        });
      }
    } catch (error) {
      console.error('Load analytics error:', error);
    }
  };

  const statCards = [
    { label: "Total Documents", value: stats.totalDocuments, icon: "📄", color: "blue" },
    { label: "Total Words Written", value: stats.totalWords.toLocaleString(), icon: "✍️", color: "green" },
    { label: "AI Requests (All Time)", value: stats.totalAIRequests, icon: "🤖", color: "purple" },
    { label: "AI Requests (This Month)", value: stats.monthlyAIRequests, icon: "📊", color: "indigo" },
    { label: "Coins Used", value: stats.coinsUsed, icon: "🪙", color: "yellow" },
    { label: "Login Streak", value: `${stats.loginStreak} days`, icon: "🔥", color: "orange" },
    { label: "Favorite Docs", value: stats.favoriteDocuments, icon: "⭐", color: "pink" },
    { label: "Avg Words/Doc", value: stats.averageWordCount, icon: "📈", color: "cyan" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    green: "bg-green-50 border-green-200 text-green-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
    orange: "bg-orange-50 border-orange-200 text-orange-900",
    pink: "bg-pink-50 border-pink-200 text-pink-900",
    cyan: "bg-cyan-50 border-cyan-200 text-cyan-900",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className={`${colorMap[stat.color]} border-2 rounded-xl p-6 transition-all hover:shadow-lg`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">{stat.icon}</span>
            <span className="text-xs font-semibold opacity-60 uppercase">{stat.label}</span>
          </div>
          <p className="text-3xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
