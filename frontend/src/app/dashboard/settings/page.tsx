"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

const AVATAR_OPTIONS = [
  { id: "avatar1", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" },
  { id: "avatar2", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" },
  { id: "avatar3", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bailey" },
  { id: "avatar4", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" },
  { id: "avatar5", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max" },
  { id: "avatar6", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna" },
  { id: "avatar7", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Felix" },
  { id: "avatar8", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Aneka" },
  { id: "avatar9", url: "https://api.dicebear.com/7.x/personas/svg?seed=Felix" },
  { id: "avatar10", url: "https://api.dicebear.com/7.x/personas/svg?seed=Aneka" },
  { id: "avatar11", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Felix" },
  { id: "avatar12", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile states
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preferences states
  const [preferredTone, setPreferredTone] = useState("neutral");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);

  // Security states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    loadUserData();

    // Check URL hash for tab
    const hash = window.location.hash.replace('#', '');
    if (hash && ['profile', 'preferences', 'security', 'billing'].includes(hash)) {
      setActiveTab(hash);
    }
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
        const prof = response.data;
        setProfile(prof);
        setFullName(prof.full_name || "");
        setBio(prof.bio || "");
        setAvatarUrl(prof.avatar_url || AVATAR_OPTIONS[0].url);
        setPreferredTone(prof.preferred_tone || "neutral");
        setEmailNotifications(prof.email_notifications ?? true);
        setAiSuggestions(prof.ai_suggestions ?? true);
        setTwoFactorEnabled(prof.two_factor_enabled ?? false);
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

  // Upload custom photo
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      showMessage("error", "❌ Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "❌ Image size must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      // Upload avatar via backend API
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await apiFetch<{ data?: { avatar_url?: string } }>('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (res?.data?.avatar_url) {
        setProfile({ ...profile, avatar_url: res.data.avatar_url });
        showMessage("success", "✅ Profile picture updated successfully!");
        setAvatarUrl(res.data.avatar_url); // Update local state for immediate display
      } else {
        throw new Error('Failed to upload avatar');
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      showMessage("error", "❌ Failed to upload profile picture: " + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save profile
  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          bio: bio,
          avatar_url: avatarUrl,
        }),
      });

      showMessage("success", "✅ Profile updated successfully!");
      loadUserData();
    } catch (error: any) {
      showMessage("error", "❌ Failed to update profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Save preferences
  const savePreferences = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          preferred_tone: preferredTone,
          email_notifications: emailNotifications,
          ai_suggestions: aiSuggestions,
        }),
      });

      showMessage("success", "✅ Preferences saved successfully!");
      loadUserData();
    } catch (error: any) {
      showMessage("error", "❌ Failed to save preferences: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Update password
  const updatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showMessage("error", "❌ Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("error", "❌ Passwords don't match");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch<{ error?: string }>('/api/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      if (res?.error) throw new Error(res.error);

      showMessage("success", "✅ Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showMessage("error", "❌ Failed to update password: " + error.message);
    } finally {
      setSaving(false);
    }
  };


  // Toggle 2FA
  const toggle2FA = async () => {
    setSaving(true);
    try {
      const newValue = !twoFactorEnabled;

      await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          two_factor_enabled: newValue,
        }),
      });

      setTwoFactorEnabled(newValue);

      if (newValue) {
        showMessage("success", "✅ Two-factor authentication enabled! You'll need to verify on next login.");
      } else {
        showMessage("success", "✅ Two-factor authentication disabled.");
      }
    } catch (error: any) {
      showMessage("error", "❌ Failed to update 2FA: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete account
  const deleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      showMessage("error", "❌ Please type DELETE to confirm");
      return;
    }

    setSaving(true);
    try {
      // Delete user data
      await apiFetch('/api/documents', { method: 'DELETE' });//.delete().eq("user_id", user.id);
      await apiFetch('/api/transactions', { method: 'DELETE' });//.delete().eq("user_id", user.id);
      await apiFetch('/api/user_profiles', { method: 'DELETE' });//.delete().eq("id", user.id);

      showMessage("success", "✅ Account deletion requested. You'll be logged out.");

      setTimeout(async () => {
        await fetch('/api/auth/signout', { method: 'POST' });
        router.push("/");
      }, 2000);
    } catch (error: any) {
      showMessage("error", "❌ Failed to delete account: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle subscription upgrade
  // Handle subscription upgrade
  const handleSubscriptionUpgrade = async (planName: string, planId: string, amount: number) => {
    setSaving(true);

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
      // Create order
      const orderData = await apiFetch<{ subscriptionId?: string; error?: string }>('/api/payment/create-subscription-order', {
        method: 'POST',
        body: JSON.stringify({
          planId,
          planName,
          amount,
        }),
      });

      if (!orderData?.subscriptionId) {
        throw new Error(orderData?.error || 'Failed to create order');
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: orderData.subscriptionId,
        name: 'WordSage',
        description: `${planName} Subscription`,
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
            // Verify payment
            const verifyData = await apiFetch<{ error?: string }>('/api/payment/verify-subscription', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                planName,
              }),
            });

            if (verifyData?.error) {
              throw new Error(verifyData.error);
            }

            showMessage('success', '✅ Subscription activated successfully!');
            setTimeout(() => loadUserData(), 1000);
          } catch (verifyError: any) {
            console.error('Verification error:', verifyError);
            showMessage('error', '❌ ' + verifyError.message);
          }
        },
        modal: {
          ondismiss: function () {
            setSaving(false);
            showMessage('error', '❌ Payment cancelled');
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Subscription error:', error);
      showMessage('error', '❌ ' + error.message);
      setSaving(false);
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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your account settings and preferences</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-lg border ${message.type === "success"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
            }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {[
            { id: "profile", label: "Profile", icon: "👤" },
            { id: "preferences", label: "Preferences", icon: "⚙️" },
            { id: "security", label: "Security", icon: "🔒" },
            { id: "billing", label: "Billing", icon: "💳" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                window.location.hash = tab.id;
              }}
              className={`pb-4 px-2 font-semibold transition-colors relative ${activeTab === tab.id
                ? "text-indigo-600"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Profile Information</h2>

            <div className="space-y-6">
              {/* Avatar Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Profile Avatar
                </label>
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-200 shadow-lg">
                    {uploadingPhoto ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                      </div>
                    ) : (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="block px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                    </button>
                    <button
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-200 transition-colors"
                    >
                      {showAvatarPicker ? "Hide Avatars" : "Choose Avatar"}
                    </button>
                  </div>
                </div>

                {showAvatarPicker && (
                  <div className="mt-6 grid grid-cols-6 gap-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => {
                          setAvatarUrl(avatar.url);
                          setShowAvatarPicker(false);
                        }}
                        className={`w-16 h-16 rounded-full overflow-hidden border-4 transition-all hover:scale-110 ${avatarUrl === avatar.url
                          ? "border-indigo-600 ring-4 ring-indigo-200"
                          : "border-slate-200 hover:border-indigo-300"
                          }`}
                      >
                        <img src={avatar.url} alt={avatar.id} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 bg-white placeholder:text-slate-400"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-slate-900 bg-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-500 mt-1">{bio.length}/500 characters</p>
              </div>

              {/* Save Button */}
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Preferences</h2>

            <div className="space-y-6">
              {/* Preferred Tone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Default Writing Tone
                </label>
                <select
                  value={preferredTone}
                  onChange={(e) => setPreferredTone(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 bg-white"
                >
                  <option value="neutral">Neutral</option>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                </select>
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <h3 className="font-semibold text-slate-900">Email Notifications</h3>
                  <p className="text-sm text-slate-600">Receive updates and tips via email</p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${emailNotifications ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${emailNotifications ? "translate-x-7" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              {/* AI Suggestions */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <h3 className="font-semibold text-slate-900">AI Suggestions</h3>
                  <p className="text-sm text-slate-600">Show AI-powered writing suggestions</p>
                </div>
                <button
                  onClick={() => setAiSuggestions(!aiSuggestions)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${aiSuggestions ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${aiSuggestions ? "translate-x-7" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              {/* Save Button */}
              <button
                onClick={savePreferences}
                disabled={saving}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change Password */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Change Password</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white placeholder:text-slate-400"
                />
              </div>

              <button
                onClick={updatePassword}
                disabled={saving || !newPassword || !confirmPassword}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Two-Factor Authentication</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <h3 className="font-semibold text-slate-900">Enable 2FA</h3>
                  <p className="text-sm text-slate-600">Add an extra layer of security to your account</p>
                </div>
                <button
                  onClick={toggle2FA}
                  disabled={saving}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50 ${twoFactorEnabled ? "bg-green-600" : "bg-slate-300"
                    }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${twoFactorEnabled ? "translate-x-7" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              {twoFactorEnabled ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-green-800">Two-factor authentication is enabled</p>
                      <p className="text-xs text-green-700 mt-1">
                        Your account is protected with an additional security layer. You'll be asked to verify your identity when signing in from a new device.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Two-factor authentication is disabled</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Enable 2FA to add an extra layer of security to your account. We recommend using an authenticator app like Google Authenticator or Authy.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delete Account */}
          <div className="bg-red-50 rounded-2xl p-8 border-2 border-red-200 shadow-sm">
            <h2 className="text-2xl font-bold text-red-900 mb-2">Delete Account</h2>
            <p className="text-red-700 mb-6">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Delete My Account
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-red-700 font-semibold">
                  Type "DELETE" to confirm account deletion:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 text-slate-900 bg-white placeholder:text-red-400"
                />
                <div className="flex space-x-4">
                  <button
                    onClick={deleteAccount}
                    disabled={saving || deleteConfirmText !== "DELETE"}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Billing & Subscription</h2>

            {/* Current Plan */}
            <div className="mb-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Current Plan</h3>
                  <p className="text-3xl font-bold text-indigo-600 mt-2">
                    {profile?.subscription_tier?.toUpperCase() || "FREE"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Coins Balance</p>
                  <p className="text-3xl font-bold text-orange-600">{profile?.coins_balance || 0}</p>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-semibold">AI Requests</p>
                <p className="text-2xl font-bold text-blue-900">{profile?.total_ai_requests || 0}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 font-semibold">Words Processed</p>
                <p className="text-2xl font-bold text-purple-900">{profile?.words_processed || 0}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-semibold">Daily Streak</p>
                <p className="text-2xl font-bold text-green-900">{profile?.daily_streak || 0} days</p>
              </div>
            </div>

            {/* Coin Store Link */}
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Need More Coins?</h3>
                  <p className="text-slate-600">Purchase additional SkillsCoins to continue using AI features</p>
                </div>
                <Link
                  href="/coin-store"
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Visit Coin Store
                </Link>
              </div>
            </div>

            {/* Upgrade Plans */}
            <div id="plans" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "Free",
                  price: "₹0",
                  period: "forever",
                  features: ["5 AI requests/day", "100 SkillsCoins", "Basic features"],
                  current: profile?.subscription_tier === "free" || !profile?.subscription_tier,
                },
                {
                  name: "Pro",
                  price: "₹999",
                  period: "per month",
                  features: ["Unlimited AI requests", "1000 SkillsCoins/month", "Priority support"],
                  current: profile?.subscription_tier === "pro",
                  razorpayPlanId: process.env.NEXT_PUBLIC_RAZORPAY_PRO_PLAN_ID || "plan_RcMLLxIKTLWQSP",
                },
                {
                  name: "Team",
                  price: "₹2,999",
                  period: "per month",
                  features: ["Everything in Pro", "5000 SkillsCoins/month", "Team collaboration"],
                  current: profile?.subscription_tier === "team",
                  razorpayPlanId: process.env.NEXT_PUBLIC_RAZORPAY_TEAM_PLAN_ID || "plan_RcMMrvRVqUerfl",
                },
              ].map((plan, idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-xl border-2 transition-all ${plan.current
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-300"
                    }`}
                >
                  {plan.current && (
                    <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full mb-4">
                      CURRENT PLAN
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600">/{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, fidx) => (
                      <li key={fidx} className="flex items-center text-sm text-slate-700">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {!plan.current && plan.razorpayPlanId && (
                    <button
                      onClick={() => handleSubscriptionUpgrade(plan.name, plan.razorpayPlanId!, parseInt(plan.price.replace(/[^0-9]/g, '')))}
                      disabled={saving}
                      className="block w-full text-center px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {saving ? "Processing..." : `Upgrade to ${plan.name}`}
                    </button>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}


