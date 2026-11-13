"use client";

import React, { useState } from "react";
import {
  Flame,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
  Radio,
  BookOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { ClusteredNewsEvent, ClusteredNewsArticle, SortMode } from "@/types";

interface IntelligenceNewsCardProps {
  cluster: ClusteredNewsEvent;
  sortMode?: SortMode;
  onReadBriefing: (cluster: ClusteredNewsEvent) => void;
  onGenerateScript: (cluster: ClusteredNewsEvent) => void;
}

export const IntelligenceNewsCard: React.FC<IntelligenceNewsCardProps> = ({
  cluster,
  sortMode = "popularity",
  onReadBriefing,
  onGenerateScript,
}) => {
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);

  // Region color mapping
  const getRegionBadgeStyle = (region: string) => {
    switch (region) {
      case "Africa":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Middle East":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "India & South Asia":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "Asia-Pacific":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "Europe & UK":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "US & Global Finance":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    }
  };

  const isMultiOutlet = cluster.outlets.length >= 2;

  return (
    <article className="group relative rounded-2xl p-5 bg-[#0E131F] border border-white/10 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* 1. TOP BAR: CONSENSUS BADGE & GLOBAL IMPACT SCORE */}
        <div className="flex flex-col gap-2.5 mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Headline Consensus Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold tracking-tight border ${
                  isMultiOutlet
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/25"
                }`}
              >
                {isMultiOutlet ? (
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Radio className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className="truncate max-w-[260px] sm:max-w-[340px]">
                  {cluster.consensusBadge}
                </span>
              </div>

              {/* Global Impact Score Badge */}
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold border ${
                  sortMode === "importance"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40 ring-1 ring-blue-500/30"
                    : cluster.importanceGrade === "S-Tier"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>
                  {cluster.importanceScore || 85}% Impact [
                  {cluster.importanceGrade || "A-Tier"}]
                </span>
              </div>
            </div>

            {/* Time Ago */}
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 shrink-0 ml-auto">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{cluster.timeAgo}</span>
            </div>
          </div>

          {/* Continental Region & Outlets Count Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {cluster.regions.map((region) => (
              <span
                key={region}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${getRegionBadgeStyle(
                  region
                )}`}
              >
                <Globe className="w-2.5 h-2.5 opacity-70" />
                <span>{region}</span>
              </span>
            ))}

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-white/5 border border-white/5">
              <span>{cluster.outlets.length} Global Outlets</span>
            </span>
          </div>
        </div>

        {/* 2. PRIMARY BREAKING HEADLINE */}
        <h3 className="text-base sm:text-lg font-bold text-white leading-snug group-hover:text-blue-400 transition-colors mb-2.5">
          {cluster.title}
        </h3>

        {/* 3. WHAT'S HAPPENING NOW (EXECUTIVE EVENT SUMMARY) */}
        <div className="mb-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>What&apos;s Happening Now</span>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed line-clamp-3">
            {cluster.summary}
          </p>
        </div>

        {/* 4. EXPANDABLE "ALL REPORTING SOURCES" LIST */}
        <div className="border-t border-white/5 pt-2.5 mb-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSourcesExpanded(!isSourcesExpanded);
            }}
            className="w-full flex items-center justify-between text-xs font-mono text-slate-400 hover:text-blue-400 py-1 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Reporting Sources ({cluster.articles.length} verified feeds)
              </span>
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <span>{isSourcesExpanded ? "Hide" : "Show Outlets"}</span>
              {isSourcesExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {isSourcesExpanded && (
            <div className="mt-2.5 flex flex-col gap-2 p-2.5 rounded-xl bg-[#06080F] border border-white/10 animate-in fade-in duration-150">
              {cluster.articles.map((art: ClusteredNewsArticle, idx: number) => (
                <div
                  key={`${art.link}-${idx}`}
                  className="flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-[#141C2E] transition-colors"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[11px] text-blue-400 shrink-0">
                        {art.source}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        • {art.region}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate">
                      {art.title}
                    </p>
                  </div>

                  {art.link && (
                    <a
                      href={art.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 shrink-0 transition-colors"
                      title="Read original source"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. TWO ACTION BUTTONS ON EVERY CARD */}
      <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Action 1: Read Full News Briefing */}
        <button
          type="button"
          onClick={() => onReadBriefing(cluster)}
          className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-[#141C2E] hover:bg-[#1C263D] hover:text-white border border-white/10 hover:border-blue-500/40 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>📖 Read Full News Briefing</span>
        </button>

        {/* Action 2: Generate Pure Script */}
        <button
          type="button"
          onClick={() => onGenerateScript(cluster)}
          className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
          <span>✍️ Generate Pure Script</span>
        </button>
      </div>
    </article>
  );
};
