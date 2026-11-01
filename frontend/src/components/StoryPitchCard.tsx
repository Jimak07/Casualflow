"use client";

import React from "react";
import {
  Zap,
  History,
  Users,
  Clock,
  TrendingUp,
  ChevronRight,
  Flame,
  Globe2,
  ExternalLink,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { StoryPitch } from "@/types";

interface StoryPitchCardProps {
  story: StoryPitch;
  isSelected: boolean;
  onSelect: (story: StoryPitch) => void;
}

export const StoryPitchCard: React.FC<StoryPitchCardProps> = ({
  story,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(story)}
      className={`group relative rounded-2xl p-5 sm:p-6 transition-all duration-200 cursor-pointer card-hover-lift border ${
        isSelected
          ? "bg-[#0E131F] dark:bg-[#0E131F] border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/30"
          : "bg-white dark:bg-[#0E131F]/70 hover:bg-slate-50 dark:hover:bg-[#0E131F] border-slate-200 dark:border-white/10 hover:border-blue-400/50 dark:hover:border-blue-500/40"
      }`}
    >
      {/* Active Selection Indicator Pill */}
      {isSelected && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-blue-600 text-white shadow-sm shadow-blue-500/40">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>IN STUDIO</span>
        </div>
      )}

      {/* Top Metadata: Category Pill, Runtime, Impact Score */}
      <div className="flex flex-wrap items-center gap-2 mb-2 pr-20">
        <span className="px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
          {story.category}
        </span>

        <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#141C2E] border border-slate-200 dark:border-white/5">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{story.estimatedRuntime}</span>
        </span>

        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40">
          <Flame className="w-3 h-3 text-emerald-500" />
          <span>{story.impactScore}% Consensus</span>
        </span>
      </div>

      {/* Cross-Continental Consensus Badge */}
      {story.consensusBadge && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25 mb-2.5 w-fit">
          <Globe2 className="w-3.5 h-3.5 shrink-0 text-blue-500" />
          <span className="truncate">{story.consensusBadge}</span>
        </div>
      )}

      {/* Reporting Continents / Regions */}
      {story.regionsReporting && story.regionsReporting.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Covered in:
          </span>
          {story.regionsReporting.map((region, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10"
            >
              {region}
            </span>
          ))}
        </div>
      )}

      {/* Catchy Documentary Title */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {story.title}
      </h3>

      {/* Subtitle / Pitch Thesis */}
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
        {story.subtitle}
      </p>

      {/* Visual 3-Node Causal Timeline Track */}
      <div className="relative pl-6 sm:pl-7 space-y-4 my-4">
        {/* Continuous Connecting Vertical Rail */}
        <div className="absolute left-[11px] sm:left-[13px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-blue-600 via-sky-400 to-amber-400 dark:to-white/80 opacity-70" />

        {/* NODE 1 (Electric Blue): Developing Timeline (Past ➔ Today's Update) */}
        <div className="relative">
          <div className="absolute -left-[24px] sm:-left-[27px] top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/50 ring-4 ring-white dark:ring-[#0E131F]">
            <Zap className="w-3 h-3" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">
                1. Developing Timeline (Past ➔ Today)
              </span>
              {story.nodes.macroTrigger.outletsReporting && (
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[180px]">
                  via {story.nodes.macroTrigger.outletsReporting}
                </span>
              )}
            </div>

            {story.nodes.macroTrigger.baselineOrigin && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <strong className="text-slate-700 dark:text-slate-300 font-semibold">Origin:</strong>{" "}
                {story.nodes.macroTrigger.baselineOrigin}
              </p>
            )}

            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
              {story.nodes.macroTrigger.breakingUpdate || story.nodes.macroTrigger.title}
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
              {story.nodes.macroTrigger.description}
            </p>

            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
              <TrendingUp className="w-3 h-3" />
              <span>{story.nodes.macroTrigger.metricTag}</span>
            </div>
          </div>
        </div>

        {/* NODE 2 (Light Blue / Cyan): Geopolitical & Historical Mechanism */}
        <div className="relative">
          <div className="absolute -left-[24px] sm:-left-[27px] top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-white shadow-md shadow-sky-500/50 ring-4 ring-white dark:ring-[#0E131F]">
            <History className="w-3 h-3" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-sky-600 dark:text-sky-400">
                2. Geopolitical & Historical Mirror
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                {story.nodes.historicalParallel.period}
              </span>
            </div>

            {story.nodes.historicalParallel.mechanism && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <strong className="text-slate-700 dark:text-slate-300 font-semibold">Mechanism:</strong>{" "}
                {story.nodes.historicalParallel.mechanism}
              </p>
            )}

            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
              {story.nodes.historicalParallel.historicalPrecedent || story.nodes.historicalParallel.title}
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
              {story.nodes.historicalParallel.description}
            </p>

            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/40">
              <span>Echo: {story.nodes.historicalParallel.similarityScore}</span>
            </div>
          </div>
        </div>

        {/* NODE 3 (Accent Amber/White): Everyday Human Impact */}
        <div className="relative">
          <div className="absolute -left-[24px] sm:-left-[27px] top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 dark:bg-white text-slate-900 shadow-md ring-4 ring-white dark:ring-[#0E131F]">
            <Users className="w-3 h-3 text-white dark:text-[#06080F]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">
                3. Everyday Human Impact
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                {story.nodes.humanImpact.affectedGroup}
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
              {story.nodes.humanImpact.groundLevelEffect || story.nodes.humanImpact.title}
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
              {story.nodes.humanImpact.description}
            </p>

            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40">
              <span>{story.nodes.humanImpact.dollarOrPriceMetric}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Scraped Ingested Sources */}
      {story.verifiedSources && story.verifiedSources.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3 h-3 text-blue-500" />
            <span>Verified Reporting Outlets ({story.verifiedSources.length}):</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {story.verifiedSources.slice(0, 3).map((src, idx) => (
              <a
                key={idx}
                href={src.link}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-white/10 transition-colors"
                title={src.title}
              >
                <span className="truncate max-w-[130px]">{src.source}</span>
                <span className="text-[9px] text-slate-400">({src.region})</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Card Footer: Source Catalyst & Load Button */}
      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-400 dark:text-slate-500 font-mono truncate max-w-[200px] sm:max-w-[240px]">
          {story.sourceCatalyst.outlet} • {story.sourceCatalyst.timeAgo}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(story);
          }}
          className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform"
        >
          <span>Open in Studio</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
