"use client";

import React from "react";
import { Sparkles, Zap, History, Users } from "lucide-react";

export const StorySkeletonCard: React.FC = () => {
  return (
    <div className="relative rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0E131F] border border-blue-500/30 dark:border-blue-500/20 shadow-lg shadow-blue-500/5 animate-pulse overflow-hidden">
      {/* Ambient background shimmer beam */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

      {/* Top badges shimmer */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-24 rounded-md bg-blue-100 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-800/40" />
        <div className="h-5 w-20 rounded-md bg-slate-200 dark:bg-[#141C2E]" />
        <div className="h-5 w-24 rounded-md bg-slate-100 dark:bg-[#141C2E]" />
      </div>

      {/* Title shimmer */}
      <div className="space-y-2 mb-4">
        <div className="h-5 w-11/12 rounded-lg bg-slate-200 dark:bg-white/10" />
        <div className="h-4 w-3/4 rounded-lg bg-slate-100 dark:bg-white/5" />
      </div>

      {/* 3-Node Timeline Shimmer */}
      <div className="relative pl-6 space-y-4 my-4">
        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-blue-500/20" />

        {/* Node 1 */}
        <div className="relative">
          <div className="absolute -left-[24px] top-0.5 w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center ring-4 ring-white dark:ring-[#0E131F]">
            <Zap className="w-3 h-3 text-blue-400" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-32 rounded bg-blue-400/20" />
            <div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-white/10" />
          </div>
        </div>

        {/* Node 2 */}
        <div className="relative">
          <div className="absolute -left-[24px] top-0.5 w-6 h-6 rounded-full bg-sky-500/30 flex items-center justify-center ring-4 ring-white dark:ring-[#0E131F]">
            <History className="w-3 h-3 text-sky-400" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-36 rounded bg-sky-400/20" />
            <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
          </div>
        </div>

        {/* Node 3 */}
        <div className="relative">
          <div className="absolute -left-[24px] top-0.5 w-6 h-6 rounded-full bg-amber-500/30 dark:bg-white/20 flex items-center justify-center ring-4 ring-white dark:ring-[#0E131F]">
            <Users className="w-3 h-3 text-amber-400 dark:text-white" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-40 rounded bg-amber-400/20 dark:bg-white/10" />
            <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
          </div>
        </div>
      </div>

      {/* Footer shimmer */}
      <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
        <div className="h-3 w-32 rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-3 w-24 rounded bg-blue-400/30" />
      </div>
    </div>
  );
};
