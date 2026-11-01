"use client";

import React from "react";
import {
  Zap,
  History,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  ChevronRight,
  Flame,
  Globe2,
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
      <div className="flex flex-wrap items-center gap-2 mb-3 pr-20">
        <span className="px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
          {story.category}
        </span>

        <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#141C2E] border border-slate-200 dark:border-white/5">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{story.estimatedRuntime}</span>
        </span>

        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40">
          <Flame className="w-3 h-3 text-emerald-500" />
          <span>{story.impactScore}% Impact</span>
        </span>
      </div>

      {/* Catchy Documentary Title */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {story.title}
      </h3>

      {/* Subtitle / Pitch Thesis */}
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-5 leading-relaxed">
        {story.subtitle}
      </p>

      {/* Visual 3-Node Causal Timeline Track */}
      <div className="relative pl-6 sm:pl-7 space-y-4 my-4">
        {/* Continuous Connecting Vertical Rail */}
        <div className="absolute left-[11px] sm:left-[13px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-blue-600 via-sky-400 to-amber-400 dark:to-white/80 opacity-70" />

        {/* NODE 1 (Electric Blue): Today's Macro Trigger */}
        <div className="relative">
          <div className="absolute -left-[24px] sm:-left-[27px] top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/50 ring-4 ring-white dark:ring-[#0E131F]">
            <Zap className="w-3 h-3" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">
                1. Macro Trigger
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                {story.nodes.macroTrigger.date}
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
              {story.nodes.macroTrigger.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
              {story.nodes.macroTrigger.description}
            </p>
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
              <TrendingUp className="w-3 h-3" />
              <span>{story.nodes.macroTrigger.metricTag}</span>
            </div>
          </div>
        </div>

        {/* NODE 2 (Light Blue / Cyan): Historical Parallel */}
        <div className="relative">
          <div className="absolute -left-[24px] sm:-left-[27px] top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-white shadow-md shadow-sky-500/50 ring-4 ring-white dark:ring-[#0E131F]">
            <History className="w-3 h-3" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-sky-600 dark:text-sky-400">
                2. Historical Parallel
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                {story.nodes.historicalParallel.period}
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
              {story.nodes.historicalParallel.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
              {story.nodes.historicalParallel.description}
            </p>
            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/40">
              <span>Echo: {story.nodes.historicalParallel.similarityScore}</span>
            </div>
          </div>
        </div>

        {/* NODE 3 (Accent White / Amber): Everyday Human Impact */}
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
              {story.nodes.humanImpact.title}
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
