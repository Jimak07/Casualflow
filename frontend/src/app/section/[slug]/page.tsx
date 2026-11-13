"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ClusteredNewsEvent,
  EventCategoryMeta,
  EVENT_CATEGORIES,
  BriefingPackData,
  SavedScriptEntry,
  SortMode,
} from "@/types";
import { API_ENDPOINTS } from "@/lib/api";
import {
  generateCompiledSummaryText,
  downloadSummaryTextFile,
} from "@/lib/summaryGenerator";
import { IntelligenceNewsCard } from "@/components/IntelligenceNewsCard";
import { FullPageReaderView } from "@/components/FullPageReaderView";
import { CompiledSummarySheetModal } from "@/components/CompiledSummarySheetModal";
import { StorySkeletonCard } from "@/components/StorySkeletonCard";
import {
  ArrowLeft,
  FileText,
  Download,
  Flame,
  Radio,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Globe,
  ShieldAlert,
  TrendingUp,
  Landmark,
  Zap,
  Anchor,
  Cpu,
  Scale,
  Wheat,
  Gem,
  DollarSign,
  Compass,
  Layers,
  Navigation,
  Building,
  MapPin,
  Activity,
  ShieldCheck,
  Users,
  Workflow,
  Droplets,
  Briefcase,
  Plane,
  Home as HomeIcon,
} from "lucide-react";

// Icon mapping for all 24 documentary sections
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  ShieldAlert,
  TrendingUp,
  Landmark,
  Zap,
  Anchor,
  Cpu,
  Scale,
  Wheat,
  Gem,
  DollarSign,
  Compass,
  Layers,
  Navigation,
  Building,
  MapPin,
  Activity,
  ShieldCheck,
  Users,
  Workflow,
  Droplets,
  Briefcase,
  Plane,
  Home: HomeIcon,
};

