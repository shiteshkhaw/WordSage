"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import ModeSelector from "./components/ModeSelector";
import TemplateLibrary from "./components/TemplateLibrary";
import Accordion from "./components/Accordion";
import FloatingSuggestions from "./components/FloatingSuggestion";
import FloatingToolbar from "./components/FloatingToolbar";
import AdvancedPanel from "./components/AdvancedPanel";

interface DocumentType {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  char_count: number;
  is_favorite: boolean;
  folder: string;
  mode?: string;
}

interface Suggestion {
  id: number;
  action: string;
  original: string;
  suggestion: string;
  accepted: boolean;
  timestamp: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  mode: string;
  icon: string;
  description: string;
  structure: {
    sections: string[];
  };
}

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
}

export default function EditorPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const loading = status === "loading";

  const [profile, setProfile] = useState<any>(null);
  const [currentDoc, setCurrentDoc] = useState<DocumentType | null>(null);
  const [title, setTitle] = useState("Untitled Document");
  const [content, setContent] = useState("");
  const [savedStatus, setSavedStatus] = useState<"saved" | "saving" | "error">("saved");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [selectedTone, setSelectedTone] = useState("neutral");
  const [selectedMode, setSelectedMode] = useState("general");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [coinsUsed, setCoinsUsed] = useState(0);
  const [recentDocs, setRecentDocs] = useState<DocumentType[]>([]);
  const [showDocList, setShowDocList] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [styleGuide, setStyleGuide] = useState<StyleGuide | null>(null);
  const [forbiddenWordsFound, setForbiddenWordsFound] = useState<string[]>([]);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      if (!user) {
        router.push("/login");
        return;
      }

      // Load profile from backend API
      try {
        const profileRes = await apiFetch<{ data: { coins_balance: number; preferred_mode?: string } }>('/api/profile');
        if (profileRes?.data) {
          setProfile(profileRes.data);
          if (profileRes.data.preferred_mode) {
            setSelectedMode(profileRes.data.preferred_mode);
          }
        }
      } catch (error) {
        console.error('Load profile error:', error);
      }

      loadRecentDocuments();
      loadUserTeams();
    };
    checkUser();

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

      if (SpeechRecognition) {
        setVoiceSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setError('');
        };

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            setContent(prev => prev + finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          if (event.error === 'no-speech' || event.error === 'aborted') return;
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setError('Microphone access denied.');
          }
          setTimeout(() => setError(''), 5000);
        };

        recognitionRef.current.onend = () => {
          if (isListening) {
            setTimeout(() => {
              try {
                recognitionRef.current.start();
              } catch (e) {
                setIsListening(false);
              }
            }, 100);
          }
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
    };
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadStyleGuide(selectedTeam);
    } else {
      setStyleGuide(null);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (styleGuide && content) {
      checkForbiddenWords();
    } else {
      setForbiddenWordsFound([]);
    }
  }, [content, styleGuide]);

  const loadStyleGuide = async (teamId: string) => {
    try {
      const response = await apiFetch<{ data: StyleGuide }>(`/api/teams/${teamId}/style-guide`);
      if (response?.data) {
        setStyleGuide(response.data);
      }
    } catch (error) {
      console.error('Style guide error:', error);
    }
  };

  const checkForbiddenWords = () => {
    if (!styleGuide?.forbidden_terms || styleGuide.forbidden_terms.length === 0) {
      setForbiddenWordsFound([]);
      return;
    }

    const words = content.toLowerCase().split(/\s+/);
    const found = styleGuide.forbidden_terms.filter((term) =>
      words.includes(term.toLowerCase())
    );
    setForbiddenWordsFound(found);
  };

  const highlightForbiddenWords = (text: string) => {
    if (!styleGuide?.forbidden_terms || styleGuide.forbidden_terms.length === 0) {
      return text;
    }

    let highlighted = text;
    styleGuide.forbidden_terms.forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, "gi");
      highlighted = highlighted.replace(
        regex,
        `<mark class="bg-red-200 text-red-800 font-bold px-1 rounded">$&</mark>`
      );
    });
    return highlighted;
  };

  const buildStyleGuidePrompt = (action: string, text: string): string => {
    if (!styleGuide) return text;

    let prompt = `${action === 'fix_grammar' ? 'Check and fix grammar' : action === 'improve' ? 'Improve' : action === 'rewrite' ? 'Rewrite' : 'Summarize'} the following text while adhering to this style guide:\n\n`;

    prompt += `**Brand Voice:** ${styleGuide.brand_voice}\n`;
    prompt += `**Tone:** ${styleGuide.tone}\n\n`;

    if (styleGuide.approved_terms && styleGuide.approved_terms.length > 0) {
      prompt += `**Preferred terms (use these):**\n`;
      styleGuide.approved_terms.forEach((term) => {
        prompt += `- ${term}\n`;
      });
      prompt += `\n`;
    }

    if (styleGuide.forbidden_terms && styleGuide.forbidden_terms.length > 0) {
      prompt += `**AVOID these terms:**\n`;
      styleGuide.forbidden_terms.forEach((term) => {
        prompt += `- ${term}\n`;
      });
      prompt += `\n`;
    }

    if (styleGuide.custom_rules) {
      prompt += `**Writing Guidelines:**\n`;
      if (styleGuide.custom_rules.writing_style) {
        prompt += `- Style: ${styleGuide.custom_rules.writing_style}\n`;
      }
      if (styleGuide.custom_rules.sentence_length) {
        prompt += `- Sentence length: ${styleGuide.custom_rules.sentence_length}\n`;
      }
      if (styleGuide.custom_rules.target_audience) {
        prompt += `- Audience: ${styleGuide.custom_rules.target_audience}\n`;
      }
      prompt += `\n`;
    }

    prompt += `**Original Text:**\n${text}\n\n`;
    prompt += `Return only the processed text following the style guide above.`;

    return prompt;
  };

  const loadRecentDocuments = async () => {
    try {
      const response = await apiFetch<{ data: DocumentType[] }>('/api/documents?limit=10&sort=updated_at:desc');
      if (response?.data) {
        setRecentDocs(response.data);
      }
    } catch (error) {
      console.error('Load documents error:', error);
    }
  };

  const loadUserTeams = async () => {
    if (!user) return;

    try {
      const response = await apiFetch<{ teams: { id: string; name: string }[] }>('/api/teams');
      if (response?.teams) {
        setUserTeams(response.teams);
        if (response.teams.length > 0 && !selectedTeam) {
          setSelectedTeam(response.teams[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  // Auto-save useEffect - works for both new and existing documents
  useEffect(() => {
    // Only auto-save if there's content and user is signed in
    if (!content || !user) return;

    // Clear previous timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    // Set status to saving
    setSavedStatus("saving");

    // Save after 3 seconds of inactivity
    saveTimerRef.current = setTimeout(() => {
      saveDocument();
    }, 3000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [content, title, selectedMode]);


  useEffect(() => {
    setCharCount(content.length);
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(words);
    setReadingTime(Math.ceil(words / 200));
  }, [content]);

  const saveDocument = async () => {
    if (!user) return;
    setSavedStatus("saving");
    try {
      if (!currentDoc) {
        // Create new document
        const response = await apiFetch<{ data: DocumentType }>('/api/documents', {
          method: 'POST',
          body: JSON.stringify({
            title,
            content,
            word_count: wordCount,
            char_count: charCount,
            reading_time: readingTime,
            mode: selectedMode
          }),
        });
        if (response?.data) {
          setCurrentDoc(response.data);
        }
      } else {
        // Update existing document
        await apiFetch(`/api/documents/${currentDoc.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title,
            content,
            word_count: wordCount,
            char_count: charCount,
            reading_time: readingTime,
            mode: selectedMode
          }),
        });
      }
      setSavedStatus("saved");
      loadRecentDocuments();
    } catch (err: any) {
      setSavedStatus("error");
      setError("Failed to save");
      setTimeout(() => setError(""), 3000);
    }
  };

  const loadDocument = async (docId: string) => {
    try {
      const response = await apiFetch<{ data: DocumentType }>(`/api/documents/${docId}`);
      if (response?.data) {
        const doc = response.data;
        setCurrentDoc(doc);
        setTitle(doc.title);
        setContent(doc.content);
        setSelectedMode(doc.mode || 'general');
        setShowDocList(false);
      }
    } catch (error) {
      console.error('Load document error:', error);
    }
  };

  const createNewDocument = () => {
    setCurrentDoc(null);
    setTitle("Untitled Document");
    setContent("");
    setSuggestions([]);
    setError("");
    setSelectedMode(profile?.preferred_mode || 'general');
  };

  const deleteDocument = async (docId: string) => {
    if (confirm("Delete this document?")) {
      try {
        await apiFetch(`/api/documents/${docId}`, { method: 'DELETE' });
        loadRecentDocuments();
        if (currentDoc?.id === docId) createNewDocument();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const handleModeChange = async (mode: string) => {
    setSelectedMode(mode);
    if (user) {
      try {
        await apiFetch('/api/profile', {
          method: 'PUT',
          body: JSON.stringify({ preferred_mode: mode }),
        });
      } catch (error) {
        console.error('Update mode error:', error);
      }
    }
  };

  const handleSelectTemplate = async (template: Template) => {
    setShowTemplateLibrary(false);
    setSelectedMode(template.mode);
    let templateContent = `# ${template.name}\n\n`;
    template.structure.sections.forEach((section: string) => {
      templateContent += `## ${section}\n\n[Write your content here]\n\n`;
    });
    setTitle(template.name);
    setContent(templateContent);
  };

  const toggleVoiceInput = async () => {
    if (!voiceSupported) {
      setError('Speech recognition not supported.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        stream.getTracks().forEach(track => track.stop());
        recognitionRef.current.start();
        setIsListening(true);
      } catch (micError) {
        setError('Microphone access denied.');
      }
    }
  };

  const processWithAI = async (action: string, prompt?: string) => {
    if (!content.trim()) {
      setError("Enter some text first!");
      setTimeout(() => setError(""), 3000);
      return;
    }
    setError("");
    setIsProcessing(true);

    try {
      // Using apiFetch for API calls

      const wordsToProcess = content.trim().split(/\s+/).filter(w => w.length > 0).length;

      const styleGuidePrompt = styleGuide && !prompt ? buildStyleGuidePrompt(action, content) : (prompt || content);

      const data = await apiFetch<{ result?: string; error?: string; coinsUsed?: number }>("/api/ai/process", {
        method: "POST",
        body: JSON.stringify({
          action,
          text: styleGuidePrompt,
          tone: selectedTone,
          mode: selectedMode,
          customPrompt: prompt,
          wordsCount: wordsToProcess,
          useStyleGuide: !!styleGuide
        }),
      });

      if (data.error) {
        setError(data.error || "Processing failed");
        setTimeout(() => setError(""), 3000);
        return;
      }

      const profileRes = await apiFetch<{ data?: any }>('/api/profile'); if (profileRes?.data) { setProfile(profileRes.data); }

      const newSuggestion: Suggestion = {
        id: Date.now(),
        action: styleGuide ? `${action} (Style Guide)` : action,
        original: content,
        suggestion: data.result || '',
        accepted: false,
        timestamp: new Date().toLocaleTimeString(),
      };

      setSuggestions([newSuggestion, ...suggestions]);
      setCoinsUsed(coinsUsed + (data.coinsUsed || 10));
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomPrompt = () => {
    if (!customPrompt.trim()) {
      setError("Enter a custom prompt");
      setTimeout(() => setError(""), 3000);
      return;
    }
    processWithAI("custom", customPrompt);
    setShowCustomPrompt(false);
    setCustomPrompt("");
  };

  const acceptSuggestion = (id: number) => {
    const suggestion = suggestions.find(s => s.id === id);
    if (suggestion) {
      setContent(suggestion.suggestion);
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, accepted: true } : s));
    }
  };

  const exportToTXT = () => {
    const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain' });
    saveAs(blob, `${title}.txt`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(content, 170);
    doc.text(lines, 20, 35);
    doc.save(`${title}.pdf`);
  };

  const exportToDOCX = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 32 })] }),
          new Paragraph({ text: "" }),
          ...content.split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, size: 24 })] }))
        ]
      }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title}.docx`);
  };

  const toggleFavorite = async () => {
    if (!currentDoc) return;
    await apiFetch(`/api/documents/${currentDoc.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_favorite: !currentDoc.is_favorite }),
    });
    setCurrentDoc({ ...currentDoc, is_favorite: !currentDoc.is_favorite });
    loadRecentDocuments();
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Documents Sidebar */}
      <div className={`${showDocList ? "w-80" : "w-0"} bg-slate-50 border-r border-slate-200 transition-all duration-300 overflow-hidden`}>
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Documents</h3>
            <button onClick={() => setShowDocList(false)} className="p-1 hover:bg-slate-200 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button onClick={createNewDocument} className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg">
            + New Document
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-140px)] p-4 space-y-2">
          {recentDocs.map((doc) => (
            <div key={doc.id} className={`p-4 rounded-lg border cursor-pointer transition-all ${currentDoc?.id === doc.id ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-200 hover:bg-slate-50"}`} onClick={() => loadDocument(doc.id)}>
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-slate-900 text-sm truncate">{doc.title}</h4>
                {doc.is_favorite && <span>⭐</span>}
              </div>
              <p className="text-xs text-slate-500">{doc.word_count} words • {new Date(doc.updated_at).toLocaleDateString()}</p>
              <button onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }} className="mt-2 text-xs text-red-600 hover:text-red-700">Delete</button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="h-auto bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <button onClick={() => setShowDocList(!showDocList)} className="p-2 hover:bg-slate-100 rounded-lg" title="Documents">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-lg" title="Dashboard">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 px-3 py-1 rounded min-w-[300px]" placeholder="Document title" />
              {currentDoc && (
                <button onClick={toggleFavorite} className="p-2 hover:bg-slate-100 rounded-lg" title={currentDoc.is_favorite ? "Remove from favorites" : "Add to favorites"}>
                  <span className="text-xl">{currentDoc.is_favorite ? "⭐" : "☆"}</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-50">
                {savedStatus === "saving" && <><div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div><span className="text-sm text-slate-600 font-medium">Saving...</span></>}
                {savedStatus === "saved" && <><svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg><span className="text-sm text-green-600 font-medium">Saved</span></>}
              </div>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 rounded-lg border border-amber-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" title="SkillsCoins Balance">
                <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                <span className="font-bold text-sm text-slate-900">{profile?.coins_balance || 0}</span>
              </div>
              {voiceSupported && (
                <button onClick={toggleVoiceInput} className={`p-3 rounded-lg transition-all ${isListening ? "bg-red-100 text-red-600 animate-pulse" : "hover:bg-slate-100 text-slate-600"}`} title={isListening ? "Stop voice input" : "Start voice input"}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
              )}
              <div className="relative group">
                <button className="p-3 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1" title="Export document">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 animate-scaleIn">
                  <button onClick={exportToTXT} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center space-x-2 text-sm font-medium text-slate-900 border-b border-slate-100"><span>📄</span><span>Export as TXT</span></button>
                  <button onClick={exportToPDF} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center space-x-2 text-sm font-medium text-slate-900 border-b border-slate-100"><span>📕</span><span>Export as PDF</span></button>
                  <button onClick={exportToDOCX} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center space-x-2 text-sm font-medium text-slate-900"><span>📘</span><span>Export as DOCX</span></button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ModeSelector currentMode={selectedMode} onModeChange={handleModeChange} />
              <button onClick={() => setShowTemplateLibrary(true)} className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 text-purple-700 rounded-lg font-semibold hover:shadow-md transition-all">
                <span className="text-xl">📄</span><span>Templates</span>
              </button>
              {userTeams.length > 0 && (
                <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-lg">
                  <span className="text-xl">🎨</span>
                  <select
                    value={selectedTeam || ''}
                    onChange={(e) => setSelectedTeam(e.target.value || null)}
                    className="bg-transparent border-none text-indigo-700 font-semibold text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="">No Style Guide</option>
                    {userTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  {selectedTeam && (
                    <Link
                      href={`/dashboard/teams/${selectedTeam}`}
                      className="text-indigo-600 hover:text-indigo-800"
                      title="View Team"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-6 text-sm text-slate-600">
              <span>📄 {wordCount} words</span>
              <span>🔤 {charCount} chars</span>
              <span>⏱️ {readingTime} min</span>
            </div>
          </div>

          {/* Style Guide Info */}
          {styleGuide && (
            <div className="mt-4 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
              <h4 className="font-bold text-indigo-900 mb-2 flex items-center">
                <span className="mr-2">📋</span>
                Active Style Guide: {userTeams.find(t => t.id === selectedTeam)?.name}
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-600">Brand Voice:</span>
                  <span className="ml-2 font-semibold text-indigo-800 capitalize">{styleGuide.brand_voice}</span>
                </div>
                <div>
                  <span className="text-slate-600">Tone:</span>
                  <span className="ml-2 font-semibold text-indigo-800 capitalize">{styleGuide.tone}</span>
                </div>
                {styleGuide.approved_terms && styleGuide.approved_terms.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Approved:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {styleGuide.approved_terms.slice(0, 5).map((term, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          ✓ {term}
                        </span>
                      ))}
                      {styleGuide.approved_terms.length > 5 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          +{styleGuide.approved_terms.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {styleGuide.forbidden_terms && styleGuide.forbidden_terms.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Forbidden:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {styleGuide.forbidden_terms.slice(0, 5).map((term, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                          ✕ {term}
                        </span>
                      ))}
                      {styleGuide.forbidden_terms.length > 5 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                          +{styleGuide.forbidden_terms.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Forbidden Words Warning */}
          {forbiddenWordsFound.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="font-bold text-red-800 text-sm mb-2">
                ⚠️ Warning: {forbiddenWordsFound.length} forbidden word{forbiddenWordsFound.length > 1 ? 's' : ''} detected!
              </p>
              <div className="flex flex-wrap gap-2">
                {forbiddenWordsFound.map((word, idx) => (
                  <span key={idx} className="px-2 py-1 bg-red-200 text-red-900 rounded text-xs font-semibold">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-auto bg-white">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Start typing or use voice input... AI will optimize for your selected mode." className="w-full h-full p-12 text-lg leading-relaxed font-medium text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none border-none" style={{ minHeight: "calc(100vh - 350px)" }} />
        </div>

        {/* Status Bar */}
        <div className="h-12 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-8 text-sm text-slate-600">
          <div className="flex items-center space-x-8">
            {coinsUsed > 0 && <span>💰 {coinsUsed} coins used this session</span>}
            {isListening && <span className="text-red-600 font-bold animate-pulse">🎤 Listening...</span>}
            {selectedTeam && styleGuide && (
              <span className="text-indigo-600 font-semibold">
                🎨 Style Guide Active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {error && <span className="text-red-600 font-medium">❌ {error}</span>}
            {isProcessing && <span className="text-indigo-600 font-medium">🤖 Processing with {styleGuide ? 'Style Guide' : 'AI'}...</span>}
          </div>
        </div>
      </div>

      {/* AI Tools Sidebar */}
      <div className="w-96 bg-gradient-to-b from-slate-50 to-white border-l border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h3 className="font-bold text-slate-900 flex items-center justify-between">
            <span>🤖 AI Assistant</span>
            {isProcessing && <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>}
          </h3>
          {styleGuide && (
            <p className="text-xs text-indigo-600 mt-1">✨ Style guide will be applied to all AI actions</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <Accordion title="Editing Tools" icon="✏️" defaultOpen={true} badge="Popular">
            <button onClick={() => processWithAI("fix_grammar")} disabled={isProcessing} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:shadow-md transition-all disabled:opacity-50">
              <div className="flex items-center space-x-3"><span>✅</span><span className="font-medium text-green-700">Fix Grammar</span></div>
              <span className="text-xs text-green-600 font-semibold">5 coins</span>
            </button>
            <button onClick={() => processWithAI("improve")} disabled={isProcessing} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-md transition-all disabled:opacity-50">
              <div className="flex items-center space-x-3"><span>📝</span><span className="font-medium text-blue-700">Improve Writing</span></div>
              <span className="text-xs text-blue-600 font-semibold">10 coins</span>
            </button>
            <button onClick={() => processWithAI("rewrite")} disabled={isProcessing} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg hover:shadow-md transition-all disabled:opacity-50">
              <div className="flex items-center space-x-3"><span>🔄</span><span className="font-medium text-purple-700">Rewrite</span></div>
              <span className="text-xs text-purple-600 font-semibold">15 coins</span>
            </button>
          </Accordion>

          <Accordion title="Content Tools" icon="📊" defaultOpen={false}>
            <button onClick={() => processWithAI("summarize")} disabled={isProcessing} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg hover:shadow-md transition-all disabled:opacity-50">
              <div className="flex items-center space-x-3"><span>📊</span><span className="font-medium text-orange-700">Summarize</span></div>
              <span className="text-xs text-orange-600 font-semibold">8 coins</span>
            </button>
            <button onClick={() => setShowCustomPrompt(!showCustomPrompt)} disabled={isProcessing} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg hover:shadow-md transition-all disabled:opacity-50">
              <div className="flex items-center space-x-3"><span>✨</span><span className="font-medium text-yellow-700">Custom Prompt</span></div>
              <span className="text-xs text-yellow-600 font-semibold">20 coins</span>
            </button>
            {showCustomPrompt && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3 animate-slideDown">
                <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Enter instruction..." className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-yellow-500 text-slate-900 bg-white" rows={3} />
                <div className="flex space-x-2">
                  <button onClick={handleCustomPrompt} disabled={isProcessing || !customPrompt.trim()} className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm font-semibold rounded hover:bg-yellow-700 disabled:opacity-50">Process</button>
                  <button onClick={() => { setShowCustomPrompt(false); setCustomPrompt(""); }} className="px-3 py-2 bg-slate-200 text-slate-700 text-sm font-semibold rounded hover:bg-slate-300">Cancel</button>
                </div>
              </div>
            )}
          </Accordion>

          <Accordion title="Integrity Tools" icon="🔍" defaultOpen={false} badge="New">
            <AdvancedPanel
              content={content}
              onApplyResult={(result) => {
                setContent(result);
                setSuggestions([{ id: Date.now(), action: "advanced", original: content, suggestion: result, accepted: false, timestamp: new Date().toLocaleTimeString() }, ...suggestions]);
              }}
              coinsBalance={profile?.coins_balance || 0}
            />
          </Accordion>

          <Accordion title="Preferences" icon="⚙️" defaultOpen={false}>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">Tone</label>
              <select value={selectedTone} onChange={(e) => setSelectedTone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="neutral">Neutral</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
            </div>
          </Accordion>
        </div>
      </div>

      <FloatingSuggestions
        suggestions={suggestions}
        onAccept={acceptSuggestion}
        onDismiss={(id) => setSuggestions(suggestions.filter(s => s.id !== id))}
      />

      <FloatingToolbar onAction={(action) => processWithAI(action)} />

      {showTemplateLibrary && (
        <TemplateLibrary
          currentMode={selectedMode}
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplateLibrary(false)}
        />
      )}
    </div>
  );
}

