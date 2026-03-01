"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import MobileBottomNav from "@/components/MobileBottomNav";

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
  const { data: session, status } = useSession();
  const user = session?.user;
  const loading = status === "loading";

  const [profile, setProfile] = useState<any>(null);
  // Start closed; mount effect will open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCoinHistory, setShowCoinHistory] = useState(false);
  const [showDailyCoinPopup, setShowDailyCoinPopup] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  const initRanRef = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // ── Responsive sidebar default ──────────────────────────────────────────
  useEffect(() => {
    const syncSidebar = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    syncSidebar();
    window.addEventListener("resize", syncSidebar);
    return () => window.removeEventListener("resize", syncSidebar);
  }, []);

  // ── Body scroll lock when mobile drawer is open ─────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < 1024;
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // ── Escape key closes sidebar on mobile ────────────────────────────────
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  // ── Auth + init data ─────────────────────────────────────────────────────
  useEffect(() => {
    const checkUser = async () => {
      if (status === "loading") return;
      if (!user) {
        router.push("/login");
        return;
      }
      if (initRanRef.current) return;
      initRanRef.current = true;

      try {
        const profileRes = await apiFetch<{ data?: any }>("/api/profile");
        if (profileRes?.data) {
          setProfile(profileRes.data);
          await loadNotifications(user.id, profileRes.data);
          await checkDailyCoins(user.id, profileRes.data);
        }
      } catch (error) {
        console.error("Load profile error:", error);
      }
    };
    checkUser();
  }, [status, user?.id]);

  const loadNotifications = async (userId: string, profile: any) => {
    const notifs: Notification[] = [];
    const welcomeShown = localStorage.getItem(`wordsage_welcome_shown_${userId}`);
    const accountAge =
      new Date().getTime() - new Date(profile?.created_at || new Date()).getTime();
    const isNewUser = accountAge < 24 * 60 * 60 * 1000;

    if (isNewUser && profile?.coins_balance >= 100 && !welcomeShown) {
      notifs.push({
        id: "welcome",
        title: "🎉 Welcome Bonus!",
        message: "100 SkillsCoins credited to your account as a welcome gift!",
        type: "welcome",
        created_at: profile.created_at,
        read: false,
      });
      setShowWelcomePopup(true);
      setTimeout(() => setShowWelcomePopup(false), 5000);
      localStorage.setItem(`wordsage_welcome_shown_${userId}`, "true");
    }
    setNotifications(notifs);
  };

  const checkDailyCoins = async (userId: string, currentProfile: any) => {
    const today = new Date().toISOString().split("T")[0];
    const lastLogin = currentProfile?.last_daily_coin_date;
    const dailyShownToday = localStorage.getItem(
      `wordsage_daily_shown_${userId}_${today}`
    );

    if (lastLogin !== today && !dailyShownToday) {
      try {
        const res = await apiFetch<{
          granted?: boolean;
          coins?: number;
          newBalance?: number;
          streak?: number;
        }>("/api/bonuses/daily", { method: "POST" });

        if (res?.granted) {
          const { coins, newBalance, streak } = res;
          setProfile((prev: any) => ({
            ...prev,
            coins_balance: newBalance,
            login_streak: streak,
            last_daily_coin_date: today,
          }));
          const streakMessage =
            streak && streak > 1 ? `${streak}-day streak 🔥` : "";
          const message = streakMessage
            ? `${coins || 10} SkillsCoins credited for logging in today! • ${streakMessage}`
            : `${coins || 10} SkillsCoins credited for logging in today!`;

          setNotifications((prev) => [
            {
              id: `daily-${today}`,
              title: "✨ Daily Login Bonus",
              message,
              type: "daily_bonus",
              created_at: new Date().toISOString(),
              read: false,
            },
            ...prev,
          ]);
          setShowDailyCoinPopup(true);
          setTimeout(() => setShowDailyCoinPopup(false), 5000);
        }
      } catch (error) {
        console.error("Daily bonus error:", error);
      }
      localStorage.setItem(`wordsage_daily_shown_${userId}_${today}`, "true");
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => setNotifications([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  // Close sidebar on mobile when navigating
  const closeMobileSidebar = useCallback(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, []);

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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      edit: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      chart: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      settings: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    };
    return icons[iconName];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-indigo-600 mx-auto" />
          <p className="text-slate-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // ── Flag: is the sidebar truly a mobile drawer right now? ────────────────
  // We approximate this server-safe via CSS; logic-wise we rely on window.innerWidth
  // only after mount (see resize listener above).

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">

      {/* ── Welcome Bonus Popup ─────────────────────────────────────────── */}
      {showWelcomePopup && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl p-5 shadow-2xl border-4 border-green-300 relative">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shrink-0">
                <span className="text-3xl">🎉</span>
              </div>
              <div>
                <h3 className="font-bold text-lg sm:text-xl mb-1">Welcome Bonus!</h3>
                <p className="text-green-100 text-sm">100 SkillsCoins credited as a welcome gift!</p>
              </div>
            </div>
            <button
              onClick={() => setShowWelcomePopup(false)}
              className="absolute top-2 right-2 text-white hover:text-green-200 p-1"
              aria-label="Close welcome popup"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Daily Coin Popup ────────────────────────────────────────────── */}
      {showDailyCoinPopup && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-5 shadow-2xl border-4 border-orange-300 relative">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shrink-0">
                <span className="text-3xl">✨</span>
              </div>
              <div>
                <h3 className="font-bold text-lg sm:text-xl mb-1">Daily Login Bonus!</h3>
                <p className="text-orange-100 text-sm">
                  10 SkillsCoins credited • {(profile?.login_streak || 1)}-day streak 🔥
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDailyCoinPopup(false)}
              className="absolute top-2 right-2 text-white hover:text-orange-200 p-1"
              aria-label="Close bonus popup"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Coin History Modal ──────────────────────────────────────────── */}
      {showCoinHistory && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCoinHistory(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Coin Transaction History</h2>
              <button
                onClick={() => setShowCoinHistory(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close coin history"
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
                      <p className="font-semibold text-slate-900 text-sm">{txn.action.replace(/_/g, " ").toUpperCase()}</p>
                      <p className="text-xs text-slate-500">{new Date(txn.created_at).toLocaleString()}</p>
                    </div>
                    <div className={`text-lg font-bold ${txn.coins_used > 0 ? "text-red-600" : "text-green-600"}`}>
                      {txn.coins_used > 0 ? "-" : "+"}{Math.abs(txn.coins_used)} coins
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Backdrop ─────────────────────────────────────────────── */}
      {/* Visible only on <lg when sidebar is open */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      {/*
        Desktop: fixed, always visible, width toggles between w-72 / w-24
        Mobile:  fixed drawer, slides in/out via translate-x
      */}
      <aside
        ref={sidebarRef}
        role="navigation"
        aria-label="Sidebar navigation"
        className={`
          fixed h-screen left-0 top-0 z-50 flex flex-col shadow-lg
          bg-white border-r border-slate-200
          transition-all duration-300 ease-in-out
          w-72
          ${sidebarOpen ? "translate-x-0" : "max-lg:-translate-x-full"}
          /* Desktop: always visible, width depends on sidebarOpen */
          lg:translate-x-0
          ${sidebarOpen ? "lg:w-72" : "lg:w-24"}
        `}
      >
        {/* Logo */}
        <div className="h-16 sm:h-20 border-b border-slate-200 flex items-center px-4 sm:px-6 bg-white hover:bg-slate-50 transition-colors shrink-0">
          <Link href="/dashboard" className="flex items-center space-x-3 w-full group" onClick={closeMobileSidebar}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  onClick={closeMobileSidebar}
                  aria-label={item.name}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                    : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  {isActive && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-r-full" />
                  )}
                  {renderIcon(item.icon)}
                  {sidebarOpen && <span className="font-medium text-sm">{item.name}</span>}
                </Link>
                {/* Collapsed tooltip (desktop only) */}
                {!sidebarOpen && (
                  <div className="hidden lg:block absolute left-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-opacity pointer-events-none z-50">
                    {item.name} <span className="text-slate-400">({item.shortcut})</span>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 space-y-3 shrink-0">
          {sidebarOpen && (
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Logged in as</p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user?.email?.split("@")[0]}
              </p>
            </div>
          )}
          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex w-full items-center justify-center px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
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

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      {/*
        Mobile: no left margin (sidebar is an overlay)
        Desktop: ml-72 (expanded) or ml-24 (collapsed)
      */}
      <main
        className={`
          flex-1 flex flex-col min-h-screen
          ml-0
          transition-all duration-300
          max-lg:ml-0
          ${sidebarOpen ? "lg:ml-72" : "lg:ml-24"}
        `}
      >

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="h-full px-3 sm:px-6 flex items-center gap-2 sm:gap-4">

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Open sidebar navigation"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Search bar — md and above only */}
            <div className="hidden md:flex items-center flex-1 max-w-md">
              <div className="relative w-full">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search documents, actions..."
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">⌘K</span>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">

              {/* Coins badge */}
              <button
                onClick={() => setShowCoinHistory(true)}
                className="flex items-center gap-1.5 bg-amber-50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full border border-amber-200 shadow-sm hover:shadow-md hover:scale-105 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                aria-label="View coin balance and history"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow shrink-0">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left leading-tight">
                  <p className="text-xs sm:text-sm font-bold text-slate-900">{profile?.coins_balance || 0}</p>
                  <p className="hidden sm:block text-[10px] text-slate-500 leading-none">SkillsCoins</p>
                </div>
              </button>

              {/* Buy coins — text on sm+, icon-only on xs */}
              <Link
                href="/coin-store"
                className="flex items-center gap-1 px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-xs sm:text-sm active:scale-95 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                aria-label="Buy coins"
              >
                <span className="text-base leading-none">+</span>
                <span className="hidden sm:inline">Buy Coins</span>
              </Link>

              <div className="hidden sm:block w-px h-6 bg-slate-200" />

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-1rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-[70vh] overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                      <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                      {notifications.length > 0 && (
                        <button onClick={clearAllNotifications} className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto max-h-[50vh]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🔔</span>
                          </div>
                          <p className="text-slate-500 text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markNotificationAsRead(notif.id)}
                            className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!notif.read ? "bg-indigo-50" : ""}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${notif.type === "welcome" ? "bg-green-100" :
                                notif.type === "daily_bonus" ? "bg-orange-100" : "bg-blue-100"
                                }`}>
                                <span className="text-lg">
                                  {notif.type === "welcome" ? "🎉" : notif.type === "daily_bonus" ? "✨" : "💰"}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 text-sm">{notif.title}</p>
                                <p className="text-slate-600 text-xs mt-0.5">{notif.message}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                              </div>
                              {!notif.read && <div className="w-2 h-2 bg-indigo-600 rounded-full shrink-0 mt-1" />}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar with dropdown */}
              <div className="relative group">
                <button
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden flex items-center justify-center ring-2 ring-indigo-600/20 hover:ring-indigo-600/40 transition-all focus:outline-none focus-visible:ring-indigo-500"
                  aria-label="Profile menu"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {user?.email?.[0].toUpperCase() || "U"}
                    </div>
                  )}
                </button>
                <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user?.email}</p>
                    <p className="text-xs text-slate-500">Account</p>
                  </div>
                  <Link href="/dashboard/settings" className="block px-5 py-3 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm">👤 Profile</Link>
                  <Link href="/dashboard/settings" className="block px-5 py-3 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm">⚙️ Settings</Link>
                  <div className="h-px bg-slate-200" />
                  <button onClick={handleSignOut} className="w-full text-left px-5 py-3 text-red-600 hover:bg-red-50 transition-colors font-medium text-sm">🚪 Sign Out</button>
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* ── Page content ─────────────────────────────────────────────── */}
        <div className="flex-1 p-3 sm:p-6 pb-24 lg:pb-8 overflow-y-auto">
          {children}
        </div>

        {/* ── Mobile bottom nav ─────────────────────────────────────────── */}
        <MobileBottomNav />

      </main>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