function SectionPageContent() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "world";

  // Match section meta
  const sectionMeta = useMemo(() => {
    return (
      EVENT_CATEGORIES.find((s) => s.key === slug) || {
        key: slug as any,
        label: slug.replace(/-/g, " ").toUpperCase(),
        shortLabel: slug,
        icon: "Globe",
        description: `Verified intelligence dispatches for ${slug}`,
      }
    );
  }, [slug]);

  const IconComponent = ICON_MAP[sectionMeta.icon] || Globe;

  // State
  const [allClusters, setAllClusters] = useState<ClusteredNewsEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sortMode, setSortMode] = useState<SortMode>("importance");

  // Summary Sheet Modal
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Reader View State
  const [currentView, setCurrentView] = useState<"section" | "reader">("section");
  const [readerTab, setReaderTab] = useState<"script" | "briefing">("briefing");
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

  const showToast = (text: string, type: "info" | "success" | "warning" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch live clusters
  const fetchRadar = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.radar);
      if (res.ok) {
        const data = await res.json();
        const incoming = (data.clusters || []) as ClusteredNewsEvent[];
        setAllClusters(incoming);
        if (typeof window !== "undefined") {
          localStorage.setItem("causalflow_clusters_cache", JSON.stringify(incoming));
        }
      }
    } catch (e: any) {
      console.error("Failed to fetch radar:", e);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("causalflow_clusters_cache");
        if (cached) {
          try {
            setAllClusters(JSON.parse(cached));
          } catch {}
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check localStorage cache first for fast render
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("causalflow_clusters_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAllClusters(parsed);
            setIsLoading(false);
          }
        } catch {}
      }
    }
    fetchRadar();
  }, [slug]);

  // Filter clusters strictly for this section and apply sortMode
  const sectionClusters = useMemo(() => {
    const filtered = allClusters.filter((c) => c.categoryKey === slug);

    return filtered.sort((a, b) => {
      if (sortMode === "popularity") {
        if (b.popularityScore !== a.popularityScore) {
          return b.popularityScore - a.popularityScore;
        }
        return b.importanceScore - a.importanceScore;
      }
      // default: importance
      if (b.importanceScore !== a.importanceScore) {
        return b.importanceScore - a.importanceScore;
      }
      return b.popularityScore - a.popularityScore;
    });
  }, [allClusters, slug, sortMode]);

  // Single Section .TXT Download
  const handleDownloadSectionTxt = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `causalflow-${slug}-summary-${dateStr}.txt`;
    const text = generateCompiledSummaryText({
      scope: sectionMeta.label,
      sortMode:
        sortMode === "importance"
          ? "Weighted Importance (Impact)"
          : "Popularity (Consensus)",
      events: sectionClusters,
      sectionMetas: [sectionMeta],
    });
    downloadSummaryTextFile(text, filename);
    showToast(`✓ Downloaded ${sectionMeta.shortLabel} summary .TXT!`, "success");
  };

  // Briefing action
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

  // Script action
  const handleSelectClusterForScript = (cluster: ClusteredNewsEvent) => {
    setSelectedCluster(cluster);
    setCurrentView("reader");
    setReaderTab("script");
    handleGenerateScript(cluster);
  };

  // Generate Script Handler
  const handleGenerateScript = async (cluster: ClusteredNewsEvent) => {
    setIsGeneratingScript(true);
    setGenerationStep("Scraping full articles and historical context...");

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

        // Auto-download .TXT
        if (typeof window !== "undefined") {
          const autoDownload = localStorage.getItem("causalflow_auto_download");
          if (autoDownload !== "false") {
            const rawTitle = cluster.title || "jimak-script";
            const fileSlug = rawTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .slice(0, 45)
              .replace(/^-|-$/g, "");
            const dateStr = new Date().toISOString().slice(0, 10);
            const filename = `${fileSlug}-${dateStr}-jimak-script.txt`;
            downloadSummaryTextFile(pureScript, filename);
            showToast("✓ Generated & downloaded script directly to device!", "success");
          } else {
            showToast("✓ Screenplay generated successfully!", "success");
          }
        }
      } else {
        showToast(`⚠️ Generation failed: ${data.message || "Model error"}`, "warning");
      }
    } catch (e: any) {
      console.error("Generation error:", e);
      showToast("⚠️ Generation request failed. Please check network connection.", "warning");
    } finally {
      setIsGeneratingScript(false);
      setGenerationStep("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#06080F] text-white">
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

      {/* Compiled Summary Sheet Modal */}
      <CompiledSummarySheetModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        scope={sectionMeta.label}
        sortMode={
          sortMode === "importance"
            ? "Weighted Importance (Impact)"
            : "Popularity (Consensus)"
        }
        clusters={sectionClusters}
        sectionMetas={[sectionMeta]}
        onSelectClusterForBriefing={handleSelectClusterForBriefing}
        onSelectClusterForScript={handleSelectClusterForScript}
      />

      {/* Reader View or Section View */}
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
          onBackToHomepage={() => setCurrentView("section")}
          onGenerateScript={handleGenerateScript}
          onLoadSavedScript={(entry: SavedScriptEntry) => {
            setScriptText(entry.scriptText || entry.fullVoiceover || "");
            if (entry.briefingPack) setBriefingPack(entry.briefingPack);
            setReaderTab("script");
          }}
        />
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
          {/* Top Navigation & Back Button */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Back to All 24 Sections</span>
            </Link>

            {/* Popularity vs Weighted Importance Sort Toggle */}
            <div className="flex items-center p-1 rounded-2xl bg-[#0E131F] border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setSortMode("importance")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                  sortMode === "importance"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Weighted Importance</span>
              </button>
              <button
                type="button"
                onClick={() => setSortMode("popularity")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                  sortMode === "popularity"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Popularity (Consensus)</span>
              </button>
            </div>
          </div>

          {/* Section Hero Header Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0E131F] border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 shrink-0">
                <IconComponent className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {sectionMeta.label}
                  </h1>
                  <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {sectionClusters.length} Verified Stories
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {sectionMeta.description}
                </p>
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-4 py-2 rounded-2xl bg-[#06080F] border border-white/5 text-right">
                <span className="text-[10px] font-mono text-slate-400 block">
                  Sort Criterion
                </span>
                <span className="text-xs font-bold text-blue-400 capitalize">
                  {sortMode === "importance" ? "Impact Score" : "Outlet Count"}
                </span>
              </div>
            </div>
          </div>

          {/* Section Summarizer Bar (Requirement 3) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-[#0E131F] to-blue-950/60 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-blue-950/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Documentary Section Intelligence Summarizer
                </span>
                <span className="text-[11px] text-slate-400">
                  Compile or download all {sectionClusters.length} headlines in {sectionMeta.shortLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Button A: Click to get summary */}
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>📋 Click to get summary of all news headlines in {sectionMeta.shortLabel}</span>
              </button>

              {/* Button B: Download Section (.TXT) */}
              <button
                type="button"
                onClick={handleDownloadSectionTxt}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>💾 Download {sectionMeta.shortLabel} Summary (.TXT)</span>
              </button>
            </div>
          </div>

          {/* Stories List / Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StorySkeletonCard />
              <StorySkeletonCard />
              <StorySkeletonCard />
              <StorySkeletonCard />
            </div>
          ) : sectionClusters.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0E131F] border border-white/10 max-w-xl mx-auto space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-white">
                No active breaking dispatches in this section
              </h3>
              <p className="text-xs text-slate-400">
                The global wire is monitoring 11 premier news agencies. New dispatches will automatically appear once verified across multiple sources.
              </p>
              <button
                type="button"
                onClick={fetchRadar}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
              >
                Refresh Wire Feeds
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sectionClusters.map((cluster) => (
                <IntelligenceNewsCard
                  key={cluster.id}
                  cluster={cluster}
                  sortMode={sortMode}
                  onReadBriefing={handleSelectClusterForBriefing}
                  onGenerateScript={handleSelectClusterForScript}
                />
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default function SectionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#06080F] text-white">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#0E131F] border border-white/10 text-xs font-mono text-slate-300">
            <Radio className="w-4 h-4 animate-spin text-blue-400" />
            <span>Loading Documentary Intelligence Section...</span>
          </div>
        </div>
      }
    >
      <SectionPageContent />
    </Suspense>
  );
}
