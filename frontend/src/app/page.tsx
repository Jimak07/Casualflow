"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { NewsSearchEngineBar } from "@/components/NewsSearchEngineBar";
import { IntelligenceNewsCard } from "@/components/IntelligenceNewsCard";
import { StorySkeletonCard } from "@/components/StorySkeletonCard";
import { FullPageReaderView } from "@/components/FullPageReaderView";
import { ApiKeysModal } from "@/components/ApiKeysModal";
import {
  ClusteredNewsEvent,
  BriefingPackData,
  SavedScriptEntry,
  SortMode,
  ApiKeysConfig,
  EventCategoryKey,
} from "@/types";
import { API_ENDPOINTS } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  X,
  CheckCircle2,
  Radio,
  Globe,
  ShieldAlert,
  TrendingUp,
  Zap,
  Cpu,
  RefreshCw,
  BookOpen,
} from "lucide-react";

const SECTIONS_CONFIG: {
  key: EventCategoryKey;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeClass: string;
  description: string;
}[] = [
  {
    key: "insecurity-wars",
    title: "1. Insecurity, Wars & Armed Conflicts",
    icon: ShieldAlert,
    accentColor: "text-red-400",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    description:
      "Active kinetic warfare, military strikes, missile defenses, insurgencies, and armed troop deployments.",
  },
  {
    key: "financials-markets",
    title: "2. Financials, Markets & Macro Economy",
    icon: TrendingUp,
    accentColor: "text-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    description:
      "Equities, bond yields, central bank rate decisions, debt cycles, inflation, and bank contagion.",
  },
  {
    key: "geopolitics-diplomacy",
    title: "3. Geopolitics, Diplomacy & Trade Chokepoints",
    icon: Globe,
    accentColor: "text-blue-400",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    description:
      "International treaties, diplomatic summits, bilateral sanctions, maritime chokepoints, and trade tariffs.",
  },
  {
    key: "energy-commodities",
    title: "4. Energy, Commodities & Cost of Living",
    icon: Zap,
    accentColor: "text-amber-400",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    description:
      "Crude oil, natural gas, agriculture, critical minerals, electricity grids, and household cost of living.",
  },
  {
    key: "tech-health",
    title: "5. Tech, AI & Global Health Crises",
    icon: Cpu,
    accentColor: "text-purple-400",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    description:
      "Artificial intelligence, semiconductor supply chains, cybersecurity breaches, and global health outbreaks.",
  },
];

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // View state: "homepage" | "reader"
  const [currentView, setCurrentView] = useState<"homepage" | "reader">("homepage");
  const [readerTab, setReaderTab] = useState<"script" | "briefing">("script");

  // Clustered News State
  const [clusters, setClusters] = useState<ClusteredNewsEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("popularity");
  const [isScanning, setIsScanning] = useState(false);

  // Reader View State
  const [selectedCluster, setSelectedCluster] = useState<ClusteredNewsEvent | null>(null);
  const [scriptText, setScriptText] = useState<string>("");
  const [briefingPack, setBriefingPack] = useState<BriefingPackData | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [scriptModel, setScriptModel] = useState<string>("gpt-5.6-sol");
  const [scriptProvider, setScriptProvider] = useState<string>("AgentRouter");

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

  // Helper to trigger browser file download
  const downloadFile = (content: string, filename: string, mimeType = "text/plain;charset=utf-8") => {
    if (typeof window === "undefined" || !content) return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
    if (query.trim()) {
      setSortMode("relevance");
    }
    fetchRadar(query);
  };

  // Refresh Today
  const handleRefreshToday = () => {
    setSearchQuery("");
    setSortMode("popularity");
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
          return (b.recencyScore ?? 0) - (a.recencyScore ?? 0);

        case "relevance":
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const aMatches =
              a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q);
            const bMatches =
              b.title.toLowerCase().includes(q) || b.summary.toLowerCase().includes(q);
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
          }
          return (
            (b.popularityScore ?? b.consensusScore * 10) -
            (a.popularityScore ?? a.consensusScore * 10)
          );

        default:
          return (
            (b.popularityScore ?? b.consensusScore * 10) -
            (a.popularityScore ?? a.consensusScore * 10)
          );
      }
    });

    return result;
  }, [clusters, searchQuery, sortMode]);

  // Group filtered clusters into the 5 sections
  const categorizedSections = useMemo(() => {
    return SECTIONS_CONFIG.map((sec) => {
      const secClusters = filteredAndSortedClusters.filter((c) => {
        if (c.categoryKey) {
          return c.categoryKey === sec.key;
        }
        // Fallback matching by primaryNiche
        if (sec.key === "insecurity-wars") return c.primaryNiche === "wars-conflicts";
        if (sec.key === "financials-markets") return c.primaryNiche === "macro-trade";
        if (sec.key === "tech-health") return c.primaryNiche === "ai-tech" || c.primaryNiche === "outbreaks-health";
        return true;
      });

      return {
        ...sec,
        clusters: secClusters,
      };
    });
  }, [filteredAndSortedClusters]);

  // ACTION 1: Read Full News Briefing
  const handleReadBriefing = async (cluster: ClusteredNewsEvent) => {
    setSelectedCluster(cluster);
    setCurrentView("reader");
    setReaderTab("briefing");

    // Check cached briefing
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(`causalflow_briefing_${cluster.id}`);
      if (cached) {
        try {
          setBriefingPack(JSON.parse(cached));
        } catch {}
      }

      const cachedScript = localStorage.getItem(`causalflow_script_text_${cluster.id}`);
      if (cachedScript) {
        setScriptText(cachedScript);
      } else {
        setScriptText("");
      }
    }

    // Fetch full news briefing from /api/briefing
    try {
      const res = await fetch(API_ENDPOINTS.briefing, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cluster }),
      });
      const data = await res.json();
      if (data && data.success) {
        setBriefingPack(data);
        if (typeof window !== "undefined") {
          localStorage.setItem(`causalflow_briefing_${cluster.id}`, JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Briefing pack fetch error:", err);
    }
  };

  // ACTION 2: Generate Pure Script
  const handleGenerateScript = async (cluster: ClusteredNewsEvent) => {
    setSelectedCluster(cluster);
    setCurrentView("reader");
    setReaderTab("script");
    setIsGeneratingScript(true);
    setGenerationStep("Gathering full-text article bodies and briefing pack...");

    let apiKey = "";
    let model = "";
    let provider = "";
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("causalflow_api_keys");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          apiKey = parsed.apiKey || parsed.groqKey || "";
          model = parsed.model || "";
          provider = parsed.provider || "";
        } catch {}
      }
    }

    try {
      setGenerationStep("Writing continuous Jimak documentary voiceover with AgentRouter...");
      const res = await fetch(API_ENDPOINTS.script, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cluster,
          format: "long",
          apiKey,
          model,
          provider,
        }),
      });

      const data = await res.json();

      if (data && data.success && data.scriptText) {
        const pureScript = data.scriptText;
        setScriptText(pureScript);
        setScriptModel(data.model || "gpt-5.6-sol");
        setScriptProvider(data.provider || "AgentRouter");

        if (data.briefingPack) {
          setBriefingPack(data.briefingPack);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              `causalflow_briefing_${cluster.id}`,
              JSON.stringify(data.briefingPack)
            );
          }
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(`causalflow_script_text_${cluster.id}`, pureScript);
        }

        // Save to device library
        saveToLibrary(cluster, pureScript, data.wordCount, data.briefingPack);

        // Direct device file save: Auto-Download like Ubuntu (Step 4)
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
            downloadFile(pureScript, filename, "text/plain;charset=utf-8");
            showToast("✓ Generated & downloaded script directly to device!", "success");
          } else {
            showToast("✓ Jimak Screenplay generated successfully!", "success");
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

  // ACTION 3: Fix Saved History "Load" Button (Step 3)
  const handleLoadSavedScript = (entry: SavedScriptEntry) => {
    const existingCluster = clusters.find(
      (c) => c.id === entry.pitchId || c.title === entry.title
    );

    const clusterToUse: ClusteredNewsEvent = existingCluster || {
      id: entry.pitchId,
      title: entry.title,
      summary: entry.briefingPack?.articles?.[0]?.snippet || entry.title,
      categoryKey: "geopolitics-diplomacy",
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
        isDarkMode
          ? "bg-[#06080F] text-white"
          : "bg-[#06080F] text-white"
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          VIEW A: FULL-PAGE READER VIEW (STEP 3)
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
            VIEW B: CATEGORIZED GLOBAL EVENT SUMMARIZER (STEP 2)
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
            {/* Top Search Bar & Controls */}
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
              />
            </section>

            {/* Scanning Status Banner */}
            {isScanning && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs font-mono text-blue-300">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-spin text-blue-400" />
                    <span>
                      Scraping & clustering live feeds across BBC, CNN, Reuters, Al Jazeera, AP, The Hindu, Punch, Bloomberg, SCMP, DW, France24...
                    </span>
                  </div>
                  <span className="font-bold text-emerald-400 animate-pulse">
                    $0 Token RSS Matrix
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StorySkeletonCard />
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
                  Reset All Filters & Reload Today
                </button>
              </div>
            )}

            {/* 5 CLEAR CATEGORIZED SECTIONS */}
            {!isScanning && filteredAndSortedClusters.length > 0 && (
              <div className="space-y-12">
                {categorizedSections
                  .filter((sec) => activeCategory === "all" || activeCategory === sec.key)
                  .map((sec) => {
                    const Icon = sec.icon;

                    if (sec.clusters.length === 0) {
                      if (activeCategory === sec.key) {
                        return (
                          <div
                            key={sec.key}
                            className="p-8 text-center rounded-2xl bg-[#0E131F] border border-white/10"
                          >
                            <p className="text-sm text-slate-400">
                              No stories currently clustered under {sec.title}.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }

                    return (
                      <section key={sec.key} className="space-y-4">
                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-[#0E131F] border border-white/10">
                              <Icon className={`w-5 h-5 ${sec.accentColor}`} />
                            </div>
                            <div>
                              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                                {sec.title}
                              </h2>
                              <p className="text-xs text-slate-400 hidden sm:block">
                                {sec.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${sec.badgeClass}`}
                            >
                              {sec.clusters.length} Verified Events
                            </span>
                          </div>
                        </div>

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {sec.clusters.map((cluster) => (
                            <IntelligenceNewsCard
                              key={cluster.id}
                              cluster={cluster}
                              sortMode={sortMode}
                              onReadBriefing={handleReadBriefing}
                              onGenerateScript={handleGenerateScript}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="border-t border-white/10 bg-[#06080F] py-6 px-4 sm:px-6 mt-16">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">CausalFlow</span>
                <span>•</span>
                <span>Ubuntu-Style News-to-Script Documentary Engine</span>
              </div>

              <div className="flex items-center gap-4 font-mono text-[11px]">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  $0 RSS Scraper
                </span>
                <span>•</span>
                <span className="text-blue-400">AgentRouter Engine</span>
              </div>
            </div>
          </footer>

          {/* Settings Modal */}
          <ApiKeysModal
            isOpen={isApiKeysOpen}
            onClose={() => setIsApiKeysOpen(false)}
            onSaveKeys={(_keys: ApiKeysConfig) => {
              showToast("✓ AgentRouter API Key saved locally!", "success");
            }}
          />
        </>
      )}
    </div>
  );
}
