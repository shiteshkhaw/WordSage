"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { apiFetch } from "@/lib/api";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "coin_credit" | "daily_bonus" | "welcome" | "info";
  created_at: string;
  read: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // CRITICAL FIX: useSession without options to prevent infinite polling
  // NextAuth v5 doesn't poll by default, the issue was elsewhere
  const { data: session, status } = useSession();
  const user = session?.user;
  const loading = status === "loading";

  const [profile, setProfile] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showCoinHistory, setShowCoinHistory] = useState(false);
  const [showDailyCoinPopup, setShowDailyCoinPopup] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Track if initialization has run
  const initRanRef = useRef(false);

  useEffect(() => {
    const checkUser = async () => {
      // If still loading, wait
      if (status === "loading") return;

      // If not authenticated, redirect to login
      if (!user) {
        router.push("/login");
        return;
      }

      // Only run once per mount
      if (initRanRef.current) return;
      initRanRef.current = true;

      // Load user profile from backend
      try {
        const profileRes = await apiFetch<{ data?: any }>('/api/profile');
        if (profileRes?.data) {
          setProfile(profileRes.data);

          // Load existing notifications (once)
          await loadNotifications(user.id, profileRes.data);

          // Check & grant daily bonus (once)
          await checkDailyCoins(user.id, profileRes.data);
        }
      } catch (error) {
        console.error('Load profile error:', error);
      }
    };

    checkUser();

    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [status, user?.id]); // Only depend on status and user.id, not full user object


  const loadNotifications = async (userId: string, profile: any) => {
    const notifs: Notification[] = [];

    // Check if welcome popup was already shown (stored in localStorage)
    const welcomeShown = localStorage.getItem(`wordsage_welcome_shown_${userId}`);

    // Welcome bonus for new users - only show once ever
    const accountAge = new Date().getTime() - new Date(profile?.created_at || new Date()).getTime();
    const isNewUser = accountAge < 24 * 60 * 60 * 1000;

    if (isNewUser && profile?.coins_balance >= 100 && !welcomeShown) {
      notifs.push({
        id: 'welcome',
        title: '🎉 Welcome Bonus!',
        message: '100 SkillsCoins credited to your account as a welcome gift!',
        type: 'welcome',
        created_at: profile.created_at,
        read: false,
      });
      setShowWelcomePopup(true);
      setTimeout(() => setShowWelcomePopup(false), 5000);
      // Mark as shown in localStorage
      localStorage.setItem(`wordsage_welcome_shown_${userId}`, 'true');
    }

    setNotifications(notifs);
  };

  const checkDailyCoins = async (userId: string, currentProfile: any) => {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = currentProfile?.last_daily_coin_date;

    // Check if daily notification was already shown today (localStorage)
    const dailyShownToday = localStorage.getItem(`wordsage_daily_shown_${userId}_${today}`);

    if (lastLogin !== today && !dailyShownToday) {
      try {
        // Actually grant daily bonus via backend API
        const res = await apiFetch<{ granted?: boolean; coins?: number; newBalance?: number; streak?: number }>('/api/bonuses/daily', {
          method: 'POST',
        });

        // Backend returns { granted, coins, newBalance, streak } directly
        if (res?.granted) {
          const { coins, newBalance, streak } = res;

          // Update profile state with new balance
          setProfile((prev: any) => ({
            ...prev,
            coins_balance: newBalance,
            login_streak: streak,
            last_daily_coin_date: today,
          }));

          // Create notification with streak
          const streakMessage = streak && streak > 1 ? `${streak}-day streak 🔥` : "";
          const message = streakMessage
            ? `${coins || 10} SkillsCoins credited for logging in today! • ${streakMessage}`
            : `${coins || 10} SkillsCoins credited for logging in today!`;

          const newNotif: Notification = {
            id: `daily-${today}`,
            title: '✨ Daily Login Bonus',
            message,
            type: 'daily_bonus',
            created_at: new Date().toISOString(),
            read: false,
          };

          setNotifications(prev => [newNotif, ...prev]);
          setShowDailyCoinPopup(true);
          setTimeout(() => setShowDailyCoinPopup(false), 5000);
        }
      } catch (error) {
        console.error('Daily bonus error:', error);
      }

      // Mark daily notification as shown in localStorage
      localStorage.setItem(`wordsage_daily_shown_${userId}_${today}`, 'true');
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadTransactions = async () => {
    // NOTE: Transactions are now loaded via /api/transactions in dashboard page
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const navItems = [
    { name: "Home", icon: "home", href: "/dashboard", shortcut: "H" },
    { name: "Editor", icon: "edit", href: "/editor", shortcut: "E" },
    { name: "Analytics", icon: "chart", href: "/dashboard/analytics", shortcut: "A" },
    { name: "Settings", icon: "settings", href: "/dashboard/settings", shortcut: "S" },
  ];

  const renderIcon = (iconName: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      home: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 13l4-8m4-5l2-3m-2 3l1.414 1.414a2 2 0 010 2.828l-.828.828" />
        </svg>
      ),
      edit: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      chart: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      settings: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    };
    return icons[iconName];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-indigo-600 mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Welcome Bonus Popup */}
      {showWelcomePopup && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl p-6 shadow-2xl border-4 border-green-300 max-w-sm">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <span className="text-4xl">🎉</span>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1">Welcome Bonus!</h3>
                <p className="text-green-100">100 SkillsCoins credited as a welcome gift!</p>
              </div>
            </div>
            <button
              onClick={() => setShowWelcomePopup(false)}
              className="absolute top-2 right-2 text-white hover:text-green-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Daily Coin Popup with Streak */}
      {showDailyCoinPopup && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-6 shadow-2xl border-4 border-orange-300 max-w-sm">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <span className="text-4xl">✨</span>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1">Daily Login Bonus!</h3>
                <p className="text-orange-100">
                  10 SkillsCoins credited • {(profile?.login_streak || 1)}-day streak 🔥
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDailyCoinPopup(false)}
              className="absolute top-2 right-2 text-white hover:text-orange-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Coin History Modal */}
      {showCoinHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCoinHistory(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Coin Transaction History</h2>
              <button
                onClick={() => setShowCoinHistory(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No transactions yet</p>
              ) : (
                transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-semibold text-slate-900">{txn.action.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-xs text-slate-500">{new Date(txn.created_at).toLocaleString()}</p>
                    </div>
                    <div className={`text-lg font-bold ${txn.coins_used > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {txn.coins_used > 0 ? '-' : '+'}{Math.abs(txn.coins_used)} coins
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-72" : "w-24"
          } bg-white border-r border-slate-200 transition-all duration-300 fixed h-screen left-0 top-0 z-40 flex flex-col shadow-lg`}
      >
        <div className="h-20 border-b border-slate-200 flex items-center px-6 bg-white hover:bg-slate-50 transition-colors">
          <Link href="/dashboard" className="flex items-center space-x-3 w-full group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                  WordSage
                </h1>
                <p className="text-xs text-slate-500">AI Writing</p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <div key={item.href} className="group">
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 relative ${isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                    : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  {isActive && (
                    <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-r-full"></div>
                  )}
                  {renderIcon(item.icon)}
                  {sidebarOpen && <span className="font-medium text-sm">{item.name}</span>}
                </Link>
                {!sidebarOpen && (
                  <div className="absolute left-20 opacity-0 group-hover:opacity-100 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-opacity pointer-events-none z-50">
                    {item.name} <span className="text-slate-400">({item.shortcut})</span>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Logged in as</p>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {user?.email?.split("@")[0]}
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all font-medium text-sm"
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </aside>

      <main className={`${sidebarOpen ? "ml-72" : "ml-24"} flex-1 transition-all duration-300 flex flex-col`}>
        <header className="h-20 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-full px-8 flex justify-between items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full group">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search documents, actions..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  onFocus={() => setSearchOpen(true)}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-400">⌘K</span>
              </div>
            </div>

            <div className="flex items-center space-x-6 ml-auto">
              <div className="relative group">
                <button
                  onClick={() => {
                    loadTransactions();
                    setShowCoinHistory(true);
                  }}
                  className="flex items-center space-x-3 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-3 rounded-full border border-amber-200 shadow-md hover:shadow-lg hover:scale-105 transition-all"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md group-hover:rotate-12 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {profile?.coins_balance || 0}
                    </p>
                    <p className="text-xs text-slate-600">SkillsCoins</p>
                  </div>
                </button>
              </div>

              <Link
                href="/coin-store"
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm"
              >
                + Buy Coins
              </Link>

              <div className="w-px h-8 bg-slate-200"></div>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                >
                  <svg className="w-6 h-6 text-slate-600 group-hover:text-slate-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-[500px] overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                      <h3 className="font-bold text-slate-900">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="overflow-y-auto max-h-[400px]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🔔</span>
                          </div>
                          <p className="text-slate-500 text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markNotificationAsRead(notif.id)}
                            className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.read ? 'bg-indigo-50' : ''
                              }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === 'welcome' ? 'bg-green-100' :
                                notif.type === 'daily_bonus' ? 'bg-orange-100' :
                                  'bg-blue-100'
                                }`}>
                                <span className="text-xl">
                                  {notif.type === 'welcome' ? '🎉' :
                                    notif.type === 'daily_bonus' ? '✨' :
                                      '💰'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 text-sm">{notif.title}</p>
                                <p className="text-slate-600 text-sm mt-1">{notif.message}</p>
                                <p className="text-xs text-slate-400 mt-2">
                                  {new Date(notif.created_at).toLocaleString()}
                                </p>
                              </div>
                              {!notif.read && (
                                <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative group">
                <button className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center ring-2 ring-indigo-600/20 group-hover:ring-indigo-600/40 transition-all">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
                      {user?.email?.[0].toUpperCase() || "U"}
                    </div>
                  )}
                </button>
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
                    <p className="text-xs text-slate-500">Account</p>
                  </div>
                  <Link href="/dashboard/settings" className="block px-6 py-3 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm">
                    👤 Profile
                  </Link>
                  <Link href="/dashboard/settings" className="block px-6 py-3 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm">
                    ⚙️ Settings
                  </Link>
                  <div className="h-px bg-slate-200"></div>
                  <button onClick={handleSignOut} className="w-full text-left px-6 py-3 text-red-600 hover:bg-red-50 transition-colors font-medium text-sm">
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
