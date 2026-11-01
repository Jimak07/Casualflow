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
  Layers,
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
  model: "hybrid",
  provider: "auto",
};

// Exact unlocked models on user's Vyce AI account
const VYCE_MODELS = [
  {
    id: "hybrid",
    label: "Hybrid Default (deepseek-v4-flash + claude-sonnet-4-6)",
    tag: "Studio Pro",
  },
  {
    id: "claude-sonnet-4-6",
    label: "claude-sonnet-4-6 (Cinematic 5-Act Documentary Scriptwriting)",
    tag: "Flagship",
  },
  {
    id: "deepseek-v4-flash",
    label: "deepseek-v4-flash (Fast & Cost-Efficient 1M Context Synthesis)",
    tag: "Fast / 1M",
  },
  {
    id: "deepseek-v4.1",
    label: "deepseek-v4.1 (Deep Macro-Causal Pattern Analysis)",
    tag: "Reasoning",
  },
  {
    id: "beam-1.0",
    label: "beam-1.0 (Free 10M/day promo pool)",
    tag: "Free Promo",
  },
  {
    id: "agnes-3.0-flash",
    label: "agnes-3.0-flash (Free)",
    tag: "Free",
  },
];

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
            model: parsed.model || "hybrid",
            provider: parsed.provider || "auto",
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
  const selectedProvider = config.provider || "auto";

  // Provider detection
  const getProviderInfo = (key: string, providerPref: string) => {
    const trimmed = key.trim();

    // Explicit Provider overrides
    if (providerPref === "gemini" || (providerPref === "auto" && trimmed.startsWith("AIza"))) {
      return {
        provider: "gemini",
        name: "Google Gemini",
        model: "gemini-2.5-flash (High-Speed & Free Tier)",
        badgeClass:
          "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50",
        pillText: "Google Gemini",
        icon: Sparkles,
      };
    }

    if (providerPref === "groq" || (providerPref === "auto" && trimmed.startsWith("gsk_"))) {
      return {
        provider: "groq",
        name: "Groq LPU",
        model: "llama-3.3-70b-versatile (~300 tokens/sec)",
        badgeClass:
          "bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700/50",
        pillText: "Groq LPU",
        icon: Zap,
      };
    }

    if (providerPref === "openrouter" || (providerPref === "auto" && trimmed.startsWith("sk-or-"))) {
      return {
        provider: "openrouter",
        name: "OpenRouter",
        model: "meta-llama/llama-3.3-70b-instruct:free",
        badgeClass:
          "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700/50",
        pillText: "OpenRouter",
        icon: Globe,
      };
    }

    if (providerPref === "openai") {
      return {
        provider: "openai",
        name: "OpenAI Direct",
        model: "gpt-4o-mini (api.openai.com)",
        badgeClass:
          "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700/50",
        pillText: "OpenAI Direct",
        icon: Cpu,
      };
    }

    // When empty & auto
    if (!trimmed && providerPref === "auto") {
      return {
        provider: "none",
        name: "Auto-Detecting Provider",
        model: "Paste Vyce AI, Gemini, Groq, OpenRouter, or OpenAI Key",
        badgeClass:
          "bg-slate-100 dark:bg-[#141C2E] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10",
        pillText: "Ready for Key",
        icon: Key,
      };
    }

    // Vyce AI Gateway
    const currentModelLabel =
      config.model && config.model !== "auto" && config.model !== "hybrid"
        ? config.model
        : "Hybrid (deepseek-v4-flash + claude-sonnet-4-6)";

    return {
      provider: "vyce",
      name: "Vyce AI Gateway",
      model: `${currentModelLabel} via vyceai.com/v1`,
      badgeClass:
        "bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-300 dark:border-violet-700/50",
      pillText: "Vyce AI Gateway",
      icon: Bot,
    };
  };

  const detected = getProviderInfo(activeKey, selectedProvider);
  const DetectedIcon = detected.icon;
  const isVyceActive = detected.provider === "vyce" || selectedProvider === "vyce";

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
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7"
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
                100% Client-Side • Vyce AI, Gemini, Groq, OpenRouter & OpenAI
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
            <span>Pro Studio Hybrid Setup (Vyce AI)</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Requests are automatically routed to your unlocked high-speed models at <strong className="font-mono text-violet-400">https://vyceai.com/v1</strong>:
            <span className="font-mono text-[11px] block mt-1.5 text-slate-800 dark:text-slate-200 space-y-0.5">
              • <strong className="text-violet-400">Radar Synthesis (/api/synthesize)</strong>: deepseek-v4-flash (1M ctx / high-speed) <br />
              • <strong className="text-violet-400">Script Studio (/api/script)</strong>: claude-sonnet-4-6 (5-Act cinematic screenplay) <br />
              • <strong className="text-slate-400">Fallback models</strong>: deepseek-v4.1, beam-1.0 (free promo), agnes-3.0-flash (free)
            </span>
          </p>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Provider Selection Preference */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>AI Gateway Routing Mode</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Choose explicit provider or auto-detect
              </span>
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
            >
              <option value="auto">Auto-Detect (Routes to Vyce AI, Gemini, Groq, or OpenRouter by Prefix)</option>
              <option value="vyce">Vyce AI Gateway (https://vyceai.com/v1)</option>
              <option value="gemini">Google Gemini (aistudio.google.com)</option>
              <option value="groq">Groq LPU (console.groq.com)</option>
              <option value="openrouter">OpenRouter (openrouter.ai)</option>
              <option value="openai">OpenAI Direct (api.openai.com)</option>
            </select>
          </div>

          {/* Universal AI API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <DetectedIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>Universal AI API Key</span>
              </label>

              {/* Provider Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border transition-colors ${detected.badgeClass}`}
              >
                <span>{detected.pillText}</span>
              </span>
            </div>

            <div className="relative">
              <input
                type="password"
                value={activeKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="vyce-... or sk-... or AIza... or gsk_... or sk-or-..."
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
                  href="https://vyceai.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Vyce AI</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span>•</span>
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

          {/* Vyce AI Dynamic Model Selector */}
          {isVyceActive && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-white/5">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-violet-500" />
                  <span>Vyce AI Model (Unlocked Account Models)</span>
                </span>
                <span className="text-[11px] font-mono text-violet-600 dark:text-violet-400">
                  via vyceai.com/v1
                </span>
              </label>

              <select
                value={config.model || "hybrid"}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-violet-500/50 outline-none"
              >
                {VYCE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <strong className="text-slate-700 dark:text-slate-300">Hybrid Default:</strong> uses <strong className="text-violet-400">deepseek-v4-flash</strong> for rapid headline dot-connecting and <strong className="text-violet-400">claude-sonnet-4-6</strong> for the final documentary narration script.
              </p>
            </div>
          )}

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
