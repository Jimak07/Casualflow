"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { CuriosityBar } from "@/components/CuriosityBar";
import { StoryPitchCard } from "@/components/StoryPitchCard";
import { StorySkeletonCard } from "@/components/StorySkeletonCard";
import { ScriptStudio } from "@/components/ScriptStudio";
import { ApiKeysModal } from "@/components/ApiKeysModal";
import { AddPresetModal } from "@/components/AddPresetModal";
import { MOCK_STORIES, DEFAULT_PRESETS } from "@/data/mockStories";
import { StoryPitch, ScriptSection, DocumentaryScript, LensPreset, ApiKeysConfig } from "@/types";
import { getStorySections } from "@/utils/scriptHelper";
import { API_ENDPOINTS } from "@/lib/api";
import {
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  Compass,
  AlertCircle,
  Key,
  X,
  CheckCircle2,
  Radio,
} from "lucide-react";

export default function Home() {
  // Theme state: dark mode by default
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Stories and presets
  const [stories, setStories] = useState<StoryPitch[]>(MOCK_STORIES);
  const [selectedStory, setSelectedStory] = useState<StoryPitch | null>(MOCK_STORIES[0]);
  const [presets, setPresets] = useState<LensPreset[]>(DEFAULT_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Loading and synthesizing state
  const [isScanning, setIsScanning] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [liveHeadlineCount, setLiveHeadlineCount] = useState<number>(45);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "info" | "success" | "warning";
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Modals & Query tracking
  const [isApiKeysOpen, setIsApiKeysOpen] = useState(false);
  const [isAddPresetOpen, setIsAddPresetOpen] = useState(false);
  const [lastSynthesizedQuery, setLastSynthesizedQuery] = useState<string>("");

  // Mobile navigation tab: "radar" | "studio"
  const [mobileActiveTab, setMobileActiveTab] = useState<"radar" | "studio">("radar");

  const showToast = useCallback(
    (
      text: string,
      type: "info" | "success" | "warning" = "info",
      actionLabel?: string,
      onAction?: () => void
    ) => {
      setToastMessage({ text, type, actionLabel, onAction });
      setTimeout(() => {
        setToastMessage(null);
      }, 5500);
    },
    []
  );

  // Load custom presets, cached stories, and theme on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Theme initialization
      const savedTheme = localStorage.getItem("causalflow_theme");
      if (savedTheme === "light") {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      } else {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }

      // 2. Custom Presets initialization
      const savedPresets = localStorage.getItem("causalflow_custom_presets");
      if (savedPresets) {
        try {
          const parsed = JSON.parse(savedPresets);
          setPresets([...DEFAULT_PRESETS, ...parsed]);
        } catch (e) {
          console.error("Failed to load presets", e);
        }
      }

      // 3. Cached Generated Stories initialization (preserves last scan with deduplication)
      const savedStories = localStorage.getItem("causalflow_stories");
      if (savedStories) {
        try {
          const parsedStories = JSON.parse(savedStories);
          if (Array.isArray(parsedStories) && parsedStories.length > 0) {
            const seen = new Set<string>();
            const deduped = parsedStories.filter((s: StoryPitch) => {
              const key = (s.title || s.id || "").toLowerCase().trim();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            if (deduped.length > 0) {
              setStories(deduped);
              setSelectedStory(deduped[0]);
            }
          }
        } catch (e) {
          console.error("Failed to load saved stories", e);
        }
      }
    }
  }, []);

  // Theme toggle
  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        localStorage.setItem("causalflow_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        localStorage.setItem("causalflow_theme", "light");
      }
      return next;
    });
  };

  // Add custom preset
  const handleAddPreset = (newPreset: LensPreset) => {
    const updated = [...presets, newPreset];
    setPresets(updated);
    setActivePresetId(newPreset.id);

    // Save custom presets to localStorage
    const customOnly = updated.filter((p) => p.isCustom);
    localStorage.setItem("causalflow_custom_presets", JSON.stringify(customOnly));
  };

  // Update story script in state and localStorage
  const handleUpdateStoryScript = (
    storyId: string,
    updatedSections: ScriptSection[]
  ) => {
    setStories((prev) =>
      prev.map((s) =>
        s.id === storyId
          ? {
              ...s,
              script: {
                ...s.script,
                sections: updatedSections,
              },
            }
          : s
      )
    );
    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory((prev) =>
        prev
          ? {
              ...prev,
              script: {
                ...prev.script,
                sections: updatedSections,
              },
            }
          : null
      );
    }
  };

  // Reset script in state
  const handleResetStoryScript = (storyId: string) => {
    const original = MOCK_STORIES.find((s) => s.id === storyId);
    if (original) {
      const defaultSections = getStorySections(original);
      handleUpdateStoryScript(storyId, defaultSections);
    }
  };

  // Core Autonomous Dot-Connector Synthesis Pipeline
  const runLiveSynthesis = async (
    targetQuery?: string,
    targetPresetId?: string
  ) => {
    setIsScanning(true);
    setIsSynthesizing(true);
    if (targetQuery !== undefined) {
      setLastSynthesizedQuery(targetQuery);
    }

    try {
      // 1. Ingest live headlines from keyless RSS feeds across ALL global regions (Africa, India, Asia, Europe, US)
      const radarUrl = targetQuery
        ? `${API_ENDPOINTS.radar}?q=${encodeURIComponent(targetQuery)}`
        : API_ENDPOINTS.radar;

      const radarRes = await fetch(radarUrl);
      const radarData = await radarRes.json();
      const headlines = radarData.headlines || [];
      if (headlines.length > 0) {
        setLiveHeadlineCount(headlines.length);
      }

      // 2. Retrieve user's Universal AI key from localStorage
      let groqKey = "";
      let model = "";
      let provider = "";
      if (typeof window !== "undefined") {
        const savedKeys = localStorage.getItem("causalflow_api_keys");
        if (savedKeys) {
          try {
            const parsed = JSON.parse(savedKeys);
            groqKey = parsed.apiKey || parsed.groqKey || "";
            model = parsed.model || "";
            provider = parsed.provider || "";
          } catch (e) {
            console.error("Failed to parse api keys", e);
          }
        }
      }

      // 3. If no key is entered, prompt the user with a friendly blue toast
      if (!groqKey) {
        setIsScanning(false);
        setIsSynthesizing(false);

        showToast(
          "💡 Connect your Universal AI API key (Vyce AI, Gemini, Groq, OpenRouter, or OpenAI) in Settings to run live multi-continental synthesis!",
          "info",
          "Open Settings",
          () => setIsApiKeysOpen(true)
        );
        return;
      }

      // 4. Call /api/synthesize with live global headlines & user lens
      const synthRes = await fetch(API_ENDPOINTS.synthesize, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headlines,
          preset: targetPresetId || activePresetId,
          customQuery: targetQuery || searchQuery || "",
          apiKey: groqKey,
          groqKey,
          model,
          provider,
        }),
      });

      const synthData = await synthRes.json();

      if (!synthRes.ok || !synthData.success) {
        throw new Error(synthData.message || synthData.error || "Failed to synthesize story pitches.");
      }

      const rawPitches = synthData.pitches || [];

      // 5. Map returned pitches to frontend StoryPitch type
      const mappedPitches: StoryPitch[] = rawPitches.map((p: any, idx: number) => {
        const categoryMap: Record<string, string> = {
          "ai-finance": "AI × Financial Markets",
          geopolitics: "Geopolitics & Supply Chains",
          "macro-crisis": "Cost of Living & Raw Materials",
        };

        const resolvedCategory =
          categoryMap[p.category] || p.category || "Geopolitics & Supply Chains";

        const verifiedSrcs =
          p.verifiedSources && p.verifiedSources.length > 0
            ? p.verifiedSources
            : headlines.slice(0, 3).map((h: any) => ({
                title: h.title,
                source: h.source,
                region: h.region || "Global",
                link: h.link,
                pubDate: h.pubDate,
              }));

        return {
          id: p.id || `live-pitch-${Date.now()}-${idx}`,
          title: p.title || "Cross-Continental Documentary Investigation",
          subtitle:
            p.subtitle ||
            `${p.nodes?.macroTrigger?.description || ""} Connecting to ${p.historyShort || "historical precedents"}.`,
          category: resolvedCategory,
          estimatedRuntime: p.runtime || "13m 40s (~2,000 words)",
          wordCount: 2000,
          targetFormat: "YouTube Deep Dive / Investigative Documentary",
          date: "Live Global Consensus",
          impactScore:
            parseInt(String(p.badge || "").replace(/[^0-9]/g, "") || "96") || 96,
          badge: p.badge || "Multi-Continental Consensus",
          consensusBadge:
            p.consensusBadge ||
            "GLOBAL CONSENSUS: Reported across Asia, Africa & US",
          regionsReporting:
            p.regionsReporting || [
              "Africa",
              "India & South Asia",
              "US & Global Finance",
              "Europe & UK",
            ],
          searchQueries: p.searchQueries || [],
          historyShort: p.historyShort || "Historical Precedent",
          verifiedSources: verifiedSrcs,
          sourceCatalyst: {
            outlet: verifiedSrcs[0]?.source || "Global News Matrix",
            timeAgo: "Live Update",
            headline: p.nodes?.macroTrigger?.breakingUpdate || p.title,
          },
          nodes: {
            macroTrigger: {
              title:
                p.nodes?.macroTrigger?.title ||
                "1. The Developing Timeline (Past ➔ Today's Update)",
              date: "Today's Update",
              description: p.nodes?.macroTrigger?.description || "",
              baselineOrigin: p.nodes?.macroTrigger?.baselineOrigin || "",
              breakingUpdate: p.nodes?.macroTrigger?.breakingUpdate || "",
              outletsReporting: p.nodes?.macroTrigger?.outletsReporting || "",
              metricTag: p.nodes?.macroTrigger?.metricTag || "+38% Volatility",
              source: p.nodes?.macroTrigger?.source || "Global Outlets",
            },
            historicalParallel: {
              title:
                p.nodes?.historicalParallel?.title ||
                "2. Geopolitical & Historical Mirror",
              period:
                p.nodes?.historicalParallel?.period ||
                p.historyShort ||
                "Historical Precedent",
              description: p.nodes?.historicalParallel?.description || "",
              mechanism: p.nodes?.historicalParallel?.mechanism || "",
              historicalPrecedent:
                p.nodes?.historicalParallel?.historicalPrecedent || "",
              similarityScore:
                p.nodes?.historicalParallel?.similarityScore ||
                "91% Structural Match",
              lesson:
                p.nodes?.historicalParallel?.lesson ||
                "Capital cycles repeat across energy, debt, and trade bottlenecks.",
            },
            humanImpact: {
              title:
                p.nodes?.humanImpact?.title ||
                "3. Everyday Human Impact (The Average Citizen)",
              affectedGroup:
                p.nodes?.humanImpact?.affectedGroup ||
                "Everyday Consumers & Households",
              description: p.nodes?.humanImpact?.description || "",
              groundLevelEffect:
                p.nodes?.humanImpact?.groundLevelEffect || "",
              dollarOrPriceMetric:
                p.nodes?.humanImpact?.dollarOrPriceMetric ||
                "+$42/mo Average Surcharge",
              actionableTakeaway:
                p.nodes?.humanImpact?.actionableTakeaway ||
                "Audit local utility repricing notices and hedge commodity inflation.",
            },
          },
          script: p.script,
        };
      });

      // 6. Update state: REPLACE stories with newly synthesized pitches (eliminates duplicate/mock cards!)
      setStories(mappedPitches);
      if (mappedPitches.length > 0) {
        setSelectedStory(mappedPitches[0]);
      }
      localStorage.setItem("causalflow_stories", JSON.stringify(mappedPitches));

      if (synthData.notice) {
        showToast(synthData.notice, "info");
      } else {
        const usedModel =
          synthData.model ||
          (model && model !== "auto" && model !== "hybrid"
            ? model
            : "gemini-3.1-flash-lite");

        showToast(
          `✓ Autonomous Dot-Connector clustered live global news into ${mappedPitches.length} pitches via ${usedModel}!`,
          "success"
        );
      }
    } catch (err: any) {
      console.error("Live synthesis error:", err);
      showToast(
        `Synthesis failed: ${err.message || "Network error"}. Please check your API key in Settings.`,
        "warning",
        "API Settings",
        () => setIsApiKeysOpen(true)
      );
    } finally {
      setIsScanning(false);
      setIsSynthesizing(false);
    }
  };

  // Handle Connect Dots search submit
  const handleConnectDots = (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    runLiveSynthesis(query);
  };

  // Filter stories based on active preset and search query
  const filteredStories = stories.filter((story) => {
    // 1. Preset filter
    const activePreset = presets.find((p) => p.id === activePresetId);
    if (activePreset && activePreset.id !== "all") {
      if (activePreset.queryFilter) {
        const filterStr = activePreset.queryFilter.toLowerCase();
        const matchesCategory = story.category?.toLowerCase().includes(filterStr);
        const matchesContent =
          story.title?.toLowerCase().includes(filterStr) ||
          story.nodes?.macroTrigger?.description?.toLowerCase().includes(filterStr) ||
          story.nodes?.historicalParallel?.description?.toLowerCase().includes(filterStr) ||
          story.nodes?.humanImpact?.description?.toLowerCase().includes(filterStr);
        if (!matchesCategory && !matchesContent) return false;
      }
    }

    // 2. Search query filter
    // Only apply client-side text filtering if the query is different from the last synthesized query
    // (since newly synthesized pitches are already tailored to the last synthesized query)
    if (
      searchQuery.trim() &&
      searchQuery.toLowerCase().trim() !== lastSynthesizedQuery.toLowerCase().trim()
    ) {
      const q = searchQuery.toLowerCase().trim();
      const matches =
        story.title?.toLowerCase().includes(q) ||
        story.subtitle?.toLowerCase().includes(q) ||
        story.category?.toLowerCase().includes(q) ||
        story.nodes?.macroTrigger?.title?.toLowerCase().includes(q) ||
        story.nodes?.macroTrigger?.description?.toLowerCase().includes(q) ||
        story.nodes?.historicalParallel?.title?.toLowerCase().includes(q) ||
        story.nodes?.historicalParallel?.description?.toLowerCase().includes(q) ||
        story.nodes?.humanImpact?.title?.toLowerCase().includes(q) ||
        story.nodes?.humanImpact?.description?.toLowerCase().includes(q);
      if (!matches) return false;
    }

    return true;
  });

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode
          ? "bg-[#06080F] text-white radar-ambient-glow-dark"
          : "bg-[#F8FAFC] text-slate-900 radar-ambient-glow-light"
      }`}
    >
      {/* Dynamic Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-[calc(100%-2rem)] p-4 rounded-2xl bg-white dark:bg-[#0E131F] border border-blue-500/50 shadow-2xl shadow-blue-500/20 text-slate-900 dark:text-white text-xs sm:text-sm animate-in fade-in slide-in-from-top-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div>
              <p className="font-medium leading-relaxed">{toastMessage.text}</p>
              {toastMessage.actionLabel && toastMessage.onAction && (
                <button
                  onClick={() => {
                    toastMessage.onAction?.();
                    setToastMessage(null);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>{toastMessage.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOP NAVIGATION BAR */}
      <Navbar
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenApiKeys={() => setIsApiKeysOpen(true)}
        onScanNews={() => runLiveSynthesis()}
        isScanning={isScanning || isSynthesizing}
        mobileActiveTab={mobileActiveTab}
        onTabChange={(tab) => setMobileActiveTab(tab)}
        storyCount={filteredStories.length}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col gap-6">
        {/* 2. AI CURIOSITY BAR & HORIZONTAL LENS PRESETS */}
        <section className="w-full">
          <CuriosityBar
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            activePresetId={activePresetId}
            onSelectPreset={(id) => {
              setActivePresetId(id);
            }}
            presets={presets}
            onOpenAddPreset={() => setIsAddPresetOpen(true)}
            onConnectDots={handleConnectDots}
            storyMatchCount={filteredStories.length}
          />
        </section>

        {/* 3. RESPONSIVE SPLIT VIEW / SEGMENTED TAB VIEW */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Story Radar Feed & 3-Node Causal Cards */}
          <div
            className={`lg:col-span-5 flex flex-col space-y-4 ${
              mobileActiveTab === "radar" ? "block" : "hidden lg:block"
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                  Autonomous Story Radar
                </h2>
              </div>

              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {isSynthesizing ? "Synthesizing dots..." : `${filteredStories.length} active pitches`}
              </span>
            </div>

            {/* AI Dot-Connector Skeleton Shimmer State */}
            {isSynthesizing && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs font-mono text-blue-700 dark:text-blue-300">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-spin text-blue-500" />
                    <span>Connecting dots across {liveHeadlineCount} live global headlines...</span>
                  </div>
                  <span className="animate-pulse font-bold">Llama 3.3 70B</span>
                </div>
                <StorySkeletonCard />
                <StorySkeletonCard />
              </div>
            )}

            {/* List of 3-Node Causal Cards */}
            {!isSynthesizing && filteredStories.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  No stories found for this lens
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Try asking in the Curiosity Bar or click &quot;Scan Live News&quot; to discover fresh macro catalysts.
                </p>
                <button
                  onClick={() => {
                    setActivePresetId("all");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              !isSynthesizing && (
                <div className="space-y-4">
                  {filteredStories.map((story) => (
                    <StoryPitchCard
                      key={story.id}
                      story={story}
                      isSelected={selectedStory?.id === story.id}
                      onSelect={(st) => {
                        setSelectedStory(st);
                        // On mobile, auto-switch to studio view so user immediately sees their script
                        if (window.innerWidth < 1024) {
                          setMobileActiveTab("studio");
                        }
                      }}
                    />
                  ))}
                </div>
              )
            )}
          </div>

          {/* RIGHT COLUMN: Block-Based Documentary Script Studio */}
          <div
            className={`lg:col-span-7 h-full min-h-[600px] lg:sticky lg:top-20 ${
              mobileActiveTab === "studio" ? "block" : "hidden lg:block"
            }`}
          >
            <ScriptStudio
              selectedStory={selectedStory}
              onUpdateStoryScript={handleUpdateStoryScript}
              onResetStoryScript={handleResetStoryScript}
              onOpenApiKeys={() => setIsApiKeysOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#06080F]/80 py-4 px-4 sm:px-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              CausalFlow Studio
            </span>
            <span>•</span>
            <span>Autonomous Documentary Intelligence</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              $0 Stack Compatible (Groq + Tavily)
            </span>
            <span>•</span>
            <span>Local Storage Client Mode</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <ApiKeysModal
        isOpen={isApiKeysOpen}
        onClose={() => setIsApiKeysOpen(false)}
        onSaveKeys={(keys: ApiKeysConfig) => {
          showToast("✓ API Key saved locally! Ready for live Groq synthesis.", "success");
        }}
      />

      <AddPresetModal
        isOpen={isAddPresetOpen}
        onClose={() => setIsAddPresetOpen(false)}
        onAddPreset={handleAddPreset}
      />
    </div>
  );
}
