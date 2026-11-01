"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { CuriosityBar } from "@/components/CuriosityBar";
import { StoryPitchCard } from "@/components/StoryPitchCard";
import { StorySkeletonCard } from "@/components/StorySkeletonCard";
import { ScriptStudio } from "@/components/ScriptStudio";
import { ApiKeysModal } from "@/components/ApiKeysModal";
import { AddPresetModal } from "@/components/AddPresetModal";
import { ScanModal } from "@/components/ScanModal";
import { StoryGeneratorModal } from "@/components/StoryGeneratorModal";
import { MOCK_STORIES, DEFAULT_PRESETS } from "@/data/mockStories";
import { StoryPitch, ScriptSection, DocumentaryScript, LensPreset, ApiKeysConfig } from "@/types";
import { getStorySections } from "@/utils/scriptHelper";
import { API_ENDPOINTS } from "@/lib/api";
import {
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  Compass,
  AlertCircle,
  Key,
  X,
  CheckCircle2,
  Radio,
} from "lucide-react";

export default function Home() {
  // Theme state: dark mode by default
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Stories and presets
  const [stories, setStories] = useState<StoryPitch[]>(MOCK_STORIES);
  const [selectedStory, setSelectedStory] = useState<StoryPitch | null>(MOCK_STORIES[0]);
  const [presets, setPresets] = useState<LensPreset[]>(DEFAULT_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Loading and synthesizing state
  const [isScanning, setIsScanning] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [liveHeadlineCount, setLiveHeadlineCount] = useState<number>(45);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "info" | "success" | "warning";
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Modals
  const [isApiKeysOpen, setIsApiKeysOpen] = useState(false);
  const [isAddPresetOpen, setIsAddPresetOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorQuery, setGeneratorQuery] = useState("");

  // Mobile navigation tab: "radar" | "studio"
  const [mobileActiveTab, setMobileActiveTab] = useState<"radar" | "studio">("radar");

  const showToast = useCallback(
    (
      text: string,
      type: "info" | "success" | "warning" = "info",
      actionLabel?: string,
      onAction?: () => void
    ) => {
      setToastMessage({ text, type, actionLabel, onAction });
      setTimeout(() => {
        setToastMessage(null);
      }, 5500);
    },
    []
  );

  // Load custom presets, cached stories, and theme on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Theme initialization
      const savedTheme = localStorage.getItem("causalflow_theme");
      if (savedTheme === "light") {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      } else {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }

      // 2. Custom Presets initialization
      const savedPresets = localStorage.getItem("causalflow_custom_presets");
      if (savedPresets) {
        try {
          const parsed = JSON.parse(savedPresets);
          setPresets([...DEFAULT_PRESETS, ...parsed]);
        } catch (e) {
          console.error("Failed to load presets", e);
        }
      }

      // 3. Cached Generated Stories initialization (preserves last scan!)
      const savedStories = localStorage.getItem("causalflow_stories");
      if (savedStories) {
        try {
          const parsedStories = JSON.parse(savedStories);
          if (Array.isArray(parsedStories) && parsedStories.length > 0) {
            setStories(parsedStories);
            setSelectedStory(parsedStories[0]);
          }
        } catch (e) {
          console.error("Failed to load saved stories", e);
        }
      }
    }
  }, []);

  // Theme toggle
  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        localStorage.setItem("causalflow_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        localStorage.setItem("causalflow_theme", "light");
      }
      return next;
    });
  };

  // Add custom preset
  const handleAddPreset = (newPreset: LensPreset) => {
    const updated = [...presets, newPreset];
    setPresets(updated);
    setActivePresetId(newPreset.id);

    // Save custom presets to localStorage
    const customOnly = updated.filter((p) => p.isCustom);
    localStorage.setItem("causalflow_custom_presets", JSON.stringify(customOnly));
  };

  // Update story script in state and localStorage
  const handleUpdateStoryScript = (
    storyId: string,
    updatedSections: ScriptSection[]
  ) => {
    setStories((prev) =>
      prev.map((s) =>
        s.id === storyId
          ? {
              ...s,
              script: {
                ...s.script,
                sections: updatedSections,
              },
            }
          : s
      )
    );
    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory((prev) =>
        prev
          ? {
              ...prev,
              script: {
                ...prev.script,
                sections: updatedSections,
              },
            }
          : null
      );
    }
  };

  // Reset script in state
  const handleResetStoryScript = (storyId: string) => {
    const original = MOCK_STORIES.find((s) => s.id === storyId);
    if (original) {
      const defaultSections = getStorySections(original);
      handleUpdateStoryScript(storyId, defaultSections);
    }
  };

  // Core Autonomous Dot-Connector Synthesis Pipeline
  const runLiveSynthesis = async (
    targetQuery?: string,
    targetPresetId?: string
  ) => {
    setIsScanning(true);
    setIsSynthesizing(true);

    try {
      // 1. Ingest live headlines from keyless RSS feeds
      const radarRes = await fetch(API_ENDPOINTS.radar);
      const radarData = await radarRes.json();
      const headlines = radarData.headlines || [];
      if (headlines.length > 0) {
        setLiveHeadlineCount(headlines.length);
      }

      // 2. Retrieve user's Groq key from localStorage
      let groqKey = "";
      if (typeof window !== "undefined") {
        const savedKeys = localStorage.getItem("causalflow_api_keys");
        if (savedKeys) {
          try {
            const parsed = JSON.parse(savedKeys);
            groqKey = parsed.groqKey || "";
          } catch (e) {
            console.error("Failed to parse api keys", e);
          }
        }
      }

      // 3. If no key is entered, prompt the user with a friendly blue toast and fallback cleanly
      if (!groqKey) {
        setIsScanning(false);
        setIsSynthesizing(false);

        showToast(
          "💡 Connect your free Groq API key ($0 Stack) in settings to run live AI synthesis across 45 feeds!",
          "info",
          "Open Settings",
          () => setIsApiKeysOpen(true)
        );

        // Still inject a fresh simulated live discovery so the user experiences the UI flow immediately
        handleInjectDiscovery();
        return;
      }

      // 4. Call /api/synthesize with live headlines & user lens
      const synthRes = await fetch(API_ENDPOINTS.synthesize, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headlines,
          preset: targetPresetId || activePresetId,
          customQuery: targetQuery || searchQuery || "",
          groqKey,
        }),
      });

      const synthData = await synthRes.json();

      if (!synthRes.ok || !synthData.success) {
        throw new Error(synthData.message || "Failed to synthesize story pitches.");
      }

      const rawPitches = synthData.pitches || [];

      // 5. Map returned pitches to frontend StoryPitch type
      const mappedPitches: StoryPitch[] = rawPitches.map((p: any, idx: number) => {
        const categoryMap: Record<string, string> = {
          "ai-finance": "AI × Financial Markets",
          geopolitics: "Geopolitics & Supply Chains",
          "macro-crisis": "Cost of Living & Raw Materials",
        };

        const resolvedCategory =
          categoryMap[p.category] || p.category || "AI × Financial Markets";

        return {
          id: p.id || `live-pitch-${Date.now()}-${idx}`,
          title: p.title || "Autonomous Documentary Investigation",
          subtitle:
            p.subtitle ||
            `${p.macro?.description || ""} Connecting to ${p.historyShort || "historical precedents"}.`,
          category: resolvedCategory,
          estimatedRuntime: p.runtime || "11m 40s (~1,700 words)",
          wordCount: 1680,
          targetFormat: "YouTube Deep Dive / Investigative Documentary",
          date: "Live AI Synthesis",
          impactScore:
            parseInt(String(p.badge || "").replace(/[^0-9]/g, "") || "95") || 95,
          badge: p.badge || "Live Macro Synthesis",
          searchQueries: p.searchQueries || [],
          sourceCatalyst: {
            outlet: (p.sources && p.sources[0]) || "Live Global Feeds",
            timeAgo: "Just now",
            headline: p.macro?.title || p.title,
          },
          nodes: {
            macroTrigger: {
              title: p.macro?.title || "Live Macro Catalyst",
              date: p.macro?.date || "Current Cycle",
              description: p.macro?.description || "",
              metricTag: p.macro?.metricTag || "+48% Market Volatility",
              source:
                p.macro?.source ||
                (p.sources && p.sources.join(", ")) ||
                "Live News Feeds",
            },
            historicalParallel: {
              title: p.history?.title || p.historyShort || "Historical Parallel",
              period: p.history?.period || "Historical Precedent",
              description: p.history?.description || "",
              similarityScore: p.history?.similarityScore || "89% Structural Echo",
              lesson:
                p.history?.lesson ||
                "Economic dynamics repeat in capital allocation cycles.",
            },
            humanImpact: {
              title: p.micro?.title || "Everyday Human Impact",
              affectedGroup: p.micro?.affectedGroup || "Everyday Consumers & Households",
              description: p.micro?.description || "",
              dollarOrPriceMetric:
                p.micro?.dollarOrPriceMetric || "+$42/mo Average Surcharge",
              actionableTakeaway:
                p.micro?.actionableTakeaway ||
                "Watch wholesale utility and local tax commission repricing notices.",
            },
          },
          script: p.script || {
            coldOpen: {
              title: `COLD OPEN: ${p.title}`,
              timestamp: "0:00 – 1:15",
              visualCue: `[CAPCUT CUES]\n• Fast-paced news montage: ${p.sources?.join(" & ") || "Global reporting"}\n• Drone shot of industrial power grid and busy financial district\n• Audio SFX: Heavy metallic drop, digital heartbeat`,
              narration: `Most news anchors will tell you what happened in the headlines this morning.\n\nThey cite earnings and politician speeches. But what they don't show you is how ${p.macro?.title || "this catalyst"} is connected to ${p.historyShort || "history"}.\n\nAnd more importantly, how it lands directly on your monthly expenses.`,
            },
            actI: {
              title: `ACT I: THE MACRO TRIGGER`,
              timestamp: "1:15 – 3:30",
              visualCue: `[CAPCUT CUES]\n• Animated infographic: ${p.macro?.metricTag || "Market Shift"}\n• News clips from ${p.sources?.join(", ") || "global reporting"}`,
              narration:
                p.macro?.description ||
                "Behind the immediate news cycle lies a larger shift in global capital allocation...",
            },
            actII: {
              title: `ACT II: ${p.historyShort || "THE HISTORICAL ECHO"}`,
              timestamp: "3:30 – 6:00",
              visualCue: `[CAPCUT CUES]\n• Archival footage grain: ${p.history?.period || "Past Decades"}\n• Split-screen historical comparison`,
              narration:
                p.history?.description ||
                "Decades ago, we witnessed this exact same economic mechanism...",
            },
            actIII: {
              title: `ACT III: THE EVERYDAY HUMAN IMPACT`,
              timestamp: "6:00 – 8:45",
              visualCue: `[CAPCUT CUES]\n• Grocery receipts, utility meters, suburban homes\n• Recap graphic: Macro Trigger → History → Your Wallet`,
              narration:
                p.micro?.description ||
                "Which brings us to the final question: how does this affect you?",
            },
          },
        };
      });

      // 6. Update state, cache in localStorage, and auto-select
      const mergedStories = [...mappedPitches, ...stories];
      setStories(mergedStories);
      setSelectedStory(mappedPitches[0]);
      localStorage.setItem("causalflow_stories", JSON.stringify(mergedStories));

      showToast(
        `✓ Autonomous Dot-Connector synthesized ${mappedPitches.length} live documentary pitches!`,
        "success"
      );
    } catch (err: any) {
      console.error("Live synthesis error:", err);
      showToast(
        `Synthesis failed: ${err.message || "Network error"}. Showing curated pitches.`,
        "warning",
        "API Settings",
        () => setIsApiKeysOpen(true)
      );
    } finally {
      setIsScanning(false);
      setIsSynthesizing(false);
    }
  };

  // Helper to inject a fresh discovery when scanning without an API key
  const handleInjectDiscovery = () => {
    const discoveryStory: StoryPitch = {
      id: `discovered-${Date.now()}`,
      title: "The Transformer Shortage: Why AI Grid Demands Are Triggering 1970s Power Blackout Rules",
      subtitle: "High-voltage step-up transformers face a 4-year lead time from Siemens and Hitachi. Regulators in Texas and Germany are reviving emergency industrial brownout protocols.",
      category: "Geopolitics & Supply Chains",
      estimatedRuntime: "8 min 15 sec",
      wordCount: 1220,
      targetFormat: "YouTube Investigative Essay",
      date: "Discovered by Live Radar",
      impactScore: 98,
      sourceCatalyst: {
        outlet: "Reuters Energy & IEA Report",
        timeAgo: "15 minutes ago",
        headline: "High Voltage Substation Transformer Lead Times Extend to 210 Weeks Globally",
      },
      nodes: {
        macroTrigger: {
          title: "Critical Grid Transformer Backlog (210 Weeks)",
          date: "Current Supply Chain Crisis",
          description:
            "Grain-oriented electrical steel (GOES) production caps have pushed lead times for 500kV step-up transformers past four years, exactly as massive 1-Gigawatt AI data campuses break ground.",
          metricTag: "210-Week Manufacturer Backlog",
          source: "International Energy Agency",
        },
        historicalParallel: {
          title: "The 1970s Energy Crisis & Industrial Load Shedding",
          period: "1973–1979 Historical Parallel",
          description:
            "During the 1970s oil shocks, electrical utilities instituted 'rolling interruptible industrial tariffs'. Manufacturing facilities received discounted rates in exchange for having power cut during peak residential heating hours.",
          similarityScore: "91% Grid Fragility Correlation",
          lesson: "When physical capital stock cannot expand, the grid is forced into state-directed rationing.",
        },
        humanImpact: {
          title: "Summer Peak Air Conditioning Curtailment",
          affectedGroup: "Sunbelt Homeowners & Suburban Commuters",
          description:
            "Regional utilities are rolling out mandatory smart thermostat override programs, cycling residential compressors during peak 4 PM to 8 PM windows to prevent substation transformer melt-downs.",
          dollarOrPriceMetric: "Mandatory 3°F Thermostat Overrides",
          actionableTakeaway: "Opt into voluntary utility battery storage rebates before mandatory curtailment orders take effect.",
        },
      },
      script: {
        coldOpen: {
          title: "COLD OPEN: The 4-Year Waiting List for Electricity",
          timestamp: "0:00 – 1:15",
          visualCue:
            "[CAPCUT CUES]\n• 0:00-0:15: Giant flatbed trailer carrying a massive 300-ton electrical transformer down an empty desert highway at sunset.\n• Audio SFX: Heavy metallic grinding, deep electrical hum, radio static.\n• Lower third: 'SIEMENS ENERGY SUBSTATION // BACKLOG: 4 YEARS'.",
          narration:
            "If you want to build the world's most advanced artificial intelligence model, you don't just need software engineers, algorithms, and microchips.\n\nYou need a three-hundred-ton block of grain-oriented electrical steel and mineral oil called a step-up transformer. And right now, if you call the factory in Germany to order one, they will politely tell you that your delivery date is late 2028.\n\nWe built the fastest computing engines in human history, but we forgot that they have to plug into a power grid designed during the Eisenhower administration.",
        },
        actI: {
          title: "ACT I: The Grain-Oriented Steel Bottleneck",
          timestamp: "1:15 – 3:30",
          visualCue:
            "[CAPCUT CUES]\n• Exploded 3D animation showing how high-voltage transformers work.\n• Map overlay: Only 4 steel mills in the world can roll electrical-grade transformer core steel.",
          narration:
            "A high-voltage transformer is not a gadget you can scale up in a cleanroom. It is heavy, dangerous industrial machinery.\n\nOnly a handful of steel mills on the planet have the metallurgical capability to align iron crystals so tightly that electricity passes through without melting the core. When five different trillion-dollar tech conglomerates all try to triple their grid capacity in the same three-year window, the supply chain doesn't just bend. It snaps.",
        },
        actII: {
          title: "ACT II: Lessons from the 1973 Rolling Curtailments",
          timestamp: "3:30 – 5:45",
          visualCue:
            "[CAPCUT CUES]\n• Archival footage: 1970s brownouts in New York and London.\n• Side-by-side news clippings: 'VOLTAGE REDUCED 5% ACROSS TRI-STATE AREA'.",
          narration:
            "In 1973, when fuel supplies tightened, power companies didn't let the entire grid collapse. They instituted what engineers call 'load shedding'.\n\nThey dialed down the voltage by five percent, causing lights to dim and industrial motors to slow. They paid aluminum smelters to turn off their furnaces for six hours at a time. It was a stark reminder that modern civilization lives exactly one transmission failure away from the pre-industrial age.",
        },
        actIII: {
          title: "ACT III: The Remote Control on Your Wall",
          timestamp: "5:45 – 8:15",
          visualCue:
            "[CAPCUT CUES]\n• Smart thermostat display clicking from 72°F to 76°F with an 'EVENT IN PROGRESS' banner.\n• Recap graphic: The 3 Nodes (Backlog → 1973 Echo → Your Living Room).",
          narration:
            "This summer, when temperatures hit one hundred degrees in Texas and California, your power company won't ask for permission.\n\nThrough connected digital thermostats and smart meters, they will remotely cycle your air conditioning compressor off for twenty minutes every hour. They will call it 'peak demand response'.\n\nIn reality, it is the price of trying to build tomorrow's digital universe on yesterday's physical power lines.",
        },
      },
    };

    const updated = [discoveryStory, ...stories];
    setStories(updated);
    setSelectedStory(discoveryStory);
    localStorage.setItem("causalflow_stories", JSON.stringify(updated));
  };

  // Handle Connect Dots search submit
  const handleConnectDots = (query: string) => {
    if (!query.trim()) return;

    // Check if query matches any existing story
    const q = query.toLowerCase();
    const hasMatch = stories.some(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.nodes.macroTrigger.description.toLowerCase().includes(q) ||
        s.nodes.historicalParallel.description.toLowerCase().includes(q) ||
        s.nodes.humanImpact.description.toLowerCase().includes(q)
    );

    if (hasMatch) {
      setSearchQuery(query);
    } else {
      // Trigger live AI synthesis with custom user query
      runLiveSynthesis(query);
    }
  };

  // Add freshly generated story from curiosity bar
  const handleStoryGenerated = (newStory: StoryPitch) => {
    const updated = [newStory, ...stories];
    setStories(updated);
    setSelectedStory(newStory);
    setMobileActiveTab("studio");
    localStorage.setItem("causalflow_stories", JSON.stringify(updated));
  };

  // Filter stories based on active preset and search query
  const filteredStories = stories.filter((story) => {
    // 1. Preset filter
    const activePreset = presets.find((p) => p.id === activePresetId);
    if (activePreset && activePreset.id !== "all") {
      if (activePreset.queryFilter) {
        const filterStr = activePreset.queryFilter.toLowerCase();
        const matchesCategory = story.category.toLowerCase().includes(filterStr);
        const matchesContent =
          story.title.toLowerCase().includes(filterStr) ||
          story.nodes.macroTrigger.description.toLowerCase().includes(filterStr) ||
          story.nodes.historicalParallel.description.toLowerCase().includes(filterStr) ||
          story.nodes.humanImpact.description.toLowerCase().includes(filterStr);
        if (!matchesCategory && !matchesContent) return false;
      }
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        story.title.toLowerCase().includes(q) ||
        story.subtitle.toLowerCase().includes(q) ||
        story.category.toLowerCase().includes(q) ||
        story.nodes.macroTrigger.title.toLowerCase().includes(q) ||
        story.nodes.macroTrigger.description.toLowerCase().includes(q) ||
        story.nodes.historicalParallel.title.toLowerCase().includes(q) ||
        story.nodes.historicalParallel.description.toLowerCase().includes(q) ||
        story.nodes.humanImpact.title.toLowerCase().includes(q) ||
        story.nodes.humanImpact.description.toLowerCase().includes(q);
      if (!matches) return false;
    }

    return true;
  });

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode
          ? "bg-[#06080F] text-white radar-ambient-glow-dark"
          : "bg-[#F8FAFC] text-slate-900 radar-ambient-glow-light"
      }`}
    >
      {/* Dynamic Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-[calc(100%-2rem)] p-4 rounded-2xl bg-white dark:bg-[#0E131F] border border-blue-500/50 shadow-2xl shadow-blue-500/20 text-slate-900 dark:text-white text-xs sm:text-sm animate-in fade-in slide-in-from-top-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div>
              <p className="font-medium leading-relaxed">{toastMessage.text}</p>
              {toastMessage.actionLabel && toastMessage.onAction && (
                <button
                  onClick={() => {
                    toastMessage.onAction?.();
                    setToastMessage(null);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>{toastMessage.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOP NAVIGATION BAR */}
      <Navbar
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenApiKeys={() => setIsApiKeysOpen(true)}
        onScanNews={() => runLiveSynthesis()}
        isScanning={isScanning || isSynthesizing}
        mobileActiveTab={mobileActiveTab}
        onTabChange={(tab) => setMobileActiveTab(tab)}
        storyCount={filteredStories.length}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col gap-6">
        {/* 2. AI CURIOSITY BAR & HORIZONTAL LENS PRESETS */}
        <section className="w-full">
          <CuriosityBar
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            activePresetId={activePresetId}
            onSelectPreset={(id) => {
              setActivePresetId(id);
            }}
            presets={presets}
            onOpenAddPreset={() => setIsAddPresetOpen(true)}
            onConnectDots={handleConnectDots}
            storyMatchCount={filteredStories.length}
          />
        </section>

        {/* 3. RESPONSIVE SPLIT VIEW / SEGMENTED TAB VIEW */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Story Radar Feed & 3-Node Causal Cards */}
          <div
            className={`lg:col-span-5 flex flex-col space-y-4 ${
              mobileActiveTab === "radar" ? "block" : "hidden lg:block"
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                  Autonomous Story Radar
                </h2>
              </div>

              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {isSynthesizing ? "Synthesizing dots..." : `${filteredStories.length} active pitches`}
              </span>
            </div>

            {/* AI Dot-Connector Skeleton Shimmer State */}
            {isSynthesizing && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs font-mono text-blue-700 dark:text-blue-300">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-spin text-blue-500" />
                    <span>Connecting dots across {liveHeadlineCount} live global headlines...</span>
                  </div>
                  <span className="animate-pulse font-bold">Llama 3.3 70B</span>
                </div>
                <StorySkeletonCard />
                <StorySkeletonCard />
              </div>
            )}

            {/* List of 3-Node Causal Cards */}
            {!isSynthesizing && filteredStories.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  No stories found for this lens
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Try asking in the Curiosity Bar or click &quot;Scan Live News&quot; to discover fresh macro catalysts.
                </p>
                <button
                  onClick={() => {
                    setActivePresetId("all");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              !isSynthesizing && (
                <div className="space-y-4">
                  {filteredStories.map((story) => (
                    <StoryPitchCard
                      key={story.id}
                      story={story}
                      isSelected={selectedStory?.id === story.id}
                      onSelect={(st) => {
                        setSelectedStory(st);
                        // On mobile, auto-switch to studio view so user immediately sees their script
                        if (window.innerWidth < 1024) {
                          setMobileActiveTab("studio");
                        }
                      }}
                    />
                  ))}
                </div>
              )
            )}
          </div>

          {/* RIGHT COLUMN: Block-Based Documentary Script Studio */}
          <div
            className={`lg:col-span-7 h-full min-h-[600px] lg:sticky lg:top-20 ${
              mobileActiveTab === "studio" ? "block" : "hidden lg:block"
            }`}
          >
            <ScriptStudio
              selectedStory={selectedStory}
              onUpdateStoryScript={handleUpdateStoryScript}
              onResetStoryScript={handleResetStoryScript}
              onOpenApiKeys={() => setIsApiKeysOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#06080F]/80 py-4 px-4 sm:px-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              CausalFlow Studio
            </span>
            <span>•</span>
            <span>Autonomous Documentary Intelligence</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              $0 Stack Compatible (Groq + Tavily)
            </span>
            <span>•</span>
            <span>Local Storage Client Mode</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <ApiKeysModal
        isOpen={isApiKeysOpen}
        onClose={() => setIsApiKeysOpen(false)}
        onSaveKeys={(keys: ApiKeysConfig) => {
          showToast("✓ API Key saved locally! Ready for live Groq synthesis.", "success");
        }}
      />

      <AddPresetModal
        isOpen={isAddPresetOpen}
        onClose={() => setIsAddPresetOpen(false)}
        onAddPreset={handleAddPreset}
      />

      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onInjectNewStory={handleInjectDiscovery}
      />

      <StoryGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        query={generatorQuery}
        onStoryGenerated={handleStoryGenerated}
      />
    </div>
  );
}
