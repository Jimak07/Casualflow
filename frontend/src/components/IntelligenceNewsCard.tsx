"use client";

import React, { useState } from "react";
import {
  Flame,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldAlert,
  Globe,
  Radio,
  Newspaper,
  CheckCircle2,
} from "lucide-react";
import { ClusteredNewsEvent, ClusteredNewsArticle } from "@/types";

interface IntelligenceNewsCardProps {
  cluster: ClusteredNewsEvent;
  isSelected?: boolean;
  onSelect?: (cluster: ClusteredNewsEvent) => void;
  onBuildStoryline: (cluster: ClusteredNewsEvent) => void;
}

export const IntelligenceNewsCard: React.FC<IntelligenceNewsCardProps> = ({
  cluster,
  isSelected = false,
  onSelect,
  onBuildStoryline,
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
    <article
      onClick={() => onSelect?.(cluster)}
      className={`group relative rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer border ${
        isSelected
          ? "bg-[#0E131F] border-blue-500 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/30"
          : "bg-white dark:bg-[#0E131F] border-slate-200 dark:border-white/10 hover:border-blue-500/40 hover:shadow-lg dark:hover:shadow-blue-500/5"
      }`}
    >
      {/* 1. TOP BAR: DUAL BADGES (POPULARITY & IMPORTANCE) + TIME AGO */}
      <div className="flex flex-col gap-2.5 mb-3">
        {/* Row 1: Dual Badges (Badge 1: Global Outlets/Regions & Badge 2: Global Impact Tier) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Badge 1: 📡 6 Global Outlets (4 Regions) */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold tracking-tight border ${
                isMultiOutlet
                  ? "bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-red-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-sm"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              }`}
            >
              {isMultiOutlet ? (
                <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              )}
              <span className="truncate max-w-[280px] sm:max-w-[360px]">
                {cluster.consensusBadge ||
                  `📡 ${cluster.outlets.length} Global Outlets (${cluster.regions.length} Regions)`}
              </span>
            </div>

            {/* Badge 2: 🌍 94% Global Impact [S-Tier: Economy & Geopolitics] */}
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold tracking-tight border ${
                cluster.importanceGrade === "S-Tier" || (cluster.importanceScore || 0) >= 85
                  ? "bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-blue-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm ring-1 ring-emerald-500/20"
                  : cluster.importanceGrade === "A-Tier" || (cluster.importanceScore || 0) >= 70
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
              }`}
            >
              <Globe className="w-3.5 h-3.5 opacity-80 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span className="truncate max-w-[280px] sm:max-w-[360px]">
                {cluster.importanceLabel ||
                  `🌍 ${cluster.importanceScore || 85}% Global Impact [${
                    cluster.importanceGrade || "A-Tier"
                  }: Economy & Geopolitics]`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 dark:text-slate-400 shrink-0 ml-auto">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{cluster.timeAgo}</span>
          </div>
        </div>

        {/* Continental Region & Scope Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Continental Regions */}
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

          {/* Outlets Count Badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <span>{cluster.outlets.length} Outlets</span>
          </span>
        </div>
      </div>

      {/* 2. PRIMARY BREAKING HEADLINE */}
      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
        {cluster.title}
      </h3>

      {/* 3. TWO-SENTENCE FACTUAL SUMMARY */}
      <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-3">
        {cluster.summary}
      </p>

      {/* 4. EXPANDABLE "ALL REPORTING SOURCES" LIST */}
      <div className="border-t border-slate-100 dark:border-white/5 pt-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsSourcesExpanded(!isSourcesExpanded);
          }}
          className="w-full flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Radio className="w-3.5 h-3.5 text-blue-500" />
            <span>
              All Reporting Sources ({cluster.articles.length} verified feeds)
            </span>
          </span>
          <div className="flex items-center gap-1 text-[11px]">
            <span>{isSourcesExpanded ? "Hide" : "Show"}</span>
            {isSourcesExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
        </button>

        {isSourcesExpanded && (
          <div className="mt-2.5 flex flex-col gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] border border-slate-200 dark:border-white/5 animate-in fade-in duration-150">
            {cluster.articles.map((art: ClusteredNewsArticle, idx: number) => (
              <div
                key={`${art.link}-${idx}`}
                className="flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#141C2E] transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px] text-blue-600 dark:text-blue-400 shrink-0">
                      {art.source}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 shrink-0">
                      • {art.region}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                    {art.title}
                  </p>
                </div>

                {art.link && (
                  <a
                    href={art.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 shrink-0 transition-colors"
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

      {/* 5. ACTION BUTTON: "BUILD DOCUMENTARY STORYLINE →" */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Consensus Score: {cluster.consensusScore}</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBuildStoryline(cluster);
          }}
          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 group-hover:shadow-blue-500/40"
        >
          <span>Build Documentary Storyline</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </article>
  );
};
