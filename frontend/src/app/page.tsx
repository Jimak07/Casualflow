"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { NewsSearchEngineBar } from "@/components/NewsSearchEngineBar";
import { IntelligenceNewsCard } from "@/components/IntelligenceNewsCard";
import { StorySkeletonCard } from "@/components/StorySkeletonCard";
import { ScriptStudio } from "@/components/ScriptStudio";
import { ApiKeysModal } from "@/components/ApiKeysModal";
import {
  ClusteredNewsEvent,
  StoryPitch,
  ScriptSection,
  GeopoliticalNiche,
  SortMode,
  ApiKeysConfig,
} from "@/types";
import { API_ENDPOINTS } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  X,
  CheckCircle2,
  Radio,
  Globe2,
} from "lucide-react";

export default function Home() {
  // Theme state: dark mode by default
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Clustered News Engine State
  const [clusters, setClusters] = useState<ClusteredNewsEvent[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeNiche, setActiveNiche] = useState<GeopoliticalNiche>("all");
  const [sortMode, setSortMode] = useState<SortMode>("popularity");

  // Script Studio Selected Story
  const [selectedStory, setSelectedStory] = useState<StoryPitch | null>(null);

  // Loading state (No LLM required to load news!)
  const [isScanning, setIsScanning] = useState(false);
  const [isBuildingStoryline, setIsBuildingStoryline] = useState(false);
  const [totalHeadlinesCount, setTotalHeadlinesCount] = useState<number>(0);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "info" | "success" | "warning";
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Settings Modal
  const [isApiKeysOpen, setIsApiKeysOpen] = useState(false);

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

  // Convert a ClusteredNewsEvent into a complete StoryPitch for ScriptStudio
  const mapClusterToPitch = useCallback((cluster: ClusteredNewsEvent): StoryPitch => {
    const nicheLabels: Record<GeopoliticalNiche, string> = {
      all: "Global Geopolitics",
      "wars-conflicts": "Wars & Conflicts",
      "outbreaks-health": "Outbreaks & Bio-Health",
      "ai-tech": "AI & Tech Geopolitics",
      "macro-trade": "Global Macro & Trade",
    };

    const category = nicheLabels[cluster.primaryNiche] || "Global Geopolitics";
    const impactScore = cluster.importanceScore ?? Math.min(Math.max(cluster.consensusScore * 7, 78), 99);

    const verifiedSources = cluster.articles.map((art) => ({
      title: art.title,
      source: art.source,
      region: art.region,
      link: art.link,
      pubDate: art.pubDate,
      snippet: art.snippet,
    }));

    return {
      id: `cluster-pitch-${cluster.id}`,
      title: cluster.title,
      subtitle: cluster.summary,
      category,
      estimatedRuntime: "13m 30s (~2,000 words)",
      wordCount: 2000,
      targetFormat: "YouTube Deep Dive / Investigative Documentary",
      date: cluster.timeAgo,
      impactScore,
      badge: cluster.consensusBadge,
      consensusBadge: cluster.consensusBadge,
      regionsReporting: cluster.regions,
      searchQueries: [
        cluster.title,
        ...(cluster.outlets.slice(0, 2)),
      ],
      historyShort: "Geopolitical Precedents & Strategic Mirror",
      verifiedSources,
      sourceCatalyst: {
        outlet: cluster.outlets[0] || "Global Wire Matrix",
        timeAgo: cluster.timeAgo,
        headline: cluster.title,
      },
      nodes: {
        macroTrigger: {
          title: "1. The Breaking Event & Developing Timeline",
          date: cluster.timeAgo,
          description: cluster.summary,
          baselineOrigin: `Verified across ${cluster.regions.join(", ")}`,
          breakingUpdate: cluster.title,
          outletsReporting: `${cluster.outlets.length} Outlets: ${cluster.outlets.slice(0, 4).join(", ")}`,
          metricTag: cluster.importanceLabel || cluster.sensitivityLabel,
          source: cluster.outlets.slice(0, 3).join(", "),
        },
        historicalParallel: {
          title: "2. Historical Parallel & Strategic Mirror",
          period: "Historical Mirror (Tavily Precedent)",
          description:
            "Strategic historical parallels and chokepoint escalations will be retrieved and analyzed via AI in Script Studio.",
          similarityScore: `${cluster.popularityScore ?? Math.min(cluster.consensusScore * 8, 95)}% Structural Match`,
          lesson:
            "Diplomatic maneuvers, supply bottlenecks, and kinetic leverage follow recurring historical precedents.",
        },
        humanImpact: {
          title: "3. Everyday Human Impact & Global Repercussions",
          affectedGroup: "Civilians, Supply Chains & Global Households",
          description:
            "Downstream consumer consequences, supply disruptions, and ground-level inflationary impacts.",
          dollarOrPriceMetric: (cluster.importanceGrade === "S-Tier" || cluster.sensitivityLabel.includes("High"))
            ? "High Kinetic / Macro Impact"
            : "Strategic Shift",
          actionableTakeaway:
            "Monitor ongoing verification from independent international feeds and audit downstream trade exposure.",
        },
      },
      script: {
        sections: [],
      },
    };
  }, []);

  // Fetch /api/radar with pure algorithmic clustering (NO LLM required!)
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
          setTotalHeadlinesCount(data.headlines?.length || fetchedClusters.length * 2);

          if (fetchedClusters.length > 0) {
            setSelectedClusterId(fetchedClusters[0].id);
            // Default selected story for Script Studio
            setSelectedStory((prev) => prev || mapClusterToPitch(fetchedClusters[0]));
          }

          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(
                "causalflow_clusters",
                JSON.stringify(fetchedClusters)
              );
            } catch (e) {
              console.error("Failed to cache clusters", e);
            }
          }

          if (qParam) {
            showToast(
              `✓ Clustered ${fetchedClusters.length} consensus events for "${qParam}" across global feeds!`,
              "success"
            );
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch radar:", err);
        showToast(
          "⚠️ Unable to reach live feeds. Check your network connection.",
          "warning"
        );
      } finally {
        setIsScanning(false);
      }
    },
    [searchQuery, mapClusterToPitch, showToast]
  );

  // Initialize on mount: load theme, cached clusters, then fetch live radar
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Theme
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

      // 2. Cached Clusters
      const savedClusters = localStorage.getItem("causalflow_clusters");
      if (savedClusters) {
        try {
          const parsed = JSON.parse(savedClusters);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClusters(parsed);
            setSelectedClusterId(parsed[0].id);
            setSelectedStory(mapClusterToPitch(parsed[0]));
          }
        } catch (e) {
          console.error("Failed to parse cached clusters", e);
        }
      }
    }

    // Automatically load today's breaking global stories immediately on open
    fetchRadar();
  }, [fetchRadar, mapClusterToPitch]);

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

  // Handle Search submit
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setSortMode("relevance");
    }
    fetchRadar(query);
  };

  // Handle Refresh Today's Top Headlines
  const handleRefreshToday = () => {
    setSearchQuery("");
    setSortMode("popularity");
    setActiveNiche("all");
    fetchRadar("");
  };

  // Filter & Sort clusters based on active niche and sortMode
  const filteredAndSortedClusters = useMemo(() => {
    let result = [...clusters];

    // 1. Geopolitical Niche Filter
    if (activeNiche !== "all") {
      result = result.filter((c) => c.primaryNiche === activeNiche);
    }

    // 2. Local search query filter (in case user typed extra terms before searching or during filter)
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

    // 3. Sort Mode
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
          return (b.popularityScore ?? b.consensusScore * 10) - (a.popularityScore ?? a.consensusScore * 10);

        default:
          return (b.popularityScore ?? b.consensusScore * 10) - (a.popularityScore ?? a.consensusScore * 10);
      }
    });

    return result;
  }, [clusters, activeNiche, searchQuery, sortMode]);

  // Handle "Build Documentary Storyline →" (2-Step Intelligence Pipeline)
  const handleBuildStoryline = async (cluster: ClusteredNewsEvent) => {
    const pitch = mapClusterToPitch(cluster);
    setSelectedStory(pitch);
    setSelectedClusterId(cluster.id);

    // Switch view to Script Studio immediately on both mobile and desktop
    setMobileActiveTab("studio");

    // Scroll to studio column smoothly
    if (typeof window !== "undefined") {
      const studioEl = document.getElementById("script-studio-panel");
      if (studioEl) {
        studioEl.scrollIntoView({ behavior: "smooth" });
      }
    }

    // Retrieve user's API key from localStorage
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

    setIsBuildingStoryline(true);
    showToast(
      `Building Storyline Map & Economics Explained Script for "${cluster.title.slice(0, 36)}..."`,
      "info"
    );

    try {
      const res = await fetch(API_ENDPOINTS.storyline, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cluster,
          apiKey: groqKey,
          groqKey,
          tavilyKey,
          model,
          provider,
        }),
      });

      const data = await res.json();
      if (data && data.success) {
        const updatedPitch: StoryPitch = {
          ...pitch,
          storylineMap: data.storylineMap,
          verifiedSources: data.verifiedSources || pitch.verifiedSources,
          evidencePack: data.evidencePack,
          script: {
            sections: data.scriptSections,
          },
        };
        setSelectedStory(updatedPitch);
        localStorage.setItem(`causalflow_script_${updatedPitch.id}`, JSON.stringify(data.scriptSections));
        localStorage.setItem(`causalflow_storyline_${updatedPitch.id}`, JSON.stringify(data.storylineMap));

        showToast(
          data.isFallback
            ? `✓ Built Storyline Map & 5-Act Script via Consensus Engine!`
            : `✓ Built 3-Part Storyline Map & Economics Explained Script via ${data.model || "AI"}!`,
          "success"
        );
      }
    } catch (err: any) {
      console.error("Failed to build storyline:", err);
      showToast(
        "Loaded cluster into Studio. You can generate or edit the script directly.",
        "info"
      );
    } finally {
      setIsBuildingStoryline(false);
    }
  };

  // Update story script from ScriptStudio edits
  const handleUpdateStoryScript = (
    storyId: string,
    updatedSections: ScriptSection[]
  ) => {
    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory({
        ...selectedStory,
        script: {
          ...selectedStory.script,
          sections: updatedSections,
        },
      });
    }
  };

  // Reset script in ScriptStudio
  const handleResetStoryScript = (_storyId: string) => {
    if (selectedStory) {
      const activeCluster = clusters.find(
        (c) => `cluster-pitch-${c.id}` === selectedStory.id
      );
      if (activeCluster) {
        setSelectedStory(mapClusterToPitch(activeCluster));
      }
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode
          ? "bg-[#06080F] text-white radar-ambient-glow-dark"
          : "bg-[#F8FAFC] text-slate-900 radar-ambient-glow-light"
      }`}
    >
      {/* Toast Notification Banner */}
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
        onScanNews={() => fetchRadar()}
        isScanning={isScanning}
        mobileActiveTab={mobileActiveTab}
        onTabChange={(tab) => setMobileActiveTab(tab)}
        storyCount={filteredAndSortedClusters.length}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col gap-6">
        {/* 2. REAL-TIME SEARCH ENGINE BAR & CONTROL BARS */}
        <section className="w-full">
          <NewsSearchEngineBar
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onRefreshToday={handleRefreshToday}
            isScanning={isScanning}
            activeNiche={activeNiche}
            onSelectNiche={(niche) => setActiveNiche(niche)}
            sortMode={sortMode}
            onSelectSortMode={(mode) => setSortMode(mode)}
            totalClustersCount={clusters.length}
            filteredClustersCount={filteredAndSortedClusters.length}
          />
        </section>

        {/* 3. SPLIT VIEW: REAL-TIME RADAR (LEFT) vs. SCRIPT STUDIO (RIGHT) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Real-Time Geopolitical Consensus Radar */}
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
                  Geopolitical Consensus Radar
                </h2>
              </div>

              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {isScanning
                  ? "Scraping 20+ feeds..."
                  : `${filteredAndSortedClusters.length} verified events`}
              </span>
            </div>

            {/* Scanning Ingestion Status Banner */}
            {isScanning && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs font-mono text-blue-700 dark:text-blue-300">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-spin text-blue-500" />
                    <span>
                      Scraping & clustering live feeds across BBC, CNN, Al Jazeera, Reuters, SCMP, Punch NG...
                    </span>
                  </div>
                  <span className="animate-pulse font-bold text-emerald-500">$0 Token RSS</span>
                </div>
                <StorySkeletonCard />
                <StorySkeletonCard />
                <StorySkeletonCard />
              </div>
            )}

            {/* Empty State */}
            {!isScanning && filteredAndSortedClusters.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  No verified events match this niche or keyword
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Try searching a different keyword or click &quot;Today&apos;s Top Headlines (Refresh)&quot;.
                </p>
                <button
                  onClick={handleRefreshToday}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                >
                  Reset All Filters & Reload Today
                </button>
              </div>
            )}

            {/* List of Redesigned IntelligenceNewsCard Components */}
            {!isScanning && filteredAndSortedClusters.length > 0 && (
              <div className="space-y-4">
                {filteredAndSortedClusters.map((cluster) => (
                  <IntelligenceNewsCard
                    key={cluster.id}
                    cluster={cluster}
                    isSelected={selectedClusterId === cluster.id}
                    onSelect={(cl) => {
                      setSelectedClusterId(cl.id);
                      setSelectedStory(mapClusterToPitch(cl));
                      if (window.innerWidth < 1024) {
                        setMobileActiveTab("studio");
                      }
                    }}
                    onBuildStoryline={handleBuildStoryline}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Block-Based Documentary Script Studio */}
          <div
            id="script-studio-panel"
            className={`lg:col-span-7 h-full min-h-[600px] lg:sticky lg:top-20 ${
              mobileActiveTab === "studio" ? "block" : "hidden lg:block"
            }`}
          >
            <ScriptStudio
              selectedStory={selectedStory}
              onUpdateStoryScript={handleUpdateStoryScript}
              onResetStoryScript={handleResetStoryScript}
              onOpenApiKeys={() => setIsApiKeysOpen(true)}
              isBuildingStoryline={isBuildingStoryline}
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
            <span>Real-Time Geopolitical Consensus Engine</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              $0 News Ingestion (Pure RSS)
            </span>
            <span>•</span>
            <span>Universal AI Compatible</span>
          </div>
        </div>
      </footer>

      {/* SETTINGS MODAL */}
      <ApiKeysModal
        isOpen={isApiKeysOpen}
        onClose={() => setIsApiKeysOpen(false)}
        onSaveKeys={(_keys: ApiKeysConfig) => {
          showToast("✓ API Key saved locally! Ready for Script Studio generation.", "success");
        }}
      />
    </div>
  );
}
