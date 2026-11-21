"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ClusteredNewsEvent,
  EventCategoryMeta,
  EVENT_CATEGORIES,
} from "@/types";
import {
  generateCompiledSummaryText,
  downloadSummaryTextFile,
} from "@/lib/summaryGenerator";
import { API_ENDPOINTS } from "@/lib/api";
import {
  Download,
  Copy,
  Check,
  X,
  FileText,
  ExternalLink,
  Sparkles,
  BookOpen,
  PenTool,
  RefreshCw,
  Radio,
  CheckCircle2,
} from "lucide-react";

interface CompiledSummarySheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: string; // "ALL 24 SECTIONS" or section title / key
  sortMode: string;
  clusters: ClusteredNewsEvent[];
  sectionMetas?: EventCategoryMeta[];
  onSelectClusterForBriefing?: (cluster: ClusteredNewsEvent) => void;
  onSelectClusterForScript?: (cluster: ClusteredNewsEvent) => void;
}

export const CompiledSummarySheetModal: React.FC<CompiledSummarySheetModalProps> = ({
  isOpen,
  onClose,
  scope,
  sortMode,
  clusters,
  sectionMetas = EVENT_CATEGORIES,
  onSelectClusterForBriefing,
  onSelectClusterForScript,
}) => {
  const [viewTab, setViewTab] = useState<"card" | "raw">("card");
  const [copied, setCopied] = useState(false);
  const [modalTimestamp, setModalTimestamp] = useState<string>("");
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [aiCompiledText, setAiCompiledText] = useState<string>("");
  const [enrichedEvents, setEnrichedEvents] = useState<ClusteredNewsEvent[]>(clusters);

  const isGlobal =
    scope.toUpperCase() === "ALL 24 SECTIONS" ||
    scope.toUpperCase() === "GLOBAL" ||
    scope.toUpperCase() === "ALL SECTIONS";

  const targetWordsLabel = isGlobal ? "150–200 Words / Story" : "350–500 Words / Story";

  // When modal opens, set timestamp and trigger rich AI synthesis
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setModalTimestamp(
        `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)} UTC`
      );

      // Trigger rich AI synthesis & URL decoding
      let isMounted = true;
      setIsSynthesizing(true);

      fetch(API_ENDPOINTS.summariesCompile, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          sortMode: sortMode.toLowerCase().includes("popular") ? "popularity" : "importance",
          clusters,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!isMounted || !data) return;
          if (data.success && data.compiledText) {
            setAiCompiledText(data.compiledText);
            if (data.enrichedClusters && Array.isArray(data.enrichedClusters)) {
              setEnrichedEvents(data.enrichedClusters);
            }
          }
        })
        .catch((err) => {
          console.warn("[Summary Sheet] AI synthesis error, using fallback:", err);
        })
        .finally(() => {
          if (isMounted) setIsSynthesizing(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setAiCompiledText("");
      setEnrichedEvents(clusters);
      setIsSynthesizing(false);
    }
  }, [isOpen, scope, sortMode, clusters]);

  // Group events by categoryKey
  const categorizedData = useMemo(() => {
    const sectionsToInclude = isGlobal
      ? sectionMetas
      : sectionMetas.filter(
          (s) =>
            s.label.toUpperCase() === scope.toUpperCase() ||
            s.key.toLowerCase() === scope.toLowerCase() ||
            s.shortLabel.toUpperCase() === scope.toUpperCase()
        );

    const activeList = enrichedEvents.length > 0 ? enrichedEvents : clusters;
    const map = new Map<string, ClusteredNewsEvent[]>();
    for (const cluster of activeList) {
      const key = cluster.categoryKey || "world";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(cluster);
    }

    return sectionsToInclude.map((sec) => ({
      meta: sec,
      events: map.get(sec.key) || [],
    }));
  }, [enrichedEvents, clusters, scope, sectionMetas, isGlobal]);

  const totalHeadlines = useMemo(() => {
    return categorizedData.reduce((acc, curr) => acc + curr.events.length, 0);
  }, [categorizedData]);

  // Fallback plaintext if AI synthesis is in progress
  const fallbackPlainText = useMemo(() => {
    if (!isOpen) return "";
    return generateCompiledSummaryText({
      scope,
      sortMode,
      events: enrichedEvents.length > 0 ? enrichedEvents : clusters,
      sectionMetas,
      timestamp: modalTimestamp,
    });
  }, [isOpen, scope, sortMode, enrichedEvents, clusters, sectionMetas, modalTimestamp]);

  const effectiveText = aiCompiledText || fallbackPlainText;

  if (!isOpen) return null;

  const handleDownload = () => {
    const now = new Date();
    const cleanSlug = scope
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `causalflow-${cleanSlug}-summary-${dateStr}.txt`;
    downloadSummaryTextFile(effectiveText, filename);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(effectiveText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col rounded-3xl bg-[#0E131F] border border-white/10 shadow-2xl shadow-blue-950/50 overflow-hidden text-white">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-[#06080F]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Compiled Intelligence Summary Sheet
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {scope.toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/5 text-slate-300 border border-white/10">
                  {totalHeadlines} Headlines Compiled
                </span>

                {/* AI Status Badge */}
                {isSynthesizing ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 animate-pulse">
                    <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                    <span>Synthesizing ({targetWordsLabel})...</span>
                  </span>
                ) : aiCompiledText ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>AgentRouter • Decoded URLs</span>
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Depth: <span className="text-blue-300 font-semibold">{targetWordsLabel}</span> • Direct decoded publisher links • Zero boilerplate
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-[#06080F] border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setViewTab("card")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewTab === "card"
                    ? "bg-blue-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Structured Sheet
              </button>
              <button
                type="button"
                onClick={() => setViewTab("raw")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewTab === "raw"
                    ? "bg-blue-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Raw .TXT
              </button>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all"
              title="Copy formatted summary to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .TXT</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 custom-scrollbar">
          {viewTab === "raw" ? (
            /* RAW .TXT PREVIEW */
            <div className="p-4 sm:p-6 rounded-2xl bg-[#06080F] border border-white/10 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
              {effectiveText}
            </div>
          ) : (
            /* STRUCTURED CARD VIEW */
            <div className="space-y-8">
              {categorizedData.map((sectionGroup) => {
                const { meta, events } = sectionGroup;

                return (
                  <div key={meta.key} className="space-y-4">
                    {/* Section Sub-Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          SECTION
                        </span>
                        <h4 className="text-sm sm:text-base font-extrabold text-white">
                          {meta.label}
                        </h4>
                        <span className="text-xs text-slate-500">
                          ({events.length} {events.length === 1 ? "story" : "stories"})
                        </span>
                      </div>
                    </div>

                    {events.length === 0 ? (
                      <div className="p-4 rounded-xl bg-[#06080F]/50 border border-white/5 text-xs text-slate-500 italic">
                        No active breaking dispatches currently clustered in this section.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {events.map((ev, idx) => (
                          <div
                            key={ev.id}
                            className="p-5 sm:p-6 rounded-2xl bg-[#06080F] border border-white/10 hover:border-blue-500/30 transition-all space-y-3.5 shadow-md"
                          >
                            {/* Card Top Row: Rank & Scores */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md font-mono font-black bg-blue-600/20 text-blue-400 border border-blue-500/30">
                                  #{idx + 1}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                                    (ev.tierGrade || ev.importanceGrade) === "S-Tier"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : (ev.tierGrade || ev.importanceGrade) === "A-Tier"
                                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                      : "bg-slate-800 text-slate-300 border border-white/10"
                                  }`}
                                >
                                  {ev.importanceScore}% {ev.tierGrade || ev.importanceGrade}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  • Consensus: {ev.popularityScore}% ({ev.outlets.length} Outlets: {ev.outlets.slice(0, 3).join(", ")})
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">
                                {ev.timeAgo}
                              </span>
                            </div>

                            {/* Headline */}
                            <h5 className="text-base sm:text-lg font-bold text-white leading-snug">
                              {ev.title}
                            </h5>

                            {/* Executive Briefing (AI Briefing if synthesized, else executiveBriefing) */}
                            <div className="space-y-2 bg-[#0E131F] p-4 rounded-xl border border-white/5">
                              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-emerald-400" />
                                  <span>Executive Briefing</span>
                                </span>
                                {ev.aiBriefing && (
                                  <span className="text-[10px] font-mono text-slate-500">
                                    AgentRouter • gpt-5.6-sol
                                  </span>
                                )}
                              </div>

                              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2 font-normal">
                                {ev.aiBriefing ? (
                                  ev.aiBriefing
                                    .split(/\n\n+/)
                                    .map((para, pIdx) => {
                                      const parts = para.split(/(\[Source:[^\]]+\])/gi);
                                      return (
                                        <p key={pIdx}>
                                          {parts.map((part, partIdx) => {
                                            if (part.startsWith("[Source:") && part.endsWith("]")) {
                                              return (
                                                <span
                                                  key={partIdx}
                                                  className="inline-block mx-1 px-2 py-0.2 rounded text-[10px] font-mono font-medium bg-blue-500/15 text-blue-300 border border-blue-500/25"
                                                >
                                                  {part}
                                                </span>
                                              );
                                            }
                                            return part;
                                          })}
                                        </p>
                                      );
                                    })
                                ) : ev.executiveBriefing ? (
                                  <>
                                    <p>{ev.executiveBriefing.coreEvent}</p>
                                    {ev.executiveBriefing.contextBackground && (
                                      <p className="text-slate-400 pt-1 border-t border-white/5">
                                        {ev.executiveBriefing.contextBackground}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p>{ev.summary}</p>
                                )}
                              </div>
                            </div>

                            {/* 3 Core Reporting Takeaways */}
                            {ev.keyPointsSummary && ev.keyPointsSummary.length > 0 && (
                              <div className="p-3.5 rounded-xl bg-[#0E131F]/60 border border-white/5 space-y-2 text-xs text-slate-300">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold block mb-1">
                                  Core Reporting Takeaways:
                                </span>
                                {ev.keyPointsSummary.slice(0, 3).map((pt, pIdx) => (
                                  <div key={pIdx} className="flex items-start gap-2">
                                    <span className="text-blue-400 shrink-0 font-bold mt-0.5">•</span>
                                    <p className="leading-relaxed text-slate-200">{pt}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Verified Outlets & Decoded Direct Publisher Links */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="text-[11px] font-mono text-slate-500 mr-1">
                                  Verified Sources:
                                </span>
                                {ev.articles.slice(0, 4).map((art, aIdx) => (
                                  <a
                                    key={aIdx}
                                    href={art.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-white transition-all font-mono"
                                  >
                                    <span>{art.source}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                                  </a>
                                ))}
                                {ev.articles.length > 4 && (
                                  <span className="text-[10px] text-slate-500">
                                    +{ev.articles.length - 4} more
                                  </span>
                                )}
                              </div>

                              {/* Quick Actions to jump into reader view */}
                              {(onSelectClusterForBriefing || onSelectClusterForScript) && (
                                <div className="flex items-center gap-2">
                                  {onSelectClusterForBriefing && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onSelectClusterForBriefing(ev);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
                                    >
                                      <BookOpen className="w-3 h-3 text-blue-400" />
                                      <span>Full Dossier</span>
                                    </button>
                                  )}
                                  {onSelectClusterForScript && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onSelectClusterForScript(ev);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition-all"
                                    >
                                      <PenTool className="w-3 h-3" />
                                      <span>Screenplay</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-white/10 bg-[#06080F]/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AgentRouter synthesis active • Decoded direct publisher links</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
