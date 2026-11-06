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
  ShieldCheck,
  TrendingUp,
  History,
  Users,
  Wallet,
  Globe,
  Radio,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  StoryPitch,
  ScriptSection,
  SavedScriptEntry,
  StorylineMap,
  VerifiedSource,
  BriefingPackData,
} from "@/types";
import { getStorySections } from "@/utils/scriptHelper";
import { API_ENDPOINTS } from "@/lib/api";

interface ScriptStudioProps {
  selectedStory: StoryPitch | null;
  onUpdateStoryScript: (storyId: string, updatedSections: ScriptSection[]) => void;
  onResetStoryScript: (storyId: string) => void;
  onOpenApiKeys: () => void;
  isBuildingStoryline?: boolean;
}

export const ScriptStudio: React.FC<ScriptStudioProps> = ({
  selectedStory,
  onUpdateStoryScript,
  onResetStoryScript,
  onOpenApiKeys,
  isBuildingStoryline = false,
}) => {
  const [sections, setSections] = useState<ScriptSection[]>([]);
  const [scriptFormat, setScriptFormat] = useState<"long" | "short">("long");
  const [briefingPack, setBriefingPack] = useState<BriefingPackData | null>(null);
  const [isBriefingPackOpen, setIsBriefingPackOpen] = useState(true);
  const [showRawBriefingText, setShowRawBriefingText] = useState(false);
  const [storylineMap, setStorylineMap] = useState<StorylineMap | null>(null);
  const [scriptMeta, setScriptMeta] = useState<{ vehicle?: string; mechanism?: string } | null>(null);
  const [isStorylineMapExpanded, setIsStorylineMapExpanded] = useState(true);
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
    }, 4000);
  };

  // Load Saved Library from localStorage on mount & auto-purge corrupted 0m 0s / 0-word entries
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("causalflow_saved_library");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (entry: SavedScriptEntry) =>
                entry &&
                typeof entry.wordCount === "number" &&
                entry.wordCount > 0 &&
                entry.runtime &&
                !entry.runtime.startsWith("0m 0s") &&
                Array.isArray(entry.sections) &&
                entry.sections.length > 0 &&
                entry.sections.some(
                  (s) => s.narration && s.narration.trim().length > 0
                )
            );
            setSavedLibrary(valid);
            localStorage.setItem(
              "causalflow_saved_library",
              JSON.stringify(valid)
            );
          }
        } catch (e) {
          console.error("Failed to load saved library", e);
        }
      }
    }
  }, []);

  // Sync state whenever selectedStory changes
  useEffect(() => {
    if (selectedStory) {
      // 1. Sync Storyline Map from selectedStory or cached in localStorage
      if (selectedStory.storylineMap) {
        setStorylineMap(selectedStory.storylineMap);
      } else {
        const cachedMap = localStorage.getItem(`causalflow_storyline_${selectedStory.id}`);
        if (cachedMap) {
          try {
            setStorylineMap(JSON.parse(cachedMap));
          } catch (e) {
            console.error("Failed to parse cached storyline map", e);
          }
        } else if (selectedStory.nodes) {
          // Fallback to story nodes
          setStorylineMap({
            timelineThread: {
              title: selectedStory.nodes.macroTrigger.title || "1. Developing Timeline",
              baselineOrigin: selectedStory.nodes.macroTrigger.baselineOrigin || "Ongoing geopolitical impasse",
              breakingUpdate: selectedStory.nodes.macroTrigger.breakingUpdate || selectedStory.nodes.macroTrigger.description,
              outletsReporting: selectedStory.nodes.macroTrigger.outletsReporting || selectedStory.nodes.macroTrigger.source,
              metricTag: selectedStory.nodes.macroTrigger.metricTag || "🚨 High Strategic Sensitivity",
              description: selectedStory.nodes.macroTrigger.description,
            },
            historicalParallel: {
              title: selectedStory.nodes.historicalParallel.title || "2. Historical Parallel",
              precedentEvent: selectedStory.nodes.historicalParallel.historicalPrecedent || selectedStory.historyShort || "1973 Oil Shock",
              period: selectedStory.nodes.historicalParallel.period || "1973–1979",
              similarityScore: selectedStory.nodes.historicalParallel.similarityScore || "93% Structural Match",
              mechanism: selectedStory.nodes.historicalParallel.mechanism || "Structural supply and resource chokepoint leverage.",
              lesson: selectedStory.nodes.historicalParallel.lesson || "Physical constraints cannot be replaced by monetary policy.",
              description: selectedStory.nodes.historicalParallel.description,
            },
            averagePersonImpact: {
              title: selectedStory.nodes.humanImpact.title || "3. Everyday Human Scale",
              affectedGroup: selectedStory.nodes.humanImpact.affectedGroup || "Everyday Consumers & Households",
              stepByStepChain: "Geopolitical shock ➔ Shipping surcharges ➔ Wholesale repricing ➔ Retail utility & grocery checkout costs.",
              dollarOrPriceMetric: selectedStory.nodes.humanImpact.dollarOrPriceMetric || "+$38/mo Average Surcharge",
              actionableTakeaway: selectedStory.nodes.humanImpact.actionableTakeaway || "Audit household energy bills and hedge volatile commodity inputs.",
              description: selectedStory.nodes.humanImpact.description,
            },
          });
        }
      }

      // 2. Load cached briefing pack if present
      if (selectedStory.briefingPack) {
        setBriefingPack(selectedStory.briefingPack);
      } else {
        const cachedBriefing = localStorage.getItem(`causalflow_briefing_${selectedStory.id}`);
        if (cachedBriefing) {
          try {
            setBriefingPack(JSON.parse(cachedBriefing));
          } catch (e) {
            console.error("Failed to parse cached briefing pack", e);
          }
        } else {
          setBriefingPack(null);
        }
      }

      // 3. Check if user has cached script in localStorage
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

      // 4. Otherwise load standardized 5-act sections
      const defaultSections = getStorySections(selectedStory);
      setSections(defaultSections);
    } else {
      setSections([]);
      setStorylineMap(null);
      setBriefingPack(null);
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
          Click &quot;Build Documentary Storyline →&quot; on any verified consensus card on the left to generate its 3-part storyline map and Economics Explained documentary script.
        </p>
      </div>
    );
  }

  // Calculate live word count & speaking time strictly from pure voiceover narration
  const fullNarration = sections
    .map((s) => s.narration || "")
    .join("\n\n")
    .trim();
  const totalWords = fullNarration
    ? fullNarration.split(/\s+/).filter(Boolean).length
    : 0;
  // Documentary pacing: ~150 words/minute
  const totalMinutes = Math.floor(totalWords / 150);
  const remainingSeconds = Math.round(((totalWords % 150) / 150) * 60);
  const runtimeCalculated =
    totalWords > 0
      ? `${totalMinutes}m ${remainingSeconds}s`
      : isBuildingStoryline || isGeneratingFullScript
      ? "Generating..."
      : "0m 0s";

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

  // 1. Deep Context Search & Full Screenplay Generation via Jimak Writing Style Guide
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

    const displayModel =
      model && model !== "auto" && model !== "hybrid"
        ? model
        : "claude-sonnet-4-6";

    setIsGeneratingFullScript(true);
    setGenerationStep("1/2 Scraping full-text article bodies via Jina Reader & fetching background archives...");

    try {
      setTimeout(() => {
        setGenerationStep(
          `2/2 Generating ${
            scriptFormat === "short" ? "Shorts (~60s)" : "Long-Form Documentary"
          } screenplay via Jimak Guide with ${displayModel}...`
        );
      }, 2000);

      const res = await fetch(API_ENDPOINTS.script, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch: selectedStory,
          cluster: selectedStory,
          format: scriptFormat,
          apiKey: groqKey,
          groqKey,
          tavilyKey,
          model,
          provider,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to generate screenplay.");
      }

      if (data.briefingPack) {
        setBriefingPack(data.briefingPack);
        setIsBriefingPackOpen(true);
        localStorage.setItem(
          `causalflow_briefing_${selectedStory.id}`,
          JSON.stringify(data.briefingPack)
        );
      }

      if (data.meta) {
        setScriptMeta(data.meta);
      }

      const generatedSections: ScriptSection[] = (data.sections || []).map(
        (s: any, idx: number) => ({
          act: s.act || `ACT ${idx + 1}`,
          cue: s.cue || "",
          narration: s.narration || "",
          timestamp: s.timestamp || "",
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
        `✓ Generated ${
          scriptFormat === "short" ? "Shorts (~60s)" : "Long-Form"
        } Screenplay via Jimak Guide (${resolvedModel})!`
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

    setRegeneratingActIndex(actIndex);

    try {
      const res = await fetch(API_ENDPOINTS.script, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch: selectedStory,
          cluster: selectedStory,
          format: scriptFormat,
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
        act: data.updatedSection?.act || sections[actIndex].act,
        cue: data.updatedSection?.cue || sections[actIndex].cue,
        narration: data.updatedSection?.narration || sections[actIndex].narration,
        timestamp: data.updatedSection?.timestamp || sections[actIndex].timestamp,
      };

      setSections(updated);
      onUpdateStoryScript(selectedStory.id, updated);
      localStorage.setItem(
        `causalflow_script_${selectedStory.id}`,
        JSON.stringify(updated)
      );

      showToast(`✓ Rewrote Act [${actIndex + 1}] in Jimak documentary voice!`);
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
        // Strip [Fact Source: ...] inline citations
        text = text.replace(/\[Fact Source:[^\]]+\]/gi, "");
        // Strip [CapCut ...] and [CAPCUT CUES...] visual directions
        text = text.replace(/\[CAPCUT\s*CUES?[^\]]*\]/gi, "");
        text = text.replace(/\[CapCut[^\]]*\]/gi, "");
        text = text.replace(/\[SCENE\s*START[^\]]*\]/gi, "");
        text = text.replace(/\[SFX:[^\]]*\]/gi, "");
        text = text.replace(/\[B-Roll:[^\]]+\]/gi, "");
        // Strip markdown headings and bold tags
        text = text.replace(/^#{1,6}\s+.*$/gm, "");
        text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
        text = text.replace(/__([^_]+)__/g, "$1");
        // Strip accidental Act headers
        text = text.replace(/^(COLD OPEN|ACT I|ACT II|ACT III|OUTRO|CHAPTER \d+)[^\n]*\n?/gim, "");
        return text.replace(/[ \t]+/g, " ").trim();
      })
      .filter(Boolean)
      .join("\n\n");

    navigator.clipboard.writeText(cleanVoiceover);
    setCopyStatus("clean");
    showToast("✓ Clean Voiceover copied! (All citations & visual cues stripped for 100% smooth TTS/ElevenLabs)");
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
    if (totalWords === 0 || sections.length === 0) {
      showToast("⚠️ Cannot save an empty screenplay. Please generate a script first.");
      return;
    }

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
      runtime: `${totalMinutes}m ${remainingSeconds}s`,
      sections,
    };

    const updatedLibrary = [
      newEntry,
      ...savedLibrary.filter((s) => s.pitchId !== selectedStory.id),
    ];
    setSavedLibrary(updatedLibrary);
    localStorage.setItem("causalflow_saved_library", JSON.stringify(updatedLibrary));
    localStorage.setItem(`causalflow_script_${selectedStory.id}`, JSON.stringify(sections));

    setCopyStatus("saved");
    showToast(`✓ Saved "${selectedStory.title.slice(0, 30)}..." (${totalWords} words) to Saved Scripts Library!`);
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

  const verifiedSourcesList: VerifiedSource[] = selectedStory.verifiedSources || [];
  const breakingArticles = verifiedSourcesList.filter((s) => s.type !== "background_context");
  const contextArticles = verifiedSourcesList.filter((s) => s.type === "background_context");

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
            {scriptMeta && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                <span>🚀 {scriptMeta.vehicle}</span>
                <span>•</span>
                <span>⚙️ {scriptMeta.mechanism}</span>
              </span>
            )}
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
            {/* Format Switcher Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-[#06080F] p-0.5 border border-slate-200 dark:border-white/10 mr-1">
              <button
                onClick={() => setScriptFormat("long")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scriptFormat === "long"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Long-Form Documentary (~12-15m / 2,000-2,500 words across 5 acts)"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Long-Form (~12-15m)</span>
              </button>
              <button
                onClick={() => setScriptFormat("short")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scriptFormat === "short"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Shorts / Reel (~60s / ~280 words, high-retention hook & CTA)"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Shorts (~60s)</span>
              </button>
            </div>

            {/* 1. Copy Clean Voiceover (TTS Ready) */}
            <button
              onClick={handleCopyCleanVoiceover}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-500/20 transition-all"
              title="Copies only spoken voiceover paragraphs stripped of CapCut cues and inline citations, 100% smooth for ElevenLabs/TTS"
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
              title="Copy full screenplay with visual cues and act titles"
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

          {/* Deep Context AI Research & Screenplay Generation Button */}
          <button
            onClick={handleDeepResearchAndGenerate}
            disabled={isGeneratingFullScript || isBuildingStoryline}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
            title="Scrape full articles via Jina Reader, build ground-truth briefing pack, and generate Jimak screenplay"
          >
            <Sparkles
              className={`w-4 h-4 ${
                isGeneratingFullScript || isBuildingStoryline
                  ? "animate-spin text-blue-200"
                  : ""
              }`}
            />
            <span>
              {isGeneratingFullScript || isBuildingStoryline
                ? "Scraping & Generating..."
                : `Generate ${
                    scriptFormat === "short" ? "Shorts (~60s)" : "Long-Form"
                  } Screenplay`}
            </span>
          </button>
        </div>

        {/* Generation Progress Bar */}
        {(isGeneratingFullScript || isBuildingStoryline) && (
          <div className="mt-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-mono text-blue-600 dark:text-blue-400 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{generationStep || "Fetching background context & generating screenplay..."}</span>
            </div>
            <span className="font-bold">Jimak Documentary Studio</span>
          </div>
        )}
      </div>

      {/* Main Studio Body: Briefing Pack + Storyline Map + Script Sections */}
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
          <>
            {/* VERIFIED GROUND-TRUTH BRIEFING PACK VIEWER */}
            {briefingPack && (
              <section className="rounded-2xl border border-blue-500/30 bg-blue-50/50 dark:bg-[#06080F]/90 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-blue-200/50 dark:border-blue-900/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                          Ground-Truth Briefing Pack
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                          Jina AI Reader
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {briefingPack.scrapedCount} full-text scraped articles &bull; {briefingPack.timelineCount} historical background archives
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRawBriefingText(!showRawBriefingText)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#141C2E] transition-colors"
                    >
                      {showRawBriefingText ? "Show Structured View" : "View Raw Pack Sent to AI"}
                    </button>
                    <button
                      onClick={() => setIsBriefingPackOpen(!isBriefingPackOpen)}
                      className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                      <span>{isBriefingPackOpen ? "Collapse" : "Expand"}</span>
                      {isBriefingPackOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isBriefingPackOpen && (
                  <div className="space-y-4">
                    {showRawBriefingText && briefingPack.briefingPackText ? (
                      <div className="rounded-xl p-3.5 bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10">
                        <pre className="text-[11px] font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                          {briefingPack.briefingPackText}
                        </pre>
                      </div>
                    ) : (
                      <>
                        {/* Scraped Articles List with Ground-Truth Paragraphs */}
                        <div className="space-y-2.5">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Full-Text Scraped Articles ({briefingPack.articles?.length || 0})
                          </span>
                          <div className="grid grid-cols-1 gap-2.5">
                            {(briefingPack.articles || []).map((art, aIdx) => (
                              <div
                                key={`scraped-${aIdx}`}
                                className="rounded-xl p-3 bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 space-y-2 hover:border-blue-500/30 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <a
                                    href={art.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5"
                                  >
                                    <span>{art.title}</span>
                                    <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                                  </a>
                                  <div className="flex items-center gap-1.5 font-mono text-[10px] shrink-0">
                                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/50 dark:border-blue-800/40">
                                      {art.source}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                                      {art.region || "Global"}
                                    </span>
                                    <span className="text-slate-400">
                                      {art.paragraphsCount} paragraphs extracted
                                    </span>
                                  </div>
                                </div>
                                {art.snippet && (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic border-l-2 border-blue-500/40 pl-2.5 py-0.5">
                                    &ldquo;{art.snippet}&rdquo;
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Background Timeline Archives */}
                        {(briefingPack.backgroundTimeline || []).length > 0 && (
                          <div className="space-y-2 pt-2">
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                              Historical Background Archives ({briefingPack.backgroundTimeline.length})
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {briefingPack.backgroundTimeline.map((bg, bgIdx) => (
                                <div
                                  key={`bg-${bgIdx}`}
                                  className="p-2.5 rounded-xl bg-white dark:bg-[#0E131F] border border-purple-500/20 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                                      {bg.title}
                                    </span>
                                    <span className="text-[10px] font-mono text-purple-500 shrink-0 ml-2">
                                      {bg.source}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                    {bg.snippet}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* 1. THE 3-PART GEOPOLITICAL STORYLINE MAP (RENDERED AT TOP BEFORE SCRIPT) */}
            {storylineMap && (
              <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#06080F]/90 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                        3-Part Geopolitical Storyline Map
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Past Background ➔ Today&apos;s Multi-Outlet Consensus ➔ Historical Mirror ➔ Micro Impact
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsStorylineMapExpanded(!isStorylineMapExpanded)}
                    className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <span>{isStorylineMapExpanded ? "Collapse" : "Expand"}</span>
                    {isStorylineMapExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {isStorylineMapExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* NODE 1: TIMELINE THREAD */}
                    <div className="rounded-xl p-3.5 sm:p-4 bg-white dark:bg-[#0E131F] border border-blue-500/20 shadow-sm flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <TrendingUp className="w-3 h-3" />
                            <span>1. DEVELOPING TIMELINE</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">Past ➔ Now</span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {storylineMap.timelineThread.title}
                        </h4>

                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            <strong className="text-slate-700 dark:text-slate-300 font-mono">Origins:</strong> {storylineMap.timelineThread.baselineOrigin}
                          </p>
                          <p className="text-[11px]">
                            <strong className="text-blue-600 dark:text-blue-400 font-mono">Today&apos;s Catalyst:</strong> {storylineMap.timelineThread.breakingUpdate}
                          </p>
                        </div>
                      </div>

                      {storylineMap.timelineThread.outletsReporting && (
                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] font-mono text-slate-400">
                          <span>Reported by: {storylineMap.timelineThread.outletsReporting}</span>
                        </div>
                      )}
                    </div>

                    {/* NODE 2: HISTORICAL PRECEDENT (THE STRUCTURAL ECHO) */}
                    <div className="rounded-xl p-3.5 sm:p-4 bg-white dark:bg-[#0E131F] border border-amber-500/20 shadow-sm flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <History className="w-3 h-3" />
                            <span>2. HISTORICAL PRECEDENT</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-500">
                            {storylineMap.historicalParallel.similarityScore}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {storylineMap.historicalParallel.precedentEvent} ({storylineMap.historicalParallel.period})
                        </h4>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {storylineMap.historicalParallel.mechanism}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        <strong className="text-amber-600 dark:text-amber-400">Lesson:</strong> {storylineMap.historicalParallel.lesson}
                      </div>
                    </div>

                    {/* NODE 3: AVERAGE PERSON IMPACT (THE MICRO RIPPLE) */}
                    <div className="rounded-xl p-3.5 sm:p-4 bg-white dark:bg-[#0E131F] border border-emerald-500/20 shadow-sm flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Wallet className="w-3 h-3" />
                            <span>3. EVERYDAY HUMAN SCALE</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-500">
                            {storylineMap.averagePersonImpact.dollarOrPriceMetric}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {storylineMap.averagePersonImpact.affectedGroup}
                        </h4>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {storylineMap.averagePersonImpact.stepByStepChain}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        <strong className="text-emerald-600 dark:text-emerald-400">Takeaway:</strong> {storylineMap.averagePersonImpact.actionableTakeaway}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 2. PRODUCTION SCREENPLAY CARDS */}
            <div className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                    {scriptFormat === "short"
                      ? "Jimak High-Retention Shorts Screenplay (~280 words)"
                      : "Jimak 5-Act Documentary Screenplay (~12-15m)"}
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Pure Spoken Voiceover • Mandatory Inline Citations
                </span>
              </div>

              {sections.map((section, idx) => {
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
                          title="Rewrite or expand this specific act with Economics Explained voice"
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
                                Visual B-Roll Directions & Sound Design
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-blue-600/70 dark:text-blue-400/70">
                              Editing & Visual Directions
                            </span>
                          </div>

                          <textarea
                            value={section.cue}
                            onChange={(e) => handleVisualCueChange(idx, e.target.value)}
                            rows={3}
                            className="w-full bg-white/70 dark:bg-[#06080F]/50 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-mono p-2.5 rounded-lg border border-blue-200/60 dark:border-blue-800/40 outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-y leading-relaxed"
                            placeholder="Visual B-roll shots, motion graphics, audio drops, sound design..."
                          />
                        </div>

                        {/* Spoken Narration Paragraph Below with Inline Citations */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <Mic className="w-3.5 h-3.5 text-blue-500" />
                              <span>Pure Spoken Voiceover (Zero Cues or Formatting in Speech)</span>
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
                            placeholder="Enter spoken voiceover script with inline citations like [Source: BBC World]..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 3. DEDICATED VERIFIED EVIDENCE DRAWER / PANEL (AT BOTTOM OF SCRIPT STUDIO) */}
            {verifiedSourcesList.length > 0 && (
              <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#06080F]/80 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                      Ground-Truth Evidence Pack ({verifiedSourcesList.length} Verified Sources)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Zero Hallucinated Claims
                  </span>
                </div>

                {/* Breaking Multi-Outlet Reporting */}
                {breakingArticles.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Today&apos;s Breaking Consensus Reporting ({breakingArticles.length})
                    </span>
                    <div className="space-y-2">
                      {breakingArticles.map((source, sIdx) => (
                        <div
                          key={`break-${sIdx}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-[#0E131F] border border-slate-200/70 dark:border-white/5 text-xs hover:border-blue-500/30 transition-colors"
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

                {/* Background Context & Historical Timeline Articles */}
                {contextArticles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Historical Context & Background Timeline Archive ({contextArticles.length})
                    </span>
                    <div className="space-y-2">
                      {contextArticles.map((source, cIdx) => (
                        <div
                          key={`ctx-${cIdx}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-[#0E131F] border border-purple-500/20 text-xs hover:border-purple-500/40 transition-colors"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <a
                              href={source.link}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-slate-900 dark:text-white hover:text-purple-500 flex items-center gap-1.5 transition-colors"
                            >
                              <span className="line-clamp-1">{source.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 text-purple-400" />
                            </a>
                            {source.snippet && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {source.snippet}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold">
                              {source.source}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                              Historical Context
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
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
