"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  ExternalLink,
  Clock,
  Globe,
  Radio,
  History,
  Trash2,
  Calendar,
  DollarSign,
  Quote,
  CheckCircle2,
  RefreshCw,
  FileText,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  X,
} from "lucide-react";
import {
  ClusteredNewsEvent,
  BriefingPackData,
  SavedScriptEntry,
} from "@/types";

interface FullPageReaderViewProps {
  cluster: ClusteredNewsEvent | null;
  scriptText: string;
  briefingPack: BriefingPackData | null;
  isGenerating: boolean;
  generationStep?: string;
  modelName?: string;
  providerName?: string;
  initialTab?: "script" | "briefing";
  onBackToHomepage: () => void;
  onGenerateScript: (cluster: ClusteredNewsEvent) => void;
  onLoadSavedScript: (entry: SavedScriptEntry) => void;
}

interface ParsedDossierSection {
  number: string;
  title: string;
  badge: string;
  paragraphs: string[];
}

function parseDossierSections(text: string): ParsedDossierSection[] {
  if (!text) return [];

  const rawBlocks = text.split(/(?=^#{1,3}\s+)/m);
  const sections: ParsedDossierSection[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n");
    const headerLine = lines[0] || "";
    const headerMatch = headerLine.match(/^#{1,3}\s+(?:(\d+)\.?\s*)?(.*)$/);

    if (headerMatch) {
      const num = headerMatch[1] || `${sections.length + 1}`;
      const title = headerMatch[2].trim();
      const bodyLines = lines.slice(1).join("\n").trim();
      const paragraphs = bodyLines
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

      let badge = "Section Analysis";
      const tLower = title.toLowerCase();
      if (tLower.includes("overview")) badge = "Core Event & Outcomes";
      else if (tLower.includes("fact") || tLower.includes("quote")) badge = "Ground-Truth Evidence & Data";
      else if (tLower.includes("historical") || tLower.includes("context") || tLower.includes("got here")) badge = "Strategic Precedents & History";
      else if (tLower.includes("implication") || tLower.includes("geopolitical") || tLower.includes("economic")) badge = "Geopolitical & Market Impact";

      sections.push({
        number: num,
        title,
        badge,
        paragraphs,
      });
    } else {
      const paragraphs = trimmed
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (sections.length > 0) {
        sections[sections.length - 1].paragraphs.push(...paragraphs);
      } else {
        sections.push({
          number: "1",
          title: "Executive Overview",
          badge: "Core Event & Outcomes",
          paragraphs,
        });
      }
    }
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({
      number: "1",
      title: "Deep Intelligence Dossier",
      badge: "Comprehensive Analysis",
      paragraphs: text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
    });
  }

  return sections;
}

export const FullPageReaderView: React.FC<FullPageReaderViewProps> = ({
  cluster,
  scriptText,
  briefingPack,
  isGenerating,
  generationStep = "",
  modelName = "gpt-5.6-sol",
  providerName = "AgentRouter",
  onBackToHomepage,
  onGenerateScript,
  onLoadSavedScript,
}) => {
  const [copied, setCopied] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [savedLibrary, setSavedLibrary] = useState<SavedScriptEntry[]>([]);
  const [expandedArticles, setExpandedArticles] = useState<Record<number, boolean>>({});

  // Auto-generate dossier if not present when opened
  useEffect(() => {
    if (!scriptText && !isGenerating && cluster) {
      onGenerateScript(cluster);
    }
  }, [cluster, scriptText, isGenerating, onGenerateScript]);

  // Load Saved History from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLib = localStorage.getItem("causalflow_saved_library");
      if (storedLib) {
        try {
          const parsed = JSON.parse(storedLib);
          if (Array.isArray(parsed)) {
            setSavedLibrary(parsed);
          }
        } catch {}
      }
    }
  }, []);

  // Helper to generate filename slug
  const getFileSlug = useCallback(() => {
    const rawTitle = cluster?.title || "intelligence-dossier";
    const slug = rawTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50)
      .replace(/^-|-$/g, "");
    return `${slug}-briefing`;
  }, [cluster?.title]);

  // Download File Helper
  const triggerDownload = useCallback((content: string, filename: string, mimeType: string) => {
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
  }, []);

  // Complete Dossier Export Text (Dossier + Verified Source URLs)
  const getDossierExportText = useCallback(() => {
    const content = scriptText || "";
    const title = cluster?.title || "Deep Intelligence Dossier";
    const category = cluster?.category || cluster?.categoryLabel || "Geopolitics & Strategic Affairs";
    const dateStr = new Date().toLocaleDateString("en-US", { dateStyle: "full" });

    const rawArticles = briefingPack?.articles || cluster?.articles || [];
    const sourcesList = rawArticles
      .map((art: any) => `- ${art.source || "Verified Source"}: ${art.url || art.link || ""}`)
      .filter((line: string) => !line.endsWith(": "))
      .join("\n");

    return `================================================================================
CAUSALFLOW // DEEP FACTUAL INTELLIGENCE DOSSIER
TOPIC: ${title}
CATEGORY: ${category}
DATE: ${dateStr}
ENGINE: ${providerName} (${modelName})
================================================================================

${content}

================================================================================
VERIFIED PRIMARY SOURCES:
================================================================================
${sourcesList || "Verified global wire services and reporting networks."}
`;
  }, [scriptText, cluster, briefingPack, providerName, modelName]);

  // Download .TXT: [Title-Slug]-briefing.txt
  const handleDownloadTxt = () => {
    if (!scriptText) return;
    const filename = `${getFileSlug()}.txt`;
    triggerDownload(getDossierExportText(), filename, "text/plain;charset=utf-8");
  };

  // Download .MD
  const handleDownloadMd = () => {
    if (!scriptText) return;
    const title = cluster?.title || "Deep Intelligence Dossier";
    const category = cluster?.category || cluster?.categoryLabel || "Geopolitics";
    const date = new Date().toLocaleDateString("en-US", { dateStyle: "full" });

    const rawArticles = briefingPack?.articles || cluster?.articles || [];
    const sourcesList = rawArticles
      .map((art: any) => `- **${art.source || "Source"}**: [${art.title || "Article Link"}](${art.url || art.link || ""})`)
      .filter((line: string) => !line.endsWith("()"))
      .join("\n");

    const mdContent = `# ${title}
**Category:** ${category} | **Date:** ${date} | **Engine:** ${providerName} (${modelName})

---

${scriptText}

---

## Verified Primary Sources
${sourcesList || "Verified global reporting dispatches."}

*Generated by CausalFlow Deep Intelligence Briefing Engine*
`;
    const filename = `${getFileSlug()}.md`;
    triggerDownload(mdContent, filename, "text/markdown;charset=utf-8");
  };

  // 1-Click Copy Full Dossier + Sources
  const handleCopy = async () => {
    const textToCopy = getDossierExportText();
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Delete saved history item
  const handleDeleteSavedItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedLibrary.filter((item) => item.id !== id);
    setSavedLibrary(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("causalflow_saved_library", JSON.stringify(updated));
    }
  };

  // Word count & read time
  const wordCount = useMemo(() => {
    if (!scriptText) return 0;
    return scriptText.trim().split(/\s+/).filter(Boolean).length;
  }, [scriptText]);

  const estimatedMinutes = Math.max(1, Math.round(wordCount / 220));

  // Parse sections
  const dossierSections = useMemo(() => {
    return parseDossierSections(scriptText);
  }, [scriptText]);

  // Verified scraped articles
  const verifiedArticles = useMemo(() => {
    return briefingPack?.articles || cluster?.articles || [];
  }, [briefingPack?.articles, cluster?.articles]);

  const toggleExpandArticle = (idx: number) => {
    setExpandedArticles((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <div className="min-h-screen bg-[#06080F] text-slate-100 flex flex-col selection:bg-blue-600/30">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. TOP NAVIGATION & ACTION BAR
      ───────────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#06080F]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back Button & Title Badge */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHomepage}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Global Events</span>
          </button>

          <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold hidden sm:inline-block px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
            {cluster?.category || cluster?.categoryLabel || "Global Intelligence"}
          </span>
        </div>

        {/* Center: Live Word Count & Model Engine Badges */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600/15 text-blue-300 border border-blue-500/30 font-mono text-xs font-bold">
            <Radio className="w-3 h-3 text-blue-400" />
            <span>
              {providerName} • {modelName}
            </span>
          </span>

          {wordCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-bold shadow-sm shadow-emerald-500/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {wordCount} words • ~{estimatedMinutes}m read
              </span>
            </span>
          ) : isGenerating ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono text-xs animate-pulse">
              <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
              <span>Synthesizing Dossier...</span>
            </span>
          ) : null}
        </div>

        {/* Right: Primary Action Buttons (Copy Text, Download .TXT, Download .MD, Library) */}
        <div className="flex items-center gap-2">
          {/* Copy Full Text */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!scriptText && !isGenerating}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              copied
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "bg-white/10 hover:bg-white/15 text-white border border-white/15 active:scale-95"
            }`}
            title="Copy entire 800-1,000 word dossier + verified sources to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied Dossier!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          {/* Download .TXT */}
          <button
            type="button"
            onClick={handleDownloadTxt}
            disabled={!scriptText}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 shadow-md shadow-blue-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            title="Download complete dossier + sources as clean .txt file"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Download .TXT</span>
          </button>

          {/* Download .MD */}
          <button
            type="button"
            onClick={handleDownloadMd}
            disabled={!scriptText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all hidden md:inline-flex"
            title="Download formatted Markdown file"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>.MD</span>
          </button>

          {/* Saved History Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="View saved dossiers on this device"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Saved Library</span>
            {savedLibrary.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
                {savedLibrary.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA
      ───────────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        {/* Story Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-blue-400 uppercase tracking-wider font-bold">
              {cluster?.category || cluster?.categoryLabel || "Strategic Intelligence"}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{cluster?.timeAgo || "Breaking Dispatch"}</span>
            {cluster?.regions && cluster.regions.length > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{cluster.regions.join(", ")}</span>
              </>
            )}
            {cluster?.consensusBadge && (
              <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                {cluster.consensusBadge}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug">
            {cluster?.title || "Global Intelligence Dossier"}
          </h1>

          {cluster?.summary && (
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed border-l-2 border-blue-500 pl-4 py-1 italic bg-blue-500/5 rounded-r-xl">
              {cluster.summary}
            </p>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            3. DEEP INTELLIGENCE DOSSIER (4 STRUCTURED SECTIONS)
        ───────────────────────────────────────────────────────────────────────── */}
        <section className="space-y-6">
          {isGenerating ? (
            /* Loading State */
            <div className="bg-[#0E131F] rounded-3xl p-12 sm:p-16 border border-blue-500/30 shadow-2xl shadow-blue-950/20 text-center flex flex-col items-center justify-center gap-5">
              <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
              <div className="space-y-2 max-w-lg">
                <h3 className="text-xl font-extrabold text-white">
                  Synthesizing Deep Intelligence Dossier...
                </h3>
                <p className="text-sm text-slate-400 font-mono leading-relaxed">
                  {generationStep ||
                    "Scraping full publisher articles, resolving Google News redirects, and generating 800-1,000 word factual dossier with AgentRouter (gpt-5.6-sol)..."}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-blue-300">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                  Target: 800 – 1,000 Words
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                  4 Comprehensive Sections
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                  Inline Source Citations
                </span>
              </div>
            </div>
          ) : scriptText ? (
            /* Dossier Display */
            <div className="space-y-6">
              {/* Dossier Banner */}
              <div className="bg-gradient-to-r from-blue-900/30 via-[#0E131F] to-[#0E131F] rounded-2xl px-6 py-4 border border-blue-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide uppercase">
                      Deep Intelligence Dossier
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">
                      800–1,000 Word Ground-Truth Analysis • 4 Dedicated Strategic Sections
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    <span>{copied ? "Copied!" : "Copy Full Text"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .TXT</span>
                  </button>
                </div>
              </div>

              {/* 4 Structured Section Cards */}
              <div className="space-y-6">
                {dossierSections.map((sec, idx) => (
                  <article
                    key={idx}
                    className="bg-[#0E131F] rounded-3xl p-6 sm:p-9 border border-white/10 hover:border-blue-500/30 transition-all shadow-xl shadow-black/30 space-y-5"
                  >
                    {/* Section Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 font-mono text-sm font-extrabold flex items-center justify-center shrink-0">
                          {sec.number.padStart(2, "0")}
                        </span>
                        <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                          {sec.title}
                        </h3>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-white/5 text-slate-300 border border-white/5">
                        {sec.badge}
                      </span>
                    </div>

                    {/* Section Paragraphs with Inline Citations */}
                    <div className="space-y-4">
                      {sec.paragraphs.map((para, pIdx) => {
                        const parts = para.split(/(\[Source:[^\]]+\])/gi);
                        return (
                          <p
                            key={pIdx}
                            className="text-slate-200 text-base sm:text-[17px] leading-[1.85] font-normal tracking-wide"
                          >
                            {parts.map((part, partIdx) => {
                              if (part.startsWith("[Source:") && part.endsWith("]")) {
                                return (
                                  <span
                                    key={partIdx}
                                    className="inline-flex items-center mx-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30"
                                  >
                                    {part}
                                  </span>
                                );
                              }
                              return part;
                            })}
                          </p>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-[#0E131F] rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-5 border border-white/10">
              <Sparkles className="w-12 h-12 text-blue-400 opacity-60" />
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-xl font-bold text-white">
                  Intelligence Dossier Not Yet Synthesized
                </h3>
                <p className="text-sm text-slate-400">
                  Scrape full publisher articles across global newsrooms and write the complete 800 to 1,000-word factual intelligence briefing.
                </p>
              </div>

              {cluster && (
                <button
                  type="button"
                  onClick={() => onGenerateScript(cluster)}
                  className="px-6 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Deep Intelligence Dossier</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────────────────
            4. VERIFIED PRIMARY SOURCE ARTICLES & GROUND-TRUTH DISPATCHES
        ───────────────────────────────────────────────────────────────────────── */}
        <section className="space-y-6 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-blue-400" />
                <span>Verified Source Articles & Ground-Truth Dispatches</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Direct publisher URLs decoded from Google News redirects & scraped bodies
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-600/10 text-blue-300 border border-blue-500/20">
              {verifiedArticles.length} Verified Sources
            </span>
          </div>

          <div className="space-y-4">
            {verifiedArticles.length > 0 ? (
              verifiedArticles.map((art: any, idx: number) => {
                const isExpanded = !!expandedArticles[idx];
                const paragraphs: string[] = art.paragraphs || [];
                const displayedParagraphs = isExpanded
                  ? paragraphs
                  : paragraphs.slice(0, 3);
                const hasMore = paragraphs.length > 3;
                const directUrl = art.url || art.link || "";

                return (
                  <article
                    key={idx}
                    className="bg-[#0E131F] rounded-2xl p-6 sm:p-7 border border-white/10 hover:border-blue-500/30 transition-all shadow-md space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-blue-500/15 text-blue-400 border border-blue-500/25">
                          {art.source || "Verified Wire"}
                        </span>
                        {art.region && (
                          <span className="text-xs font-mono text-slate-400">
                            • {art.region}
                          </span>
                        )}
                      </div>

                      {directUrl && (
                        <a
                          href={directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 transition-colors"
                          title="Open original article in new tab"
                        >
                          <span>Read Direct Source</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <h4 className="text-base sm:text-lg font-bold text-white leading-snug">
                      {art.title}
                    </h4>

                    {/* Paragraphs */}
                    <div className="text-slate-300 text-xs sm:text-sm leading-relaxed space-y-2.5 font-normal">
                      {displayedParagraphs.length > 0 ? (
                        displayedParagraphs.map((p, pIdx) => (
                          <p key={pIdx} className="border-l-2 border-white/5 pl-3 py-0.5">
                            {p}
                          </p>
                        ))
                      ) : (
                        <p className="text-slate-400 italic">
                          {art.snippet || "Full text available on original publisher's website."}
                        </p>
                      )}
                    </div>

                    {/* Expand/Collapse Toggle */}
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => toggleExpandArticle(idx)}
                        className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors pt-1"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Show fewer paragraphs</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Read all {paragraphs.length} scraped paragraphs</span>
                          </>
                        )}
                      </button>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="bg-[#0E131F] rounded-2xl p-8 text-center text-slate-400 text-sm border border-white/5">
                No primary source articles gathered yet. Click &quot;Generate Deep Intelligence Dossier&quot; to gather and synthesize.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. SAVED HISTORY DRAWER MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0E131F] border-l border-white/10 w-full max-w-md h-full flex flex-col shadow-2xl">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Saved Dossiers Library</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {savedLibrary.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No dossiers saved on this device yet.
                </div>
              ) : (
                savedLibrary.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onLoadSavedScript(item);
                      setIsHistoryDrawerOpen(false);
                    }}
                    className="p-4 rounded-xl bg-[#06080F] border border-white/5 hover:border-blue-500/40 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="text-blue-400 font-bold">{item.category}</span>
                      <span>{item.savedAt}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                      {item.title}
                    </h4>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-mono text-emerald-400">
                        {item.wordCount} words
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedItem(item.id, e)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete from saved library"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
