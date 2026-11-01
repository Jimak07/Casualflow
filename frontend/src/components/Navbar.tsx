"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Radio,
  Key,
  Sun,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  Layers,
} from "lucide-react";

interface NavbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenApiKeys: () => void;
  onScanNews: () => void;
  isScanning: boolean;
  mobileActiveTab: "radar" | "studio";
  onTabChange: (tab: "radar" | "studio") => void;
  storyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isDarkMode,
  onToggleTheme,
  onOpenApiKeys,
  onScanNews,
  isScanning,
  mobileActiveTab,
  onTabChange,
  storyCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b transition-colors duration-200 backdrop-blur-md bg-white/80 dark:bg-[#06080F]/90 border-slate-200 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Live Feed Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/40">
              <Sparkles className="w-5 h-5 text-blue-100" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#06080F] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                  Causal<span className="text-blue-600 dark:text-blue-500">Flow</span>
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400 dark:border dark:border-blue-500/30">
                  Studio v2.4
                </span>
              </div>
              <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 font-medium">
                Autonomous Documentary Intelligence & Script Studio
              </p>
            </div>
          </div>

          {/* Live Radar Pulse Indicator */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-slate-100 dark:bg-[#0E131F] border border-slate-200 dark:border-blue-900/40 text-slate-700 dark:text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">RADAR ACTIVE:</span>
            <span>42 Global Macro Feeds</span>
          </div>
        </div>

        {/* Mobile View Tab Switcher (Segmented Control) */}
        <div className="flex lg:hidden items-center p-1 rounded-xl bg-slate-100 dark:bg-[#0E131F] border border-slate-200 dark:border-white/10">
          <button
            onClick={() => onTabChange("radar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mobileActiveTab === "radar"
                ? "bg-blue-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Radar ({storyCount})</span>
          </button>
          <button
            onClick={() => onTabChange("studio")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mobileActiveTab === "studio"
                ? "bg-blue-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Script Studio</span>
          </button>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Scan Live News Button */}
          <button
            onClick={onScanNews}
            disabled={isScanning}
            className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
              isScanning
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-95"
            }`}
            title="Scan live macro feeds and synthesize 3-node causal scripts"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                isScanning ? "animate-spin text-blue-400" : ""
              }`}
            />
            <span className="hidden sm:inline">
              {isScanning ? "Scanning Feeds..." : "Scan Live News"}
            </span>
            <span className="sm:hidden">{isScanning ? "Scanning..." : "Scan"}</span>
          </button>

          {/* API Keys Modal Button */}
          <button
            onClick={onOpenApiKeys}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-[#0E131F] dark:hover:bg-[#141C2E] border border-slate-200 dark:border-white/10 transition-all active:scale-95"
            title="Configure Groq, Tavily, and RSS keys ($0 Stack)"
          >
            <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">API Keys ($0 Stack)</span>
            <span className="md:hidden">Keys</span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 sm:p-2.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-[#0E131F] dark:hover:bg-[#141C2E] border border-slate-200 dark:border-white/10 transition-all active:scale-95"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 transition-transform duration-300 hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
