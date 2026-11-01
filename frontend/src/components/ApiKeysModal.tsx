"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  ShieldCheck,
  Zap,
  ExternalLink,
  Check,
  Info,
  Globe,
  Cpu,
} from "lucide-react";
import { ApiKeysConfig } from "@/types";

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKeys: (keys: ApiKeysConfig) => void;
}

const DEFAULT_CONFIG: ApiKeysConfig = {
  groqKey: "",
  tavilyKey: "",
  customRssUrl: "https://feeds.bloomberg.com/economics/news.rss",
  model: "llama-3.3-70b-versatile",
};

export const ApiKeysModal: React.FC<ApiKeysModalProps> = ({
  isOpen,
  onClose,
  onSaveKeys,
}) => {
  const [config, setConfig] = useState<ApiKeysConfig>(DEFAULT_CONFIG);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("causalflow_api_keys");
      if (saved) {
        try {
          setConfig(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load saved api keys", e);
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("causalflow_api_keys", JSON.stringify(config));
    onSaveKeys(config);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    localStorage.removeItem("causalflow_api_keys");
    setConfig(DEFAULT_CONFIG);
    onSaveKeys(DEFAULT_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                API Keys & Connectors ($0 Stack)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% Client-Side • Keys Stored Locally in Your Browser
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#141C2E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Callout: $0 Free Stack */}
        <div className="my-4 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
            <Zap className="w-4 h-4" />
            <span>Why the $0 Stack?</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            CausalFlow is architected to run at $0 operating cost. Both Groq (Llama 3.3 70B @ 300 tokens/sec) and Tavily News Search provide generous perpetual free developer tiers with no credit card required.
          </p>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Groq API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-500" />
                <span>Groq API Key (Llama 3.3 70B)</span>
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={config.groqKey}
              onChange={(e) => setConfig({ ...config, groqKey: e.target.value })}
              placeholder="gsk_..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
          </div>

          {/* Tavily API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-500" />
                <span>Tavily Search API Key (Live News Verification)</span>
              </label>
              <a
                href="https://tavily.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Get Free Key (1k/mo)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={config.tavilyKey}
              onChange={(e) => setConfig({ ...config, tavilyKey: e.target.value })}
              placeholder="tvly-..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
          </div>

          {/* Custom RSS Endpoint */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <span>Primary Macro RSS Stream Endpoint</span>
            </label>
            <input
              type="text"
              value={config.customRssUrl}
              onChange={(e) => setConfig({ ...config, customRssUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
              Default Autonomous Reasoning Model
            </label>
            <select
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
            >
              <option value="llama-3.3-70b-versatile">
                Llama 3.3 70B Versatile (Fastest & Best for Screenplays)
              </option>
              <option value="llama-3.1-8b-instant">
                Llama 3.1 8B Instant (Ultralight Latency)
              </option>
              <option value="mixtral-8x7b-32768">
                Mixtral 8x7B (Deep Financial Synthesis)
              </option>
            </select>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-red-500 font-mono transition-colors"
            >
              Clear Stored Keys
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141C2E] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
