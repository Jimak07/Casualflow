"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Zap,
  ExternalLink,
  Check,
  Globe,
  Cpu,
  Sparkles,
  Bot,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { ApiKeysConfig } from "@/types";

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKeys: (keys: ApiKeysConfig) => void;
}

const DEFAULT_CONFIG: ApiKeysConfig = {
  groqKey: "",
  apiKey: "",
  tavilyKey: "",
  customRssUrl: "https://feeds.bloomberg.com/economics/news.rss",
  model: "auto",
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
          const parsed = JSON.parse(saved);
          setConfig({
            ...DEFAULT_CONFIG,
            ...parsed,
            apiKey: parsed.apiKey || parsed.groqKey || "",
            groqKey: parsed.apiKey || parsed.groqKey || "",
          });
        } catch (e) {
          console.error("Failed to load saved api keys", e);
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Active key string
  const activeKey = config.apiKey || config.groqKey || "";

  // Auto-detect provider details based on key prefix
  const getProviderInfo = (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      return {
        provider: "none",
        name: "Auto-Detecting Provider",
        model: "Paste Gemini, Groq, OpenRouter, or OpenAI Key",
        badgeClass:
          "bg-slate-100 dark:bg-[#141C2E] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10",
        pillText: "Ready for Key",
        icon: Key,
      };
    }

    if (trimmed.startsWith("AIza")) {
      return {
        provider: "gemini",
        name: "Google Gemini",
        model: "gemini-2.5-flash (High-Speed & Free Tier)",
        badgeClass:
          "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50",
        pillText: "Google Gemini Detected",
        icon: Sparkles,
      };
    }

    if (trimmed.startsWith("gsk_")) {
      return {
        provider: "groq",
        name: "Groq LPU",
        model: "llama-3.3-70b-versatile (~300 tokens/sec)",
        badgeClass:
          "bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700/50",
        pillText: "Groq Detected",
        icon: Zap,
      };
    }

    if (trimmed.startsWith("sk-or-")) {
      return {
        provider: "openrouter",
        name: "OpenRouter",
        model: "meta-llama/llama-3.3-70b-instruct:free",
        badgeClass:
          "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700/50",
        pillText: "OpenRouter Detected",
        icon: Globe,
      };
    }

    // Default: OpenAI or standard sk- key
    return {
      provider: "openai",
      name: "OpenAI",
      model: "gpt-4o-mini (OpenAI API)",
      badgeClass:
        "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700/50",
      pillText: "OpenAI Detected",
      icon: Cpu,
    };
  };

  const detected = getProviderInfo(activeKey);
  const DetectedIcon = detected.icon;

  const handleKeyChange = (newVal: string) => {
    setConfig({
      ...config,
      apiKey: newVal,
      groqKey: newVal, // Maintain backward compatibility
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...config,
      apiKey: activeKey,
      groqKey: activeKey,
    };
    localStorage.setItem("causalflow_api_keys", JSON.stringify(payload));
    onSaveKeys(payload);
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
                AI Intelligence & Studio Keys
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% Client-Side • Auto-Detected by Key Prefix
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

        {/* Informational Callout: Universal Key Architecture */}
        <div className="my-4 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
            <span>Universal Model Auto-Detection</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Paste any key below. The backend automatically selects the optimal endpoint and model based on your prefix:
            <span className="font-mono text-[11px] block mt-1 text-slate-800 dark:text-slate-200">
              • <strong className="text-emerald-500">AIza...</strong>: Google Gemini (gemini-2.5-flash) <br />
              • <strong className="text-orange-500">gsk_...</strong>: Groq (llama-3.3-70b-versatile) <br />
              • <strong className="text-purple-500">sk-or-...</strong>: OpenRouter (llama-3.3-70b:free) <br />
              • <strong className="text-blue-500">sk-...</strong>: OpenAI (gpt-4o-mini)
            </span>
          </p>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Universal AI API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <DetectedIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>Universal AI API Key (Paste Gemini, Groq, OpenRouter, or OpenAI Key)</span>
              </label>

              {/* Provider Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border transition-colors ${detected.badgeClass}`}
              >
                <span>{detected.pillText}</span>
              </span>
            </div>

            <div className="relative">
              <input
                type="password"
                value={activeKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="AIza... or gsk_... or sk-or-... or sk-..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
              />
            </div>

            {/* Provider Model Details & Quick Links */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
              <span className="font-mono text-slate-500 dark:text-slate-400">
                Routed to: <strong className="text-slate-800 dark:text-slate-200">{detected.model}</strong>
              </span>

              <div className="flex items-center gap-2 font-mono">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Gemini</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span>•</span>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Groq</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span>•</span>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
                >
                  <span>OpenRouter</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Tavily API Key Input (Fact Verification) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-500" />
                <span>Tavily Search API Key (Optional Historical Fact-Checking)</span>
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
              placeholder="tvly-... (Optional — scriptwriting works smoothly without it)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
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
