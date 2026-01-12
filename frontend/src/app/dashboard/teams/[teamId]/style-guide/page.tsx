"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

interface StyleGuide {
  id: string;
  team_id: string;
  brand_voice: string;
  tone: string;
  approved_terms: string[];
  forbidden_terms: string[];
  custom_rules: {
    writing_style?: string;
    sentence_length?: string;
    paragraph_structure?: string;
    formatting_preferences?: string;
    industry_jargon?: string[];
    target_audience?: string;
  };
  updated_by: string;
  updated_at: string;
  updater_email?: string;
}

interface User {
  id: string;
  email?: string;
}

interface ApiError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

const BRAND_VOICE_PRESETS = [
  { value: "professional", label: "Professional", emoji: "💼", description: "Formal, authoritative, corporate-friendly" },
  { value: "casual", label: "Casual", emoji: "😊", description: "Friendly, conversational, approachable" },
  { value: "technical", label: "Technical", emoji: "🔧", description: "Precise, detailed, industry-specific" },
  { value: "creative", label: "Creative", emoji: "🎨", description: "Expressive, imaginative, storytelling" },
  { value: "persuasive", label: "Persuasive", emoji: "🎯", description: "Compelling, action-oriented, sales-focused" },
  { value: "educational", label: "Educational", emoji: "📚", description: "Informative, clear, instructional" },
];

const TONE_PRESETS = [
  { value: "formal", label: "Formal", emoji: "🎩", description: "Respectful, proper, business-like" },
  { value: "friendly", label: "Friendly", emoji: "🤝", description: "Warm, welcoming, personable" },
  { value: "confident", label: "Confident", emoji: "💪", description: "Assertive, strong, decisive" },
  { value: "empathetic", label: "Empathetic", emoji: "❤️", description: "Understanding, caring, supportive" },
  { value: "enthusiastic", label: "Enthusiastic", emoji: "🚀", description: "Energetic, excited, passionate" },
  { value: "neutral", label: "Neutral", emoji: "⚖️", description: "Balanced, objective, impartial" },
];

