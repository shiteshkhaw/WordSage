"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

export default function ReferralSection() {
  const { data: session } = useSession();
  const [referralCode, setReferralCode] = useState("");
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, [session]);

  const loadReferralData = async () => {
    if (!session?.user) return;

    try {
      const response = await apiFetch<{ data: { referral_code?: string; total_referrals?: number } }>('/api/profile');
      if (response?.data) {
        setReferralCode(response.data.referral_code || '');
        setTotalReferrals(response.data.total_referrals || 0);
      }
    } catch (error) {
      console.error('Load referral error:', error);
    }
  };

  const referralUrl = `${window.location.origin}/signup?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-purple-900">🎁 Refer & Earn</h3>
        <div className="text-right">
          <p className="text-sm text-purple-600">Your Referrals</p>
          <p className="text-2xl font-bold text-purple-900">{totalReferrals}</p>
        </div>
      </div>

      <p className="text-purple-700 mb-4">
        Invite friends and earn <span className="font-bold">50 coins</span> for each signup! They get <span className="font-bold">25 coins</span> too! 🎉
      </p>

      <div className="bg-white rounded-lg p-4 mb-4">
        <label className="text-sm font-semibold text-purple-900 mb-2 block">
          Your Referral Code
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={referralCode}
            readOnly
            className="flex-1 px-4 py-2 border-2 border-purple-200 rounded-lg bg-purple-50 text-purple-900 font-mono font-bold text-lg"
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4">
        <label className="text-sm font-semibold text-purple-900 mb-2 block">
          Share Your Link
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={referralUrl}
            readOnly
            className="flex-1 px-4 py-2 border-2 border-purple-200 rounded-lg bg-purple-50 text-purple-700 text-sm truncate"
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors whitespace-nowrap"
          >
            Copy Link
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          📧 Email
        </button>
        <button className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
          💬 WhatsApp
        </button>
        <button className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors">
          🔗 More
        </button>
      </div>
    </div>
  );
}
