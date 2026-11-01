"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Search,
  ArrowRight,
  TrendingUp,
  Globe,
  ShoppingBag,
  Plus,
  X,
  Compass,
} from "lucide-react";
import { LensPreset } from "@/types";

interface CuriosityBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activePresetId: string;
  onSelectPreset: (id: string) => void;
  presets: LensPreset[];
  onOpenAddPreset: () => void;
  onConnectDots: (query: string) => void;
  storyMatchCount: number;
}

export const CuriosityBar: React.FC<CuriosityBarProps> = ({
  searchQuery,
  onSearchChange,
  activePresetId,
  onSelectPreset,
  presets,
  onOpenAddPreset,
  onConnectDots,
  storyMatchCount,
}) => {
  const [localInput, setLocalInput] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnectDots(localInput);
  };

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case "TrendingUp":
        return <TrendingUp className="w-3.5 h-3.5" />;
      case "Globe":
        return <Globe className="w-3.5 h-3.5" />;
      case "ShoppingBag":
        return <ShoppingBag className="w-3.5 h-3.5" />;
      case "Sparkles":
        return <Sparkles className="w-3.5 h-3.5" />;
      default:
        return <Compass className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Search Input Bar with Connect Dots Button */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className="relative flex items-center w-full rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all p-1.5 sm:p-2">
          {/* Sparkle Icon */}
          <div className="pl-3 pr-2 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5 animate-pulse-subtle" />
          </div>

          {/* Main Input Field */}
          <input
            type="text"
            value={localInput}
            onChange={(e) => {
              setLocalInput(e.target.value);
              onSearchChange(e.target.value);
            }}
            placeholder="Ask anything... e.g., 'What's up with AI, stocks & 2006 trends?'"
            className="w-full bg-transparent border-none outline-none text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 px-2 py-1.5"
          />

          {/* Clear Button if input exists */}
          {localInput && (
            <button
              type="button"
              onClick={() => {
                setLocalInput("");
                onSearchChange("");
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Connect Dots Button */}
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/25 transition-all whitespace-nowrap"
          >
            <span>Connect Dots</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Horizontal Lens Presets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 pl-1">
          Lenses:
        </span>

        {presets.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30 font-semibold"
                  : "bg-white hover:bg-slate-50 dark:bg-[#0E131F] dark:hover:bg-[#141C2E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10"
              }`}
            >
              <span className={isActive ? "text-white" : "text-blue-500 dark:text-blue-400"}>
                {getPresetIcon(preset.iconName)}
              </span>
              <span>{preset.label}</span>
              {preset.isCustom && (
                <span className="text-[10px] opacity-75 font-mono px-1 rounded bg-black/20">
                  Custom
                </span>
              )}
            </button>
          );
        })}

        {/* Custom Preset Button */}
        <button
          onClick={onOpenAddPreset}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/40 transition-colors"
          title="Create a custom radar lens"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Custom Lens</span>
        </button>

        {/* Match Count Indicator */}
        <div className="ml-auto text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap pr-1 hidden sm:block">
          {storyMatchCount} {storyMatchCount === 1 ? "story" : "stories"} loaded
        </div>
      </div>
    </div>
  );
};
