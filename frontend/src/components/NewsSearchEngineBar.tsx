"use client";

import React, { useState } from "react";
import {
  Search,
  RefreshCw,
  X,
  Flame,
  Clock,
  ShieldAlert,
  SlidersHorizontal,
  Globe2,
  Swords,
  Activity,
  Cpu,
  TrendingUp,
} from "lucide-react";
import { GeopoliticalNiche, SortMode } from "@/types";

interface NewsSearchEngineBarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onRefreshToday: () => void;
  isScanning: boolean;
  activeNiche: string;
  onSelectNiche: (niche: string) => void;
  sortMode: SortMode;
  onSelectSortMode: (mode: SortMode) => void;
  totalClustersCount: number;
  filteredClustersCount: number;
}

const NICHE_TABS: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "all", label: "All 5 Sections", icon: Globe2 },
  { id: "insecurity-wars", label: "Wars & Conflicts", icon: Swords },
  { id: "financials-markets", label: "Financials & Markets", icon: TrendingUp },
  { id: "geopolitics-diplomacy", label: "Geopolitics & Diplomacy", icon: Globe2 },
  { id: "energy-commodities", label: "Energy & Cost of Living", icon: Flame },
  { id: "tech-health", label: "Tech, AI & Health", icon: Cpu },
];

const SORT_OPTIONS: {
  id: SortMode;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}[] = [
  {
    id: "popularity",
    label: "🔥 Sort by Popularity (Consensus)",
    shortLabel: "🔥 Popularity",
    icon: Flame,
    hint: "Ranked strictly by number of distinct global news outlets & regions reporting",
  },
  {
    id: "importance",
    label: "🌍 Sort by Importance (S-Tier Impact)",
    shortLabel: "🌍 Importance",
    icon: Globe2,
    hint: "Ranked by global economic & geopolitical impact (markets, energy, chokepoints, conflict)",
  },
  {
    id: "latest",
    label: "🕒 Latest Time",
    shortLabel: "🕒 Latest",
    icon: Clock,
    hint: "Most recent reporting timestamps",
  },
];

export const NewsSearchEngineBar: React.FC<NewsSearchEngineBarProps> = ({
  searchQuery,
  onSearch,
  onRefreshToday,
  isScanning,
  activeNiche,
  onSelectNiche,
  sortMode,
  onSelectSortMode,
  totalClustersCount,
  filteredClustersCount,
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localQuery.trim());
  };

  const handleClear = () => {
    setLocalQuery("");
    onSearch("");
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 1. TOP SEARCH ENGINE BAR & TODAY'S TOP HEADLINES (REFRESH) */}
      <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 transition-colors">
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Search live geopolitical events (e.g. Trump, Middle East, Outbreak, Semiconductors)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#06080F] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isScanning}
            className="px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </form>

        {/* TODAY'S TOP HEADLINES (REFRESH) BUTTON */}
        <button
          onClick={onRefreshToday}
          disabled={isScanning}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 border ${
            isScanning
              ? "bg-blue-500/10 text-blue-400 border-blue-500/30 cursor-not-allowed"
              : "bg-slate-100 dark:bg-[#141C2E] hover:bg-slate-200 dark:hover:bg-[#1C2740] text-slate-900 dark:text-white border-slate-200 dark:border-blue-900/40 hover:border-blue-500/50 shadow-sm active:scale-95"
          }`}
          title="Reload today's breaking verified global consensus stories"
        >
          <RefreshCw
            className={`w-4 h-4 text-blue-500 ${isScanning ? "animate-spin" : ""}`}
          />
          <span className="whitespace-nowrap">
            {isScanning ? "Scanning Matrix..." : "Today's Top Headlines (Refresh)"}
          </span>
        </button>
      </div>

      {/* 2. CONTROL BARS: SORT BY & GEOPOLITICAL NICHE TABS */}
      <div className="w-full flex flex-col gap-2.5 p-3 rounded-2xl bg-white/70 dark:bg-[#0E131F]/70 border border-slate-200 dark:border-white/10 backdrop-blur-md">
        {/* ROW 1: PROMINENT POPULARITY VS IMPORTANCE SORT TOGGLE */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-white/5 pb-2.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mr-1 flex items-center gap-1">
              <span>SORT:</span>
            </span>

            {/* Segmented Toggle Bar */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-[#06080F] border border-slate-200 dark:border-white/10 gap-1">
              {SORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected =
                  sortMode === opt.id ||
                  (opt.id === "popularity" && sortMode === "consensus") ||
                  (opt.id === "importance" && sortMode === "sensitivity");

                return (
                  <button
                    key={opt.id}
                    onClick={() => onSelectSortMode(opt.id)}
                    title={opt.hint}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? opt.id === "popularity"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-orange-500/25 ring-1 ring-orange-400/40"
                          : opt.id === "importance"
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 ring-1 ring-blue-400/40"
                          : "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isSelected
                          ? "text-white dark:text-inherit"
                          : opt.id === "popularity"
                          ? "text-amber-500"
                          : opt.id === "importance"
                          ? "text-blue-500"
                          : "text-slate-400"
                      }`}
                    />
                    <span className="hidden sm:inline">{opt.label}</span>
                    <span className="sm:hidden">{opt.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="hidden md:inline">Live Matrix:</span>
            <span className="px-2 py-0.5 rounded-md bg-blue-100/70 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-500/20">
              {filteredClustersCount} / {totalClustersCount} Events
            </span>
          </div>
        </div>

        {/* ROW 2: GEOPOLITICAL NICHE TABS (SINGLE-NICHE SCOPE FILTERS) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5">
          {NICHE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeNiche === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectNiche(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-[#06080F] dark:hover:bg-[#141C2E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isSelected
                      ? "text-blue-500 dark:text-blue-600"
                      : "text-slate-400"
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
