"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { NewsSearchEngineBar } from "@/components/NewsSearchEngineBar";
import { SectionPreviewCard } from "@/components/SectionPreviewCard";
import { StorySkeletonCard } from "@/components/StorySkeletonCard";
import { FullPageReaderView } from "@/components/FullPageReaderView";
import { CompiledSummarySheetModal } from "@/components/CompiledSummarySheetModal";
import { ApiKeysModal } from "@/components/ApiKeysModal";
import {
  ClusteredNewsEvent,
  BriefingPackData,
  SavedScriptEntry,
  SortMode,
  EventCategoryMeta,
  EVENT_CATEGORIES,
} from "@/types";
import { API_ENDPOINTS } from "@/lib/api";
import {
  generateCompiledSummaryText,
  downloadSummaryTextFile,
} from "@/lib/summaryGenerator";
import {
  Sparkles,
  AlertCircle,
  X,
  CheckCircle2,
  Radio,
  FileText,
  Download,
} from "lucide-react";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // View state: "homepage" | "reader"
  const [currentView, setCurrentView] = useState<"homepage" | "reader">("homepage");
  const [readerTab, setReaderTab] = useState<"script" | "briefing">("script");

  // Clustered News State
  const [clusters, setClusters] = useState<ClusteredNewsEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("importance");
  const [isScanning, setIsScanning] = useState(false);

  // Reader View State
  const [selectedCluster, setSelectedCluster] = useState<ClusteredNewsEvent | null>(null);
  const [scriptText, setScriptText] = useState<string>("");
  const [briefingPack, setBriefingPack] = useState<BriefingPackData | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [scriptModel, setScriptModel] = useState<string>("gpt-5.6-sol");
  const [scriptProvider, setScriptProvider] = useState<string>("AgentRouter");

  // Summary Sheet Modal State
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryScope, setSummaryScope] = useState<string>("ALL 24 SECTIONS");
  const [summarySectionMetas, setSummarySectionMetas] = useState<EventCategoryMeta[]>(EVENT_CATEGORIES);

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "info" | "success" | "warning";
  } | null>(null);

  // Settings Modal
  const [isApiKeysOpen, setIsApiKeysOpen] = useState(false);

  const showToast = useCallback(
    (text: string, type: "info" | "success" | "warning" = "info") => {
      setToastMessage({ text, type });
      setTimeout(() => setToastMessage(null), 5000);
    },
    []
  );

  // Helper to save script entry to localStorage library
  const saveToLibrary = useCallback(
    (
      cluster: ClusteredNewsEvent,
      pureText: string,
      wordCount: number,
      briefing?: BriefingPackData | null
    ) => {
      if (typeof window === "undefined" || !pureText) return;
      try {
        const stored = localStorage.getItem("causalflow_saved_library");
        const list: SavedScriptEntry[] = stored ? JSON.parse(stored) : [];

        const runtimeMins = Math.max(1, Math.round(wordCount / 145));
        const newEntry: SavedScriptEntry = {
          id: `script-${cluster.id}-${Date.now()}`,
          pitchId: cluster.id,
          title: cluster.title,
          category: cluster.category || cluster.categoryLabel || "Geopolitics",
          savedAt: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          wordCount,
          runtime: `~${runtimeMins}m spoken`,
          scriptText: pureText,
          fullVoiceover: pureText,
          briefingPack: briefing || undefined,
          verifiedSources: cluster.articles.map((a) => ({
            title: a.title,
            source: a.source,
            region: a.region,
            link: a.link,
            snippet: a.snippet,
          })),
        };

        const filtered = list.filter((i) => i.title !== cluster.title);
        filtered.unshift(newEntry);
        localStorage.setItem("causalflow_saved_library", JSON.stringify(filtered.slice(0, 30)));
      } catch (e) {
        console.error("Failed to save to local library", e);
      }
    },
    []
  );

  // Fetch /api/radar
  const fetchRadar = useCallback(
    async (query?: string) => {
      setIsScanning(true);
      try {
        const qParam = query !== undefined ? query.trim() : searchQuery.trim();
        const url = qParam
          ? `${API_ENDPOINTS.radar}?q=${encodeURIComponent(qParam)}`
          : API_ENDPOINTS.radar;

        const res = await fetch(url);
        const data = await res.json();

        if (data && data.success && Array.isArray(data.clusters)) {
          const fetchedClusters: ClusteredNewsEvent[] = data.clusters;
          setClusters(fetchedClusters);

          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("causalflow_clusters", JSON.stringify(fetchedClusters));
            } catch {}
          }

          if (qParam) {
            showToast(
              `✓ Clustered ${fetchedClusters.length} verified events for "${qParam}" across global feeds!`,
              "success"
            );
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch radar:", err);
        showToast("⚠️ Unable to reach live feeds. Check network connection.", "warning");
      } finally {
        setIsScanning(false);
      }
    },
    [searchQuery, showToast]
  );

  // Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Dark Mode
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

      // 2. Cached clusters
      const savedClusters = localStorage.getItem("causalflow_clusters");
      if (savedClusters) {
        try {
          const parsed = JSON.parse(savedClusters);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClusters(parsed);
          }
        } catch {}
      }

      // 3. Purge dead Vyce AI keys
      const savedKeys = localStorage.getItem("causalflow_api_keys");
      if (savedKeys) {
        try {
          const parsed = JSON.parse(savedKeys);
          if (
            (parsed.apiKey && parsed.apiKey.startsWith("sk-20b8")) ||
            (parsed.groqKey && parsed.groqKey.startsWith("sk-20b8")) ||
            parsed.provider === "vyce"
          ) {
            localStorage.removeItem("causalflow_api_keys");
          }
        } catch {}
      }
    }

    fetchRadar();
  }, [fetchRadar]);

  // Theme Toggle
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

  // Search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    fetchRadar(query);
  };

  // Refresh Today
  const handleRefreshToday = () => {
    setSearchQuery("");
    setSortMode("importance");
    setActiveCategory("all");
    fetchRadar("");
  };

  // Filter & Sort clusters
  const filteredAndSortedClusters = useMemo(() => {
    let result = [...clusters];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const inTitle = c.title.toLowerCase().includes(q);
        const inSummary = c.summary.toLowerCase().includes(q);
        const inOutlets = c.outlets.some((o) => o.toLowerCase().includes(q));
        const inRegions = c.regions.some((r) => r.toLowerCase().includes(q));
        return inTitle || inSummary || inOutlets || inRegions;
      });
    }

    // Sort Mode
    result.sort((a, b) => {
      switch (sortMode) {
        case "popularity":
        case "consensus": {
          const aPop = a.popularityScore ?? a.consensusScore * 10;
          const bPop = b.popularityScore ?? b.consensusScore * 10;
          if (bPop !== aPop) return bPop - aPop;
          if (b.outlets.length !== a.outlets.length) return b.outlets.length - a.outlets.length;
          return (b.recencyScore ?? 0) - (a.recencyScore ?? 0);
        }

        case "importance":
        case "sensitivity": {
          const aImp = a.importanceScore ?? a.sensitivityScore;
          const bImp = b.importanceScore ?? b.sensitivityScore;
          if (bImp !== aImp) return bImp - aImp;
          const aPop = a.popularityScore ?? a.consensusScore * 10;
          const bPop = b.popularityScore ?? b.consensusScore * 10;
          if (bPop !== aPop) return bPop - aPop;
          return (b.recencyScore ?? 0) - (a.recencyScore ?? 0);
        }

        case "latest":
        default:
          return (b.recencyScore ?? 0) - (a.recencyScore ?? 0);
      }
    });

    return result;
  }, [clusters, searchQuery, sortMode]);

  // Map 24 Sections with their filtered clusters
  const categorizedSections = useMemo(() => {
    const map = new Map<string, ClusteredNewsEvent[]>();

    for (const cluster of filteredAndSortedClusters) {
      const key = cluster.categoryKey || "world";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(cluster);
    }

    return EVENT_CATEGORIES.map((cat) => ({
      ...cat,
      clusters: map.get(cat.key) || [],
    }));
  }, [filteredAndSortedClusters]);

  // Global Master Summary Sheet Action (Requirement 2)
  const handleOpenAllSummaries = () => {
    setSummaryScope("ALL 24 SECTIONS");
    setSummarySectionMetas(EVENT_CATEGORIES);
    setIsSummaryModalOpen(true);
  };

  // Global Master .TXT Download Action (Requirement 2)
  const handleDownloadAllSummaries = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `causalflow-all-sections-summary-${dateStr}.txt`;
    const text = generateCompiledSummaryText({
      scope: "ALL 24 SECTIONS",
      sortMode:
        sortMode === "importance"
          ? "Weighted Importance (Impact)"
          : "Popularity (Consensus)",
      events: filteredAndSortedClusters,
      sectionMetas: EVENT_CATEGORIES,
    });
    downloadSummaryTextFile(text, filename);
    showToast("✓ Downloaded Master Summary across all 24 sections (.TXT)!", "success");
  };

  // Section Summary Action from Section Card
  const handleOpenSectionSummary = (meta: EventCategoryMeta) => {
    setSummaryScope(meta.label);
    setSummarySectionMetas([meta]);
    setIsSummaryModalOpen(true);
  };

  // Section .TXT Download Action from Section Card
  const handleDownloadSectionTxt = (meta: EventCategoryMeta) => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `causalflow-${meta.key}-summary-${dateStr}.txt`;
    const secClusters = filteredAndSortedClusters.filter((c) => c.categoryKey === meta.key);
    const text = generateCompiledSummaryText({
      scope: meta.label,
      sortMode:
        sortMode === "importance"
          ? "Weighted Importance (Impact)"
          : "Popularity (Consensus)",
      events: secClusters,
      sectionMetas: [meta],
    });
    downloadSummaryTextFile(text, filename);
    showToast(`✓ Downloaded ${meta.shortLabel} summary (.TXT)!`, "success");
  };

  // ACTION 1: Read Briefing Handler
  const handleSelectClusterForBriefing = async (cluster: ClusteredNewsEvent) => {
    setSelectedCluster(cluster);
    setCurrentView("reader");
    setReaderTab("briefing");
    setScriptText("");

    try {
      const res = await fetch(API_ENDPOINTS.briefing, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cluster }),
      });
      if (res.ok) {
        const data = await res.json();
        setBriefingPack(data);
      }
    } catch (e: any) {
      console.error("Briefing error:", e);
    }
  };

  // ACTION 2: Generate Pure Script Handler
  const handleSelectClusterForScript = (cluster: ClusteredNewsEvent) => {
    setSelectedCluster(cluster);
    setCurrentView("reader");
    setReaderTab("script");
    handleGenerateScript(cluster);
  };

  const handleGenerateScript = async (cluster: ClusteredNewsEvent) => {
    setIsGeneratingScript(true);
    setGenerationStep("Gathering verified dispatches & running AgentRouter gpt-5.6-sol...");

    try {
      const res = await fetch(API_ENDPOINTS.script, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cluster,
          pitch: cluster,
          format: "long",
          model: "gpt-5.6-sol",
        }),
      });

      const data = await res.json();

      if (data.success) {
        const pureScript =
          data.scriptText ||
          (data.sections || []).map((s: any) => s.narration).join("\n\n") ||
          "";

        setScriptText(pureScript);
        setScriptModel(data.model || "gpt-5.6-sol");
        setScriptProvider(data.provider || "AgentRouter");

        if (data.briefingPack) {
          setBriefingPack(data.briefingPack);
        }

        // Save to device library
        saveToLibrary(cluster, pureScript, data.wordCount, data.briefingPack);

        // Auto-Download script text
        if (typeof window !== "undefined") {
          const autoDownload = localStorage.getItem("causalflow_auto_download");
          if (autoDownload !== "false") {
            const rawTitle = cluster.title || "jimak-script";
            const slug = rawTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .slice(0, 45)
              .replace(/^-|-$/g, "");
            const dateStr = new Date().toISOString().slice(0, 10);
            const filename = `${slug}-${dateStr}-jimak-script.txt`;
            downloadSummaryTextFile(pureScript, filename);
            showToast("✓ Generated & downloaded script directly to device!", "success");
          } else {
            showToast("✓ Screenplay generated successfully!", "success");
          }
        }
      } else {
        showToast(
          `⚠️ Script generation failed: ${data.message || "Model error"}`,
          "warning"
        );
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      showToast("⚠️ Generation request failed. Please check network connection.", "warning");
    } finally {
      setIsGeneratingScript(false);
      setGenerationStep("");
    }
  };

  // ACTION 3: Saved History "Load" Button
  const handleLoadSavedScript = (entry: SavedScriptEntry) => {
    const existingCluster = clusters.find(
      (c) => c.id === entry.pitchId || c.title === entry.title
    );

    const clusterToUse: ClusteredNewsEvent = existingCluster || {
      id: entry.pitchId,
      title: entry.title,
      summary: entry.briefingPack?.articles?.[0]?.snippet || entry.title,
      categoryKey: "world",
      categoryLabel: entry.category,
      category: entry.category,
      primaryNiche: "all",
      sensitivityLabel: "Saved Screenplay",
      consensusBadge: "💾 Saved Library Entry",
      outlets: entry.verifiedSources?.map((s) => s.source) || ["Verified Wire"],
      regions: entry.verifiedSources?.map((s) => s.region) || ["Global"],
      consensusScore: 90,
      popularityScore: 90,
      importanceScore: 90,
      importanceGrade: "S-Tier",
      importanceLabel: "Saved Screenplay",
      recencyScore: Date.now(),
      timeAgo: entry.savedAt,
      sensitivityScore: 8,
      articles:
        entry.briefingPack?.articles?.map((a) => ({
          title: a.title,
          source: a.source,
          region: a.region || "Global",
          link: a.url,
          pubDate: a.pubDate || new Date().toISOString(),
          snippet: a.snippet || "",
        })) || [],
    };

    const scriptContent =
      entry.scriptText ||
      entry.fullVoiceover ||
      entry.sections?.map((s) => s.narration).join("\n\n") ||
      "";

    setSelectedCluster(clusterToUse);
    setScriptText(scriptContent);
    if (entry.briefingPack) {
      setBriefingPack(entry.briefingPack);
    }
    setCurrentView("reader");
    setReaderTab("script");
    showToast(`Loaded "${entry.title.slice(0, 36)}..." into Reader View`, "info");
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode ? "bg-[#06080F] text-white" : "bg-[#06080F] text-white"
      }`}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-[calc(100%-2rem)] p-4 rounded-2xl bg-[#0E131F] border border-blue-500/50 shadow-2xl shadow-blue-500/20 text-white text-xs sm:text-sm animate-in fade-in slide-in-from-top-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-950 text-blue-400 shrink-0 mt-0.5">
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <p className="font-medium leading-relaxed">{toastMessage.text}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Compiled Summary Sheet Modal (Global or Per-Section) */}
      <CompiledSummarySheetModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        scope={summaryScope}
        sortMode={
          sortMode === "importance"
            ? "Weighted Importance (Impact)"
            : "Popularity (Consensus)"
        }
        clusters={filteredAndSortedClusters}
        sectionMetas={summarySectionMetas}
        onSelectClusterForBriefing={handleSelectClusterForBriefing}
        onSelectClusterForScript={handleSelectClusterForScript}
      />

      {/* Settings Modal */}
      <ApiKeysModal
        isOpen={isApiKeysOpen}
        onClose={() => setIsApiKeysOpen(false)}
        onSaveKeys={() => {
          setIsApiKeysOpen(false);
          showToast("Saved API preferences", "success");
        }}
      />

      {/* ─────────────────────────────────────────────────────────────────────────────
          VIEW A: FULL-PAGE READER VIEW
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentView === "reader" ? (
        <FullPageReaderView
          cluster={selectedCluster}
          scriptText={scriptText}
          briefingPack={briefingPack}
          isGenerating={isGeneratingScript}
          generationStep={generationStep}
          modelName={scriptModel}
          providerName={scriptProvider}
          initialTab={readerTab}
          onBackToHomepage={() => setCurrentView("homepage")}
          onGenerateScript={handleGenerateScript}
          onLoadSavedScript={handleLoadSavedScript}
        />
      ) : (
        /* ─────────────────────────────────────────────────────────────────────────────
            VIEW B: 24-SECTION GRID WITH 1 PREVIEW HEADLINE EACH (NO ENDLESS SCROLLING)
        ───────────────────────────────────────────────────────────────────────────── */
        <>
          {/* Top Navbar */}
          <Navbar
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            onOpenApiKeys={() => setIsApiKeysOpen(true)}
            onScanNews={() => fetchRadar()}
            isScanning={isScanning}
            storyCount={filteredAndSortedClusters.length}
          />

          {/* Main Content Container */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-8">
            {/* Top Search Bar & Controls Bar with Master Summarizer (Requirement 2) */}
            <section className="w-full">
              <NewsSearchEngineBar
                searchQuery={searchQuery}
                onSearch={handleSearch}
                onRefreshToday={handleRefreshToday}
                isScanning={isScanning}
                activeNiche={activeCategory}
                onSelectNiche={(cat) => setActiveCategory(cat)}
                sortMode={sortMode}
                onSelectSortMode={(mode) => setSortMode(mode)}
                totalClustersCount={clusters.length}
                filteredClustersCount={filteredAndSortedClusters.length}
                onOpenAllSummaries={handleOpenAllSummaries}
                onDownloadAllSummaries={handleDownloadAllSummaries}
              />
            </section>

            {/* Scanning Status Banner */}
            {isScanning && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs font-mono text-blue-300">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-spin text-blue-400" />
                    <span>
                      Scraping &amp; clustering live feeds across 24 documentary sections from 11 verified news agencies...
                    </span>
                  </div>
                  <span className="font-bold text-emerald-400 animate-pulse">
                    $0 Token RSS Matrix
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StorySkeletonCard />
                  <StorySkeletonCard />
                  <StorySkeletonCard />
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isScanning && filteredAndSortedClusters.length === 0 && (
              <div className="p-12 text-center rounded-2xl bg-[#0E131F] border border-white/10 max-w-xl mx-auto">
                <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h4 className="text-base font-bold text-white mb-1">
                  No verified events match your current filter
                </h4>
                <p className="text-xs text-slate-400 mb-5">
                  Try searching a different keyword or click &quot;Today&apos;s Top Headlines (Refresh)&quot;.
                </p>
                <button
                  type="button"
                  onClick={handleRefreshToday}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
                >
                  Reset All Filters &amp; Reload Today
                </button>
              </div>
            )}

            {/* 24-SECTION GRID WITH 1 PREVIEW HEADLINE EACH (REQUIREMENT 2) */}
            {!isScanning && filteredAndSortedClusters.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      24 Documentary Intelligence Sections
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Showing #1 top-ranked preview headline per section. Click any section card to explore all stories.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenAllSummaries}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Summary Sheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadAllSummaries}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .TXT</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorizedSections.map((sec, idx) => (
                    <SectionPreviewCard
                      key={sec.key}
                      sectionIndex={idx}
                      meta={sec}
                      clusters={sec.clusters}
                      onOpenSectionSummary={handleOpenSectionSummary}
                      onDownloadSectionTxt={handleDownloadSectionTxt}
                      onSelectClusterForBriefing={handleSelectClusterForBriefing}
                      onSelectClusterForScript={handleSelectClusterForScript}
                    />
                  ))}
                </div>
              </section>
            )}
          </main>
        </>
      )}
    </div>
  );
}
