"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import useSWR from "swr";

interface DailyStats {
  day: string;
  requests: number;
  words: number;
  date: string;
}

interface FeatureUsage {
  name: string;
  usage: number;
  count: number;
}

interface Insight {
  title: string;
  value: string;
  insight: string;
  icon: string;
}

interface AnalyticsData {
  summary: {
    totalRequests: number;
    wordsProcessed: number;
    dailyStreak: number;
    coinsBalance: number;
  };
  weeklyData: DailyStats[];
  featureUsage: FeatureUsage[];
  insights: Insight[];
  weeklyGrowth: number;
  peakDay: string | null;
  mostUsedFeature: string;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const loading = status === "loading";

  const { data: profileRes } = useSWR(user ? '/api/profile' : null, (url) => apiFetch<{ data?: any }>(url));
  const { data: analyticsRes } = useSWR(user ? '/api/analytics' : null, (url) => apiFetch<{ data?: AnalyticsData }>(url), { refreshInterval: 30000 });
  const profile = profileRes?.data || null;
  const analytics = analyticsRes?.data || null;

  const [timeRange, setTimeRange] = useState("week");
  const [animateStats, setAnimateStats] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (profile && analytics) {
      setTimeout(() => setAnimateStats(true), 200);
    }
  }, [profile, analytics]);

  const AnimatedNumber = ({ value, decimals = 0 }: { value: number; decimals?: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      if (!animateStats) return;
      let current = 0;
      const increment = value / 30;
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));
        }
      }, 30);
      return () => clearInterval(interval);
    }, [animateStats, value, decimals]);

    return <>{displayValue}</>;
  };

  // Use real data from API or fallback to defaults
  const weeklyData = analytics?.weeklyData || [
    { day: "Mon", requests: 0, words: 0, date: "" },
    { day: "Tue", requests: 0, words: 0, date: "" },
    { day: "Wed", requests: 0, words: 0, date: "" },
    { day: "Thu", requests: 0, words: 0, date: "" },
    { day: "Fri", requests: 0, words: 0, date: "" },
    { day: "Sat", requests: 0, words: 0, date: "" },
    { day: "Sun", requests: 0, words: 0, date: "" },
  ];

  const featureUsage = analytics?.featureUsage || [];
  const insights = analytics?.insights || [];

  const maxRequests = Math.max(...weeklyData.map(d => d.requests), 1);

  // Export to CSV
  const exportToCSV = () => {
    setExporting(true);

    try {
      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";

      // Header
      csvContent += "WorkSage Analytics Report\n";
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `User: ${user?.email}\n\n`;

      // Summary Stats
      csvContent += "Summary Statistics\n";
      csvContent += "Metric,Value\n";
      csvContent += `Total AI Requests,${analytics?.summary.totalRequests || profile?.total_ai_requests || 0}\n`;
      csvContent += `Words Processed,${analytics?.summary.wordsProcessed || profile?.words_processed || 0}\n`;
      csvContent += `Daily Streak,${analytics?.summary.dailyStreak || profile?.daily_streak || 0}\n\n`;

      // Weekly Data
      csvContent += "Weekly Breakdown\n";
      csvContent += "Day,Date,Requests,Estimated Words\n";
      weeklyData.forEach(day => {
        csvContent += `${day.day},${day.date},${day.requests},${day.words}\n`;
      });

      // Features Usage
      if (featureUsage.length > 0) {
        csvContent += "\nFeatures Used\n";
        csvContent += "Feature,Usage %,Count\n";
        featureUsage.forEach(f => {
          csvContent += `${f.name},${f.usage},${f.count}\n`;
        });
      }

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `worksage-analytics-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert("✅ Analytics exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      alert("❌ Failed to export analytics");
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF (using browser print)
  const exportToPDF = () => {
    setExporting(true);

    try {
      // Create a printable version
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("Please allow popups to export PDF");
        setExporting(false);
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>WorkSage Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #4F46E5; }
            .header { text-align: center; margin-bottom: 40px; }
            .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0; }
            .stat-card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            .stat-value { font-size: 32px; font-weight: bold; color: #4F46E5; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #4F46E5; color: white; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 WorkSage Analytics Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>User: ${user?.email}</p>
          </div>
          
          <h2>Summary Statistics</h2>
          <div class="stats">
            <div class="stat-card">
              <p>Total AI Requests</p>
              <div class="stat-value">${profile?.total_ai_requests || 0}</div>
            </div>
            <div class="stat-card">
              <p>Words Processed</p>
              <div class="stat-value">${profile?.words_processed || 0}</div>
            </div>
            <div class="stat-card">
              <p>Clarity Score</p>
              <div class="stat-value">78%</div>
            </div>
            <div class="stat-card">
              <p>Daily Streak</p>
              <div class="stat-value">${profile?.daily_streak || 0} days</div>
            </div>
          </div>
          
          <h2>Weekly Activity</h2>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>AI Requests</th>
                <th>Words Processed</th>
              </tr>
            </thead>
            <tbody>
              ${weeklyData.map(day => `
                <tr>
                  <td>${day.day}</td>
                  <td>${day.requests}</td>
                  <td>${day.words}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h2>Feature Usage</h2>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Usage Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${featureUsage.length > 0 ? featureUsage.map(f => `
                <tr><td>${f.name}</td><td>${f.usage}%</td></tr>
              `).join('') : '<tr><td colspan="2">No usage data yet</td></tr>'}
            </tbody>
          </table>
          
          <div class="footer">
            <p>© 2025 WorkSage - AI Writing Assistant</p>
            <p>This is an automatically generated report</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
        setExporting(false);
      }, 500);

    } catch (error) {
      console.error("PDF export error:", error);
      alert("❌ Failed to generate PDF");
      setExporting(false);
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
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-5xl font-bold text-slate-900">
          Your <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Analytics</span>
        </h1>
        <p className="text-lg text-slate-600">
          Track your writing improvements and usage patterns
        </p>
      </div>

      {/* Time Range Filter */}
      <div className="flex gap-2">
        {["week", "month", "year"].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${timeRange === range
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: "Total Requests",
            value: analytics?.summary.totalRequests || profile?.total_ai_requests || 0,
            change: analytics?.weeklyGrowth !== undefined ? `${analytics.weeklyGrowth > 0 ? '+' : ''}${analytics.weeklyGrowth}%` : "0%",
            positive: (analytics?.weeklyGrowth || 0) >= 0,
            gradient: "from-blue-500 to-indigo-600",
            icon: "M13 10V3L4 14h7v7l9-11h-7z",
          },
          {
            label: "Words Enhanced",
            value: analytics?.summary.wordsProcessed || profile?.words_processed || 0,
            change: "📝",
            positive: true,
            gradient: "from-purple-500 to-pink-600",
            icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
          },
          {
            label: "SkillsCoins",
            value: analytics?.summary.coinsBalance || profile?.coins_balance || 0,
            change: "💰",
            positive: true,
            gradient: "from-green-500 to-emerald-600",
            icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
          },
          {
            label: "Daily Streak",
            value: analytics?.summary.dailyStreak || profile?.daily_streak || 0,
            change: "🔥 Active",
            positive: true,
            gradient: "from-orange-500 to-red-600",
            icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
          },
        ].map((metric, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${metric.gradient} rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-white/10 ${animateStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            style={{
              transition: `all 0.6s ease-out ${idx * 100}ms`,
            }}
          >
            <div className="flex items-start justify-between mb-8">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md hover:bg-white/30 transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={metric.icon} />
                </svg>
              </div>
              <div className={`text-sm font-semibold ${metric.positive ? "text-green-100" : "text-red-100"}`}>
                {metric.change}
              </div>
            </div>
            <p className="text-white/80 text-sm font-medium mb-2">{metric.label}</p>
            <p className="text-5xl font-bold">
              {animateStats ? <AnimatedNumber value={metric.value} /> : metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Requests Chart */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900 mb-6">AI Requests by Day</h2>
          <div className="space-y-6">
            {weeklyData.map((day, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">{day.day}</span>
                  <span className="text-sm font-bold text-indigo-600">{day.requests} requests</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-700"
                    style={{
                      width: animateStats ? `${(day.requests / maxRequests) * 100}%` : "0%",
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Words Trend by Day */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Words Processed Trend</h2>
          <div className="space-y-6">
            {weeklyData.map((day, idx) => {
              const maxWords = Math.max(...weeklyData.map(d => d.words), 1);
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">{day.day}</span>
                    <span className="text-sm font-bold text-green-600">{day.words.toLocaleString()} words</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-700"
                      style={{
                        width: animateStats ? `${(day.words / maxWords) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Words Processed Chart */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Words Processed</h2>
        <div className="grid grid-cols-7 gap-2">
          {weeklyData.map((day, idx) => {
            const maxWords = Math.max(...weeklyData.map(d => d.words));
            const height = (day.words / maxWords) * 200;
            return (
              <div key={idx} className="flex flex-col items-center justify-end space-y-2">
                <div
                  className="w-full bg-gradient-to-t from-purple-600 to-pink-500 rounded-t-lg transition-all duration-700"
                  style={{
                    height: animateStats ? `${height}px` : "0px",
                  }}
                ></div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-900">{day.day}</p>
                  <p className="text-xs text-slate-500">{day.words}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-12 border border-indigo-200 space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl">
            💡
          </div>
          <h2 className="text-2xl font-bold text-slate-900">AI Insights & Recommendations</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.length > 0 ? insights.map((insight, idx) => (
            <div key={idx} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-slate-900">{insight.title}</h3>
                <span className="text-2xl">{insight.icon}</span>
              </div>
              <p className="text-2xl font-bold text-indigo-600 mb-3">{insight.value}</p>
              <p className="text-sm text-slate-600">{insight.insight}</p>
            </div>
          )) : (
            <div className="col-span-2 text-center py-8">
              <p className="text-slate-500">Start using AI features to see your personalized insights!</p>
            </div>
          )}
        </div>
      </div>

      {/* Usage Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Features Used */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Features Used</h2>
          <div className="space-y-4">
            {featureUsage.length > 0 ? featureUsage.map((feature, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-700">{feature.name}</span>
                  <span className="text-sm font-bold text-indigo-600">{feature.usage}% ({feature.count})</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
                    style={{ width: `${feature.usage}%` }}
                  ></div>
                </div>
              </div>
            )) : (
              <p className="text-slate-500 text-center py-4">No feature usage data yet. Start using AI features!</p>
            )}
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900 mb-6">This Month</h2>
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-1">Total Requests</p>
              <p className="text-3xl font-bold text-indigo-600">{profile?.total_ai_requests || 0}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-1">Words Processed</p>
              <p className="text-3xl font-bold text-purple-600">{analytics?.summary.wordsProcessed || profile?.words_processed || 0}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-1">SkillsCoins</p>
              <p className="text-3xl font-bold text-green-600">💰 {analytics?.summary.coinsBalance || profile?.coins_balance || 0}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-1">Daily Streak</p>
              <p className="text-3xl font-bold text-orange-600">🔥 {analytics?.summary.dailyStreak || profile?.daily_streak || 0} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-12 text-white text-center space-y-4">
        <h3 className="text-3xl font-bold">
          Export Your Analytics
        </h3>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Download detailed reports of your writing progress and AI usage
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="px-8 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-2"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-900 border-t-transparent"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>📊</span>
                <span>Export as PDF</span>
              </>
            )}
          </button>
          <button
            onClick={exportToCSV}
            disabled={exporting}
            className="px-8 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-2"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <span>📈</span>
                <span>Export as CSV</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 pt-4">
          💡 PDF opens in print dialog • CSV downloads directly
        </p>
      </div>
    </div>
  );
}
