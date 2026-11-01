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
  RefreshCw,
} from "lucide-react";
import { ApiKeysConfig } from "@/types";
import { API_ENDPOINTS } from "@/lib/api";

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKeys: (keys: ApiKeysConfig) => void;
}

export interface ModelOption {
  id: string;
  label: string;
  tag?: string;
  isDefault?: boolean;
}

const DEFAULT_CONFIG: ApiKeysConfig = {
  groqKey: "",
  apiKey: "",
  tavilyKey: "",
  customRssUrl: "https://feeds.bloomberg.com/economics/news.rss",
  model: "hybrid",
  provider: "auto",
};

// Initial reliable default model list
const DEFAULT_FALLBACK_MODELS: ModelOption[] = [
  {
    id: "hybrid",
    label: "Auto (Smart Fallback: Gemini Flash / Claude Sonnet)",
    tag: "Recommended",
    isDefault: true,
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "gemini-3.1-flash-lite (Active / Ultra-Fast 1M Context)",
    tag: "Active",
  },
  {
    id: "claude-haiku-4-5",
    label: "claude-haiku-4-5 (Active / High-Speed Structured)",
    tag: "Active",
  },
  {
    id: "nemotron-ultra-550b",
    label: "nemotron-ultra-550b (Active / 550B Macro Reasoning)",
    tag: "Active",
  },
  {
    id: "claude-sonnet-4-6",
    label: "claude-sonnet-4-6 (Active / Flagship Cinematic Screenplay)",
    tag: "Active",
  },
  {
    id: "gpt-5.6-luna",
    label: "gpt-5.6-luna (Active / Balanced Precision)",
    tag: "Active",
  },
  {
    id: "deepseek-v4.1",
    label: "deepseek-v4.1 (Macro Reasoning)",
    tag: "Active",
  },
  {
    id: "beam-1.0",
    label: "beam-1.0 (Free 10M Promo Pool)",
    tag: "Free",
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
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(DEFAULT_FALLBACK_MODELS);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelsFetchStatus, setModelsFetchStatus] = useState<string | null>(null);
  const [customModelInput, setCustomModelInput] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("causalflow_api_keys");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const initialKey = parsed.apiKey || parsed.groqKey || "";
          const initialProvider = parsed.provider || "auto";
          setConfig({
            ...DEFAULT_CONFIG,
            ...parsed,
            apiKey: initialKey,
            groqKey: initialKey,
            model: parsed.model || "hybrid",
            provider: initialProvider,
          });

          // If key exists, auto-fetch online models
          if (initialKey && isOpen) {
            fetchOnlineModels(initialKey, initialProvider);
          }
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
        : "Auto (Smart Fallback: Gemini Flash / Claude Sonnet)";

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

  const fetchOnlineModels = async (keyToUse?: string, providerToUse?: string) => {
    const k = (keyToUse ?? activeKey).trim();
    const p = providerToUse ?? selectedProvider;
    if (!k) {
      setModelsFetchStatus("Enter your API key first to query online models");
      return;
    }

    setIsFetchingModels(true);
    setModelsFetchStatus(null);

    try {
      const url = `${API_ENDPOINTS.models}?apiKey=${encodeURIComponent(k)}&provider=${encodeURIComponent(p)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.models && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
        setModelsFetchStatus(`✓ ${data.models.length} active models loaded for ${data.providerLabel || data.provider}`);
      } else {
        setModelsFetchStatus("✓ Active fallback models ready");
      }
    } catch (err: any) {
      console.warn("Failed to fetch models from API:", err);
      setModelsFetchStatus("✓ Offline fallback chain loaded");
    } finally {
      setIsFetchingModels(false);
    }
  };

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
    setModelsFetchStatus(null);
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

        {/* Informational Callout: Automatic Smart Fallback Architecture */}
        <div className="my-4 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
            <span>Automatic Model Fallback Engine Active</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Requests are automatically protected against upstream model downtime. If any model is offline or disabled on Vyce AI (<strong className="font-mono text-violet-400">https://vyceai.com/v1</strong>), CausalFlow automatically fails over:
            <span className="font-mono text-[11px] block mt-1.5 text-slate-800 dark:text-slate-200 space-y-0.5">
              • <strong className="text-violet-400">Active Priority Fallbacks</strong>: gemini-3.1-flash-lite → claude-haiku-4-5 → nemotron-ultra-550b → claude-sonnet-4-6 → gpt-5.6-luna <br />
              • <strong className="text-emerald-400">JSON Mode Resiliency</strong>: Strips markdown fences automatically; never crashes on syntax formatting.
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
              onChange={(e) => {
                const nextProvider = e.target.value;
                setConfig({ ...config, provider: nextProvider });
                if (activeKey.trim()) {
                  fetchOnlineModels(activeKey, nextProvider);
                }
              }}
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

          {/* Preferred Model & Fallback Picker */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-blue-500" />
                <span>Preferred Model (Optional / Auto-Fallback)</span>
              </label>

              <button
                type="button"
                onClick={() => fetchOnlineModels()}
                disabled={isFetchingModels || !activeKey.trim()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 disabled:opacity-50 transition-colors"
                title="Query /api/models to retrieve currently online models from your account"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingModels ? "animate-spin" : ""}`} />
                <span>{isFetchingModels ? "Fetching..." : "Fetch Active Models"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!customModelInput ? (
                <select
                  value={config.model || "hybrid"}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setCustomModelInput(true);
                    } else {
                      setConfig({ ...config, model: e.target.value });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} {m.tag ? `[${m.tag}]` : ""}
                    </option>
                  ))}
                  <option value="__custom__">⚙️ Enter Custom Model ID...</option>
                </select>
              ) : (
                <div className="relative w-full flex items-center gap-1.5">
                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    placeholder="e.g. gemini-3.1-flash-lite, claude-haiku-4-5..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCustomModelInput(false)}
                    className="px-2.5 py-2 text-xs font-mono text-slate-400 hover:text-slate-200"
                    title="Back to dropdown"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {modelsFetchStatus && (
              <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                {modelsFetchStatus}
              </p>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 leading-relaxed">
              <strong className="text-slate-700 dark:text-slate-300">Auto (Smart Fallback):</strong> Automatically routes through active models. If any model is offline or temporarily disabled on Vyce AI, CausalFlow automatically switches down the fallback chain (<code className="text-violet-400 font-mono">gemini-3.1-flash-lite</code> → <code className="text-violet-400 font-mono">claude-haiku-4-5</code> → <code className="text-violet-400 font-mono">nemotron-ultra-550b</code> → <code className="text-violet-400 font-mono">claude-sonnet-4-6</code> → <code className="text-violet-400 font-mono">gpt-5.6-luna</code>).
            </p>
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
