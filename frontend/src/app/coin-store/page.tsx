"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  popular?: boolean;
  bonus?: number;
  savings?: string;
}

const COIN_PACKAGES: CoinPackage[] = [
  {
    id: "starter",
    name: "Starter Pack",
    coins: 100,
    price: 99,
  },
  {
    id: "basic",
    name: "Basic Pack",
    coins: 500,
    price: 449,
    bonus: 50,
    savings: "10% OFF",
  },
  {
    id: "popular",
    name: "Popular Pack",
    coins: 1000,
    price: 799,
    popular: true,
    bonus: 150,
    savings: "20% OFF",
  },
  {
    id: "premium",
    name: "Premium Pack",
    coins: 2500,
    price: 1799,
    bonus: 500,
    savings: "30% OFF",
  },
  {
    id: "ultimate",
    name: "Ultimate Pack",
    coins: 5000,
    price: 2999,
    bonus: 1500,
    savings: "40% OFF",
  },
];

export default function CoinStorePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadUserData();
  }, [session]);

  const loadUserData = async () => {
    if (status === "loading") return;
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const response = await apiFetch<{ data?: any }>('/api/profile');
      if (response?.data) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Profile load error:', error);
    }
    setLoading(false);
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handlePurchase = async (coinPackage: CoinPackage) => {
    setProcessing(true);

    try {
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
      });

      // Create order - apiFetch returns parsed JSON directly, throws on error
      const orderData = await apiFetch<{
        orderId: string;
        amount: number;
        currency: string;
      }>('/api/payment/create-coin-order', {
        method: 'POST',
        body: JSON.stringify({
          packageId: coinPackage.id,
          packageName: coinPackage.name,
          coins: coinPackage.coins + (coinPackage.bonus || 0),
          amount: coinPackage.price,
        }),
      });

      // Validate response has required fields
      if (!orderData || !orderData.orderId) {
        throw new Error('Invalid order response from server');
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'WordSage',
        description: `${coinPackage.name} - ${coinPackage.coins + (coinPackage.bonus || 0)} Coins`,
        image: '/logo.png',
        prefill: {
          name: profile?.full_name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#4F46E5',
        },
        handler: async function (response: any) {
          try {
            // apiFetch returns parsed JSON directly, throws on error
            const verifyData = await apiFetch<{
              success: boolean;
              coinsAdded: number;
            }>('/api/payment/verify-coin-payment', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                packageId: coinPackage.id,
                coins: coinPackage.coins + (coinPackage.bonus || 0),
              }),
            });

            if (verifyData?.coinsAdded) {
              showMessage('success', `✅ Success! ${verifyData.coinsAdded} coins added to your account!`);
              setTimeout(() => loadUserData(), 1000);
            } else {
              throw new Error('Payment verification failed - no coins added');
            }
          } catch (verifyError: any) {
            console.error('Verification error:', verifyError);
            showMessage('error', '❌ ' + (verifyError.message || 'Payment verification failed'));
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            showMessage('error', '❌ Payment cancelled');
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Purchase error:', error);
      showMessage('error', '❌ ' + (error.message || 'Purchase failed. Please try again.'));
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              WordSage
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-3 rounded-full border border-amber-200 shadow-md">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{profile?.coins_balance || 0}</p>
                <p className="text-xs text-slate-600">SkillsCoins</p>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Coin Store
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Purchase SkillsCoins to unlock more AI-powered features and boost your productivity
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`max-w-2xl mx-auto mb-8 p-4 rounded-lg border ${message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Coin Packages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
          {COIN_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-white rounded-2xl p-6 border-2 transition-all hover:shadow-xl hover:scale-105 ${pkg.popular
                ? "border-indigo-500 shadow-lg"
                : "border-slate-200 hover:border-indigo-300"
                }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {pkg.savings && (
                <div className="absolute -top-3 -right-3">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    {pkg.savings}
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{pkg.name}</h3>
                <div className="mb-3">
                  <span className="text-4xl font-bold text-slate-900">{pkg.coins}</span>
                  <span className="text-slate-600 ml-1">coins</span>
                </div>
                {pkg.bonus && (
                  <div className="inline-block bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full text-sm font-semibold mb-2">
                    +{pkg.bonus} Bonus Coins!
                  </div>
                )}
                <div className="text-3xl font-bold text-indigo-600">
                  ₹{pkg.price}
                </div>
              </div>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={processing}
                className={`w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${pkg.popular
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg"
                  : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                  }`}
              >
                {processing ? "Processing..." : "Buy Now"}
              </button>
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            What Can You Do With SkillsCoins?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Fix Grammar</h3>
              <p className="text-sm text-slate-600">5 coins per use</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Improve Writing</h3>
              <p className="text-sm text-slate-600">10 coins per use</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔄</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Rewrite Content</h3>
              <p className="text-sm text-slate-600">15 coins per use</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Custom Prompts</h3>
              <p className="text-sm text-slate-600">20 coins per use</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">Do coins expire?</h3>
              <p className="text-slate-600">No, your SkillsCoins never expire. Use them whenever you need!</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">Can I get a refund?</h3>
              <p className="text-slate-600">Coins are non-refundable once purchased, but you can use them anytime.</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">Is payment secure?</h3>
              <p className="text-slate-600">Yes! All payments are processed securely through Razorpay with industry-standard encryption.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