export default function StyleGuidePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const teamId = params.teamId as string;

  const [userRole, setUserRole] = useState<string>("");
  const [styleGuide, setStyleGuide] = useState<StyleGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [approvedTermInput, setApprovedTermInput] = useState("");
  const [forbiddenTermInput, setForbiddenTermInput] = useState("");
  const [industryJargonInput, setIndustryJargonInput] = useState("");

  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const canEdit = userRole === "owner" || userRole === "admin";

  useEffect(() => {
    if (status === "loading") return;
    if (user) {
      loadStyleGuide();
    } else {
      router.push("/login");
    }
  }, [session, status, teamId]);

  const loadStyleGuide = async () => {
    setLoading(true);
    setSaveError(null);

    try {
      const response = await apiFetch<{ data: { styleGuide: StyleGuide; userRole: string } }>(`/api/teams/${teamId}/style-guide`);
      if (response?.data) {
        setStyleGuide(response.data.styleGuide);
        setUserRole(response.data.userRole);
        setLastSaved(new Date(response.data.styleGuide.updated_at));
      }
    } catch (error) {
      console.error("Error loading style guide:", error);
      handleError(error, "Failed to load style guide");
    } finally {
      setLoading(false);
    }
  };

  const createDefaultStyleGuide = async () => {
    // Default creation handled by backend
    await loadStyleGuide();
  };

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      if (hasUnsavedChanges && canEdit && styleGuide) {
        saveStyleGuide();
      }
    }, 2000);

    setAutoSaveTimer(timer);
  }, [hasUnsavedChanges, canEdit, styleGuide]);

  const saveStyleGuide = async () => {
    if (!styleGuide || !canEdit || !user) {
      setSaveError("Only admins and owners can edit the style guide");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await apiFetch(`/api/teams/${teamId}/style-guide`, {
        method: 'PUT',
        body: JSON.stringify(styleGuide),
      });

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      showNotification("Style guide saved and synced to all team members!");
    } catch (error) {
      console.error("Save error:", error);
      handleError(error, "Failed to save style guide");
    } finally {
      setSaving(false);
    }
  };

  const handleError = (error: unknown, defaultMessage: string) => {
    if (typeof error === 'object' && error !== null) {
      const apiError = error as ApiError;
      if (apiError.message) {
        setSaveError(apiError.message);
      } else if (apiError.details) {
        setSaveError(apiError.details);
      } else {
        setSaveError(defaultMessage);
      }
    } else if (typeof error === 'string') {
      setSaveError(error);
    } else {
      setSaveError(defaultMessage);
    }
  };

  const updateField = (field: keyof StyleGuide, value: any) => {
    if (!styleGuide || !canEdit) return;

    setStyleGuide({
      ...styleGuide,
      [field]: value,
    });
    setHasUnsavedChanges(true);
    scheduleAutoSave();
  };

  const updateCustomRule = (key: string, value: any) => {
    if (!styleGuide || !canEdit) return;

    setStyleGuide({
      ...styleGuide,
      custom_rules: {
        ...styleGuide.custom_rules,
        [key]: value,
      },
    });
    setHasUnsavedChanges(true);
    scheduleAutoSave();
  };

  const addApprovedTerm = () => {
    if (!approvedTermInput.trim() || !styleGuide || !canEdit) return;

    const term = approvedTermInput.trim();
    if (!styleGuide.approved_terms.includes(term)) {
      updateField("approved_terms", [...styleGuide.approved_terms, term]);
      setApprovedTermInput("");
    }
  };

  const removeApprovedTerm = (term: string) => {
    if (!styleGuide || !canEdit) return;
    updateField("approved_terms", styleGuide.approved_terms.filter(t => t !== term));
  };

  const addForbiddenTerm = () => {
    if (!forbiddenTermInput.trim() || !styleGuide || !canEdit) return;

    const term = forbiddenTermInput.trim();
    if (!styleGuide.forbidden_terms.includes(term)) {
      updateField("forbidden_terms", [...styleGuide.forbidden_terms, term]);
      setForbiddenTermInput("");
    }
  };

  const removeForbiddenTerm = (term: string) => {
    if (!styleGuide || !canEdit) return;
    updateField("forbidden_terms", styleGuide.forbidden_terms.filter(t => t !== term));
  };

  const addIndustryJargon = () => {
    if (!industryJargonInput.trim() || !styleGuide || !canEdit) return;

    const jargon = industryJargonInput.trim();
    const currentJargon = styleGuide.custom_rules.industry_jargon || [];

    if (!currentJargon.includes(jargon)) {
      updateCustomRule("industry_jargon", [...currentJargon, jargon]);
      setIndustryJargonInput("");
    }
  };

  const removeIndustryJargon = (jargon: string) => {
    if (!styleGuide || !canEdit) return;
    const currentJargon = styleGuide.custom_rules.industry_jargon || [];
    updateCustomRule("industry_jargon", currentJargon.filter(j => j !== jargon));
  };

  const showNotification = (message: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("WordSage Team Update", {
        body: message,
        icon: "/logo.png",
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("Notification:", message);
    }
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-12 border border-indigo-200">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-100 to-transparent rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-6xl font-bold text-slate-900 mb-3 leading-tight">
                Team <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Style Guide</span> 📝
              </h1>
              <p className="text-lg text-slate-700 mb-2">
                Define your brand voice and writing standards for the entire team
              </p>
              {lastSaved && (
                <p className="text-sm text-slate-600">
                  Last saved {lastSaved.toLocaleTimeString()} by {styleGuide?.updater_email || 'you'}
                </p>
              )}
              {saveError && (
                <p className="text-sm text-red-600 font-semibold mt-2">
                  ⚠️ {saveError}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {canEdit && (
                <button
                  onClick={saveStyleGuide}
                  disabled={saving || !hasUnsavedChanges}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all inline-flex items-center space-x-2 ${hasUnsavedChanges
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{hasUnsavedChanges ? "Save & Sync to Team" : "No Changes"}</span>
                    </>
                  )}
                </button>
              )}
              <Link
                href={`/dashboard/teams/${teamId}`}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Team</span>
              </Link>
            </div>
          </div>

          {!canEdit && (
            <div className="mt-4 px-4 py-3 bg-yellow-100 border-2 border-yellow-300 rounded-xl">
              <p className="text-sm text-yellow-800 font-semibold">
                👁️ View-only mode: Only team owners and admins can edit the style guide
              </p>
            </div>
          )}

          {hasUnsavedChanges && canEdit && (
            <div className="mt-4 px-4 py-3 bg-orange-100 border-2 border-orange-300 rounded-xl animate-pulse">
              <p className="text-sm text-orange-800 font-semibold">
                ⚠️ You have unsaved changes. Changes are auto-saved after 2 seconds of inactivity.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Brand Voice</h2>
        <p className="text-sm text-slate-600 mb-6">
          Choose the overall personality and style of your brand's communication
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BRAND_VOICE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => canEdit && updateField("brand_voice", preset.value)}
              disabled={!canEdit}
              className={`p-6 rounded-xl border-2 transition-all text-left ${styleGuide?.brand_voice === preset.value
                ? "border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg"
                : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                } ${!canEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{preset.emoji}</span>
                {styleGuide?.brand_voice === preset.value && (
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">{preset.label}</h3>
              <p className="text-sm text-slate-600">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Communication Tone</h2>
        <p className="text-sm text-slate-600 mb-6">
          Set the emotional quality and attitude of your team's writing
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TONE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => canEdit && updateField("tone", preset.value)}
              disabled={!canEdit}
              className={`p-6 rounded-xl border-2 transition-all text-left ${styleGuide?.tone === preset.value
                ? "border-purple-600 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg"
                : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
                } ${!canEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{preset.emoji}</span>
                {styleGuide?.tone === preset.value && (
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">{preset.label}</h3>
              <p className="text-sm text-slate-600">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">✅ Approved Terms</h2>
            <p className="text-sm text-slate-600">
              Words and phrases your team SHOULD use to maintain consistency
            </p>
          </div>
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold">
            {styleGuide?.approved_terms.length || 0} terms
          </span>
        </div>

        {canEdit && (
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={approvedTermInput}
              onChange={(e) => setApprovedTermInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addApprovedTerm())}
              placeholder='e.g., "AI-powered", "machine learning", "data-driven"'
              className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-green-600 focus:outline-none text-slate-900"
            />
            <button
              onClick={addApprovedTerm}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all inline-flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add</span>
            </button>
          </div>
        )}

        {styleGuide && styleGuide.approved_terms.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {styleGuide.approved_terms.map((term) => (
              <span
                key={term}
                className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold inline-flex items-center space-x-2 border-2 border-green-200"
              >
                <span>✓ {term}</span>
                {canEdit && (
                  <button
                    onClick={() => removeApprovedTerm(term)}
                    className="text-green-900 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>No approved terms yet. Add terms that your team should consistently use.</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
          <p className="text-sm text-green-800">
            <strong>💡 Pro Tip:</strong> AI will suggest these terms and flag when team members use alternatives. Example: If you add "AI-powered", the system will flag "AI-driven" and suggest using "AI-powered" instead.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">❌ Forbidden Terms</h2>
            <p className="text-sm text-slate-600">
              Words and phrases your team should AVOID for brand consistency
            </p>
          </div>
          <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-bold">
            {styleGuide?.forbidden_terms.length || 0} terms
          </span>
        </div>

        {canEdit && (
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={forbiddenTermInput}
              onChange={(e) => setForbiddenTermInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addForbiddenTerm())}
              placeholder='e.g., "utilize", "leverage", "synergy"'
              className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-red-600 focus:outline-none text-slate-900"
            />
            <button
              onClick={addForbiddenTerm}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all inline-flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add</span>
            </button>
          </div>
        )}

        {styleGuide && styleGuide.forbidden_terms.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {styleGuide.forbidden_terms.map((term) => (
              <span
                key={term}
                className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-semibold inline-flex items-center space-x-2 border-2 border-red-200"
              >
                <span>⚠️ {term}</span>
                {canEdit && (
                  <button
                    onClick={() => removeForbiddenTerm(term)}
                    className="text-red-900 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>No forbidden terms yet. Add words or phrases your team should avoid.</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-200">
          <p className="text-sm text-red-800">
            <strong>⚡ Real-Time Enforcement:</strong> AI will automatically flag these terms across all team members' documents and suggest better alternatives.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">📐 Custom Writing Rules</h2>
        <p className="text-sm text-slate-600 mb-6">
          Define specific guidelines for your team's writing style
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Writing Style</label>
            <input
              type="text"
              value={styleGuide?.custom_rules.writing_style || ""}
              onChange={(e) => updateCustomRule("writing_style", e.target.value)}
              placeholder="e.g., Clear and concise, Storytelling approach, Data-driven"
              disabled={!canEdit}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Sentence Length</label>
            <select
              value={styleGuide?.custom_rules.sentence_length || ""}
              onChange={(e) => updateCustomRule("sentence_length", e.target.value)}
              disabled={!canEdit}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">Select preference...</option>
              <option value="Short (8-12 words)">Short (8-12 words) - Punchy, direct</option>
              <option value="Medium (15-20 words)">Medium (15-20 words) - Balanced, clear</option>
              <option value="Long (25+ words)">Long (25+ words) - Detailed, comprehensive</option>
              <option value="Varied">Varied - Mix of all lengths</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Paragraph Structure</label>
            <input
              type="text"
              value={styleGuide?.custom_rules.paragraph_structure || ""}
              onChange={(e) => updateCustomRule("paragraph_structure", e.target.value)}
              placeholder="e.g., 3-5 sentences per paragraph, Single idea per paragraph"
              disabled={!canEdit}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Formatting Preferences</label>
            <textarea
              value={styleGuide?.custom_rules.formatting_preferences || ""}
              onChange={(e) => updateCustomRule("formatting_preferences", e.target.value)}
              placeholder="e.g., Active voice preferred, Oxford comma required, No exclamation marks"
              rows={3}
              disabled={!canEdit}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none text-slate-900 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Target Audience</label>
            <input
              type="text"
              value={styleGuide?.custom_rules.target_audience || ""}
              onChange={(e) => updateCustomRule("target_audience", e.target.value)}
              placeholder="e.g., C-level executives, Technical developers, General consumers"
              disabled={!canEdit}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Industry-Specific Jargon (Allowed)</label>
            <p className="text-xs text-slate-500 mb-2">
              Technical terms specific to your industry that should be used without flagging
            </p>

            {canEdit && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={industryJargonInput}
                  onChange={(e) => setIndustryJargonInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addIndustryJargon())}
                  placeholder='e.g., "API", "SaaS", "KPI", "ROI"'
                  className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none text-slate-900"
                />
                <button
                  onClick={addIndustryJargon}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all"
                >
                  Add
                </button>
              </div>
            )}

            {styleGuide && styleGuide.custom_rules.industry_jargon && styleGuide.custom_rules.industry_jargon.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {styleGuide.custom_rules.industry_jargon.map((jargon) => (
                  <span
                    key={jargon}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold inline-flex items-center space-x-2"
                  >
                    <span>{jargon}</span>
                    {canEdit && (
                      <button
                        onClick={() => removeIndustryJargon(jargon)}
                        className="text-indigo-900 hover:text-red-600"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No industry jargon defined</p>
            )}
          </div>
        </div>
      </div>

      {hasUnsavedChanges && canEdit && (
        <div className="fixed bottom-8 right-8 z-50">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl p-6 shadow-2xl animate-bounce">
            <p className="font-bold mb-2">⚠️ You have unsaved changes!</p>
            <button
              onClick={saveStyleGuide}
              disabled={saving}
              className="w-full px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all"
            >
              {saving ? "Saving..." : "Save & Sync Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}