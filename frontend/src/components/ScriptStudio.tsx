"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  Save,
  Download,
  RotateCcw,
  Clock,
  FileText,
  Video,
  Mic,
  Maximize2,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Volume2,
  BookOpen,
  ExternalLink,
  Search,
  ShieldCheck,
} from "lucide-react";
import { StoryPitch, ScriptSection, SavedScriptEntry } from "@/types";
import { getStorySections } from "@/utils/scriptHelper";
import { API_ENDPOINTS } from "@/lib/api";

interface ScriptStudioProps {
  selectedStory: StoryPitch | null;
  onUpdateStoryScript: (storyId: string, updatedSections: ScriptSection[]) => void;
  onResetStoryScript: (storyId: string) => void;
  onOpenApiKeys: () => void;
}

export const ScriptStudio: React.FC<ScriptStudioProps> = ({
  selectedStory,
  onUpdateStoryScript,
  onResetStoryScript,
  onOpenApiKeys,
}) => {
  const [sections, setSections] = useState<ScriptSection[]>([]);
  const [copyStatus, setCopyStatus] = useState<"idle" | "clean" | "all" | "saved">("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Deep research and script generation state
  const [isGeneratingFullScript, setIsGeneratingFullScript] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [regeneratingActIndex, setRegeneratingActIndex] = useState<number | null>(null);

  // Library & Teleprompter Modals
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [savedLibrary, setSavedLibrary] = useState<SavedScriptEntry[]>([]);
  const [isTeleprompterMode, setIsTeleprompterMode] = useState(false);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(2);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const teleprompterRef = useRef<HTMLDivElement>(null);

  const [collapsedActs, setCollapsedActs] = useState<Record<number, boolean>>({});

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Load Saved Library from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("causalflow_saved_library");
      if (stored) {
        try {
          setSavedLibrary(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to load saved library", e);
        }
      }
    }
  }, []);

  // Sync state whenever selectedStory changes
  useEffect(() => {
    if (selectedStory) {
      // 1. Check if user has cached edits in localStorage
      const cachedKey = `causalflow_script_${selectedStory.id}`;
      const cached = localStorage.getItem(cachedKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSections(parsed);
            return;
          } else if (parsed.sections && Array.isArray(parsed.sections)) {
            setSections(parsed.sections);
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached script", e);
        }
      }

      // 2. Otherwise load standardized 5-act sections
      const defaultSections = getStorySections(selectedStory);
      setSections(defaultSections);
    } else {
      setSections([]);
    }
  }, [selectedStory]);

  // Teleprompter auto-scroll effect
  useEffect(() => {
    let interval: any;
    if (isTeleprompterMode && isAutoScrolling) {
      interval = setInterval(() => {
        if (teleprompterRef.current) {
          teleprompterRef.current.scrollTop += teleprompterSpeed;
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isTeleprompterMode, isAutoScrolling, teleprompterSpeed]);

  if (!selectedStory) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-8 text-center rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 ring-1 ring-blue-500/20">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Script Studio Idle
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          Select any 3-Node Causal Timeline card from the Story Radar to review, deep-research, and edit its 5-Act documentary script.
        </p>
      </div>
    );
  }

  // Calculate live word count & speaking time
  const fullNarration = sections.map((s) => s.narration).join("\n\n");
  const totalWords = fullNarration
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  // Documentary pacing: ~145 words/minute
  const totalMinutes = Math.floor(totalWords / 145);
  const remainingSeconds = Math.round(((totalWords % 145) / 145) * 60);
  const runtimeCalculated = `${totalMinutes}m ${remainingSeconds}s`;

  // Act change handlers
  const handleNarrationChange = (index: number, newNarration: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], narration: newNarration };
    setSections(updated);
    onUpdateStoryScript(selectedStory.id, updated);
  };

  const handleVisualCueChange = (index: number, newCue: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], cue: newCue };
    setSections(updated);
    onUpdateStoryScript(selectedStory.id, updated);
  };

  // 1. Deep Context Search & Full Script Generation (Tavily + Groq / Universal AI)
  const handleDeepResearchAndGenerate = async () => {
    let groqKey = "";
    let tavilyKey = "";
    let model = "";
    let provider = "";

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("causalflow_api_keys");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          groqKey = parsed.apiKey || parsed.groqKey || "";
          tavilyKey = parsed.tavilyKey || "";
          model = parsed.model || "";
          provider = parsed.provider || "";
        } catch (e) {
          console.error("Failed to parse api keys", e);
        }
      }
    }

    if (!groqKey) {
      showToast("💡 Please configure your Universal AI API key (Vyce AI, Gemini, Groq, OpenRouter, or OpenAI) in Settings to run AI research & scriptwriting!");
      onOpenApiKeys();
      return;
    }

    const displayModel =
      model && model !== "auto" && model !== "hybrid"
        ? model
        : "claude-sonnet-4-6";
    setIsGeneratingFullScript(true);
    setGenerationStep("1/2 Digging up live facts & historical archives via Tavily...");

    try {
      setTimeout(() => {
        setGenerationStep(`2/2 Writing 5-Act production documentary script via ${displayModel}...`);
      }, 1800);

      const res = await fetch(API_ENDPOINTS.script, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch: selectedStory,
          apiKey: groqKey,
          groqKey,
          tavilyKey,
          model,
          provider,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate script.");
      }

      const generatedSections: ScriptSection[] = (data.sections || []).map(
        (s: any, idx: number) => ({
          act: s.act || `ACT ${idx + 1}`,
          cue: s.cue || "[CAPCUT CUES]\n• Cinematic B-roll cuts and overlays",
          narration: s.narration || "",
        })
      );

      setSections(generatedSections);
      onUpdateStoryScript(selectedStory.id, generatedSections);

      // Cache in localStorage
      localStorage.setItem(
        `causalflow_script_${selectedStory.id}`,
        JSON.stringify(generatedSections)
      );

      const resolvedModel = data.model || displayModel;
      showToast(
        data.hasTavilyResearch
          ? `✓ Verified with Tavily Research & drafted full 5-act script via ${resolvedModel}!`
          : `✓ Drafted 5-act production script via ${resolvedModel}!`
      );
    } catch (err: any) {
      console.error("Script generation error:", err);
      showToast(`Generation failed: ${err.message || "Network error"}`);
    } finally {
      setIsGeneratingFullScript(false);
      setGenerationStep("");
    }
  };

  // 2. Interactive Single Act Regeneration
  const handleRegenerateSingleAct = async (actIndex: number) => {
    let groqKey = "";
    let tavilyKey = "";
    let model = "";
    let provider = "";

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("causalflow_api_keys");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          groqKey = parsed.apiKey || parsed.groqKey || "";
          tavilyKey = parsed.tavilyKey || "";
          model = parsed.model || "";
          provider = parsed.provider || "";
        } catch (e) {
          console.error("Failed to parse api keys", e);
        }
      }
    }

    if (!groqKey) {
      showToast("💡 Add your Universal AI API key in Settings to regenerate individual acts!");
      onOpenApiKeys();
      return;
    }

    setRegeneratingActIndex(actIndex);

    try {
      const res = await fetch(API_ENDPOINTS.script, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch: selectedStory,
          targetActIndex: actIndex,
          currentSections: sections,
          apiKey: groqKey,
          groqKey,
          tavilyKey,
          model,
          provider,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to regenerate act");
      }

      const updated = [...sections];
      updated[actIndex] = {
        act: data.updatedSection.act || sections[actIndex].act,
        cue: data.updatedSection.cue || sections[actIndex].cue,
        narration: data.updatedSection.narration || sections[actIndex].narration,
      };

      setSections(updated);
      onUpdateStoryScript(selectedStory.id, updated);
      localStorage.setItem(
        `causalflow_script_${selectedStory.id}`,
        JSON.stringify(updated)
      );

      showToast(`✓ Rewrote Act [${actIndex + 1}] without altering the rest of your script!`);
    } catch (err: any) {
      console.error("Act regen error:", err);
      showToast(`Act regeneration failed: ${err.message}`);
    } finally {
      setRegeneratingActIndex(null);
    }
  };

  // 3. Copy Clean Voiceover (TTS ready: strips cues, inline [Source: ...] tags, joins narration only)
  const handleCopyCleanVoiceover = () => {
    const cleanVoiceover = sections
      .map((s) => {
        let text = s.narration || "";
        // Strip [Source: ...] inline citations
        text = text.replace(/\[Source:[^\]]+\]/gi, "");
        // Strip [CapCut ...] visual directions
        text = text.replace(/\[CapCut[^\]]*\]/gi, "");
        // Strip [B-Roll ...] bracketed directions
        text = text.replace(/\[B-Roll:[^\]]+\]/gi, "");
        return text.replace(/[ \t]+/g, " ").trim();
      })
      .filter(Boolean)
      .join("\n\n");

    navigator.clipboard.writeText(cleanVoiceover);
    setCopyStatus("clean");
    showToast("✓ Clean Voiceover copied! (Citations & visual cues stripped for 100% smooth ElevenLabs/TTS)");
    setTimeout(() => setCopyStatus("idle"), 2500);
  };

  // 4. Copy All (Complete screenplay with CapCut cues)
  const handleCopyAll = () => {
    const screenplay = [
      `TITLE: ${selectedStory.title}`,
      `CATEGORY: ${selectedStory.category}`,
      `EST. RUNTIME: ${runtimeCalculated} (${totalWords} words)`,
      `DATE: ${selectedStory.date}`,
      "========================================",
      "",
      ...sections.map(
        (s, idx) =>
          `### [${idx + 1}] ${s.act}\n${s.cue}\n\nVOICEOVER / NARRATION:\n${s.narration}\n\n----------------------------------------\n`
      ),
      "========================================",
    ].join("\n");

    navigator.clipboard.writeText(screenplay);
    setCopyStatus("all");
    showToast("✓ Complete Documentary Screenplay copied to clipboard!");
    setTimeout(() => setCopyStatus("idle"), 2500);
  };

  // 5. Save to Saved Scripts Library (localStorage)
  const handleSaveToLibrary = () => {
    const newEntry: SavedScriptEntry = {
      id: `saved-${Date.now()}`,
      pitchId: selectedStory.id,
      title: selectedStory.title,
      category: selectedStory.category,
      savedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      wordCount: totalWords,
      runtime: runtimeCalculated,
      sections,
    };

    const updatedLibrary = [newEntry, ...savedLibrary.filter((s) => s.pitchId !== selectedStory.id)];
    setSavedLibrary(updatedLibrary);
    localStorage.setItem("causalflow_saved_library", JSON.stringify(updatedLibrary));
    localStorage.setItem(`causalflow_script_${selectedStory.id}`, JSON.stringify(sections));

    setCopyStatus("saved");
    showToast(`✓ Saved "${selectedStory.title.slice(0, 30)}..." to Saved Scripts Library!`);
    setTimeout(() => setCopyStatus("idle"), 2500);
  };

  // Export Markdown or TXT
  const handleExportFile = (extension: "md" | "txt") => {
    let content = "";
    if (extension === "md") {
      content = `# ${selectedStory.title}\n\n**Format:** ${selectedStory.targetFormat}  \n**Est. Runtime:** ${runtimeCalculated} (${totalWords} words)  \n**Category:** ${selectedStory.category}  \n\n---\n\n` +
        sections
          .map(
            (s) =>
              `## ${s.act}\n\n\`\`\`\n${s.cue}\n\`\`\`\n\n${s.narration}\n\n---\n\n`
          )
          .join("");
    } else {
      content = `TITLE: ${selectedStory.title}\n\n` +
        sections.map((s) => `[${s.act}]\n${s.cue}\n\n${s.narration}\n\n`).join("\n");
    }

    const blob = new Blob([content], {
      type: extension === "md" ? "text/markdown" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `causalflow-${selectedStory.id}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✓ Downloaded as .${extension}`);
  };

  // Reset to default
  const handleReset = () => {
    localStorage.removeItem(`causalflow_script_${selectedStory.id}`);
    onResetStoryScript(selectedStory.id);
    const defaults = getStorySections(selectedStory);
    setSections(defaults);
    showToast("Reverted script back to original version");
  };

  const toggleCollapse = (idx: number) => {
    setCollapsedActs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="flex flex-col h-full rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-colors">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-blue-600 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white ml-2 text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Studio Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141C2E]/40">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
              {selectedStory.category}
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Est. {runtimeCalculated}</span>
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{totalWords} words</span>
            </span>
          </div>

          {/* Quick Utility Actions: Library, Teleprompter, Export */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Saved Library Drawer Button */}
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0E131F] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#141C2E] transition-colors"
              title="Open Saved Scripts Library"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>Library ({savedLibrary.length})</span>
            </button>

            {/* Teleprompter Toggle */}
            <button
              onClick={() => setIsTeleprompterMode(!isTeleprompterMode)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isTeleprompterMode
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-[#0E131F] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#141C2E]"
              }`}
              title="Toggle Fullscreen Teleprompter"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Teleprompter</span>
            </button>

            {/* Export Markdown */}
            <button
              onClick={() => handleExportFile("md")}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0E131F] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#141C2E] transition-colors"
              title="Download script as Markdown (.md)"
            >
              <Download className="w-3.5 h-3.5 inline sm:mr-1" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="p-1.5 sm:px-2 sm:py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0E131F] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors"
              title="Reset any edits back to original"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Story Title in Studio */}
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
          {selectedStory.title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
          {selectedStory.subtitle}
        </p>

        {/* Action Button Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Copy Clean Voiceover (TTS Ready) */}
            <button
              onClick={handleCopyCleanVoiceover}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-500/20 transition-all"
              title="Copies only spoken narration paragraphs stripped of all CapCut visual cues, 100% ready for ElevenLabs/TTS"
            >
              {copyStatus === "clean" ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span>Copy Clean Voiceover</span>
              <span className="hidden md:inline-block text-[10px] font-mono opacity-80 px-1 py-0.2 rounded bg-black/20">
                TTS Ready
              </span>
            </button>

            {/* 2. Copy All Script */}
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white hover:bg-slate-100 dark:bg-[#0E131F] dark:hover:bg-[#141C2E] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all active:scale-95"
              title="Copy full screenplay with CapCut cues and act titles"
            >
              {copyStatus === "all" ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4 text-slate-400" />
              )}
              <span>Copy All</span>
            </button>

            {/* 3. Save to Library */}
            <button
              onClick={handleSaveToLibrary}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white hover:bg-slate-100 dark:bg-[#0E131F] dark:hover:bg-[#141C2E] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all active:scale-95"
              title="Save current script to Saved Scripts Library"
            >
              {copyStatus === "saved" ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Save className="w-4 h-4 text-slate-400" />
              )}
              <span>Save Script</span>
            </button>
          </div>

          {/* Deep Context AI Research & Script Generation Button */}
          <button
            onClick={handleDeepResearchAndGenerate}
            disabled={isGeneratingFullScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 transition-all"
            title="Perform deep Tavily live fact search and rewrite 5 full acts via Llama 3.3 70B"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingFullScript ? "animate-spin text-blue-500" : ""}`} />
            <span>{isGeneratingFullScript ? "Researching..." : "Deep Research & Rewrite"}</span>
          </button>
        </div>

        {/* Generation Progress Bar */}
        {isGeneratingFullScript && (
          <div className="mt-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-mono text-blue-600 dark:text-blue-400 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{generationStep}</span>
            </div>
            <span className="font-bold">Llama 3.3 70B</span>
          </div>
        )}
      </div>

      {/* Main Studio Body: Teleprompter View OR 5-Act Cards */}
      <div
        ref={teleprompterRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
      >
        {isTeleprompterMode ? (
          /* TELEPROMPTER FULLSCREEN-LIKE MODE */
          <div className="space-y-8 max-w-3xl mx-auto py-6">
            <div className="sticky top-0 z-10 p-3.5 rounded-xl bg-blue-50 dark:bg-[#06080F] border border-blue-200 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-3 shadow-md backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isAutoScrolling
                      ? "bg-red-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {isAutoScrolling ? "Pause Auto-Scroll" : "Start Auto-Scroll"}
                </button>
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-300">
                  <span>Speed:</span>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={teleprompterSpeed}
                    onChange={(e) => setTeleprompterSpeed(Number(e.target.value))}
                    className="w-20 accent-blue-600 cursor-pointer"
                  />
                  <span>{teleprompterSpeed}x</span>
                </div>
              </div>

              <button
                onClick={() => setIsTeleprompterMode(false)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Exit Teleprompter
              </button>
            </div>

            {sections.map((section, idx) => (
              <div key={idx} className="space-y-3 pb-4 border-b border-slate-200 dark:border-white/5">
                <span className="inline-block px-2.5 py-1 rounded text-xs font-mono font-bold bg-blue-600 text-white">
                  {section.act}
                </span>
                <p className="text-xl sm:text-2xl font-medium leading-relaxed text-slate-900 dark:text-slate-100 tracking-wide font-sans">
                  {section.narration}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* 5-ACT PRODUCTION CARDS */
          sections.map((section, idx) => {
            const isCollapsed = collapsedActs[idx];
            const isRegeneratingThis = regeneratingActIndex === idx;

            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#06080F]/60 overflow-hidden shadow-sm transition-all"
              >
                {/* Act Card Header */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50/80 dark:bg-[#141C2E]/60 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold tracking-tight bg-blue-600 text-white">
                      {section.act}
                    </span>
                    {section.timestamp && (
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {section.timestamp}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Regenerate Act Button */}
                    <button
                      onClick={() => handleRegenerateSingleAct(idx)}
                      disabled={isRegeneratingThis || isGeneratingFullScript}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-white dark:bg-[#0E131F] text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50"
                      title="Rewrite or expand this specific act with fresh economic figures"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isRegeneratingThis ? "animate-spin text-blue-500" : ""}`}
                      />
                      <span>{isRegeneratingThis ? "Rewriting..." : "Regenerate Act"}</span>
                    </button>

                    <button
                      onClick={() => toggleCollapse(idx)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* [CapCut Visual Cues] Distinct Blue Callout Container */}
                    <div className="rounded-xl p-3.5 sm:p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 shadow-inner">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-blue-600 text-white">
                            <Video className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                            CapCut Visual Cues & B-Roll Instructions
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-blue-600/70 dark:text-blue-400/70">
                          Video Production Notes
                        </span>
                      </div>

                      <textarea
                        value={section.cue}
                        onChange={(e) => handleVisualCueChange(idx, e.target.value)}
                        rows={3}
                        className="w-full bg-white/70 dark:bg-[#06080F]/50 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-mono p-2.5 rounded-lg border border-blue-200/60 dark:border-blue-800/40 outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-y leading-relaxed"
                        placeholder="[CapCut Visual Cues]: Shot description, B-roll stock keywords, sound effects..."
                      />
                    </div>

                    {/* Spoken Narration Paragraph Below */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <Mic className="w-3.5 h-3.5 text-blue-500" />
                          <span>Spoken Voiceover Copy (Editable)</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {section.narration.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>

                      <textarea
                        value={section.narration}
                        onChange={(e) => handleNarrationChange(idx, e.target.value)}
                        rows={6}
                        className="w-full bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-slate-100 text-sm sm:text-base p-3.5 rounded-xl border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-y leading-relaxed font-sans"
                        placeholder="Enter natural spoken voiceover script..."
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Dedicated Verified Sources & Evidence Panel */}
        {selectedStory.verifiedSources && selectedStory.verifiedSources.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#06080F]/80 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                  Verified Reporting Sources & Evidence ({selectedStory.verifiedSources.length})
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Multi-Continental Coverage
              </span>
            </div>

            <div className="space-y-2">
              {selectedStory.verifiedSources.map((source, sIdx) => (
                <div
                  key={sIdx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-[#0E131F] border border-slate-200/70 dark:border-white/5 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <a
                      href={source.link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                    >
                      <span className="line-clamp-1">{source.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-blue-500" />
                    </a>
                    {source.snippet && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {source.snippet}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40 font-semibold">
                      {source.source}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                      {source.region}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SAVED SCRIPTS LIBRARY DRAWER */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md h-full bg-white dark:bg-[#0E131F] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col p-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Saved Scripts Library
                </h3>
              </div>
              <button
                onClick={() => setIsLibraryOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {savedLibrary.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No saved scripts yet.</p>
                  <p className="mt-1 text-slate-500">
                    Click &quot;Save Script&quot; on any pitch to store it here for offline editing.
                  </p>
                </div>
              ) : (
                savedLibrary.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#06080F] border border-slate-200 dark:border-white/10 hover:border-blue-500/40 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold">
                        {entry.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {entry.savedAt}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mb-1.5">
                      {entry.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/50 dark:border-white/5">
                      <span>{entry.runtime} • {entry.wordCount} words</span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSections(entry.sections);
                            setIsLibraryOpen(false);
                            showToast(`Loaded "${entry.title.slice(0, 25)}..." into Studio!`);
                          }}
                          className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            const updated = savedLibrary.filter((s) => s.id !== entry.id);
                            setSavedLibrary(updated);
                            localStorage.setItem(
                              "causalflow_saved_library",
                              JSON.stringify(updated)
                            );
                            showToast("Deleted script from library");
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-xs text-slate-500">
              <span>{savedLibrary.length} saved screenplay{savedLibrary.length === 1 ? "" : "s"}</span>
              <button
                onClick={() => setIsLibraryOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#141C2E] text-slate-700 dark:text-slate-300 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
