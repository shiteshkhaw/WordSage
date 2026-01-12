"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface UpgradeButtonProps {
  planId: string;
  planName: string;
  amount: number;
  currentTier?: string;
}

export default function UpgradeButton({ planId, planName, amount, currentTier }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  const handleUpgrade = async () => {
    if (!scriptLoaded) {
      alert("Payment system is loading. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const { apiFetch } = await import("@/lib/api");

      interface SubscriptionResponse {
        error?: string;
        subscription?: { id: string };
      }

      const response = await apiFetch<SubscriptionResponse>("/api/razorpay/create-subscription", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });

      if (!response || response.error) {
        throw new Error(response?.error || "Failed to initiate payment");
      }

      if (!response.subscription?.id) {
        throw new Error("Invalid response from server");
      }

      // Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: response.subscription.id,
        name: "WorkSage",
        description: `${planName} Plan - Unlimited AI Writing`,
        image: "/logo.png",
        handler: async function (response: any) {
          // Payment successful
          window.location.href = "/dashboard?payment=success&plan=" + planName;
        },
        prefill: {
          email: "",
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
          confirm_close: true,
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', function (response: any) {
        alert(`Payment failed: ${response.error.description}\n\nPlease try again or contact support.`);
        setLoading(false);
      });

      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      alert(`Error: ${error.message}\n\nPlease try again or contact support.`);
      setLoading(false);
    }
  };

  if (currentTier === planName.toLowerCase()) {
    return (
      <button
        disabled
        className="w-full px-6 py-3 bg-slate-300 text-slate-600 rounded-xl font-semibold cursor-not-allowed"
      >
        ✓ Current Plan
      </button>
    );
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading || !scriptLoaded}
      className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </span>
      ) : !scriptLoaded ? (
        "Loading..."
      ) : (
        `Upgrade to ${planName} - ₹${(amount / 100).toLocaleString()}/mo`
      )}
    </button>
  );
}
