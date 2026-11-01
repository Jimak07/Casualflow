"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  ArrowRight,
  Zap,
  History,
  Users,
  Check,
  Cpu,
} from "lucide-react";
import { StoryPitch } from "@/types";

interface StoryGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onStoryGenerated: (story: StoryPitch) => void;
}

export const StoryGeneratorModal: React.FC<StoryGeneratorModalProps> = ({
  isOpen,
  onClose,
  query,
  onStoryGenerated,
}) => {
  const [topic, setTopic] = useState(query || "AI CapEx vs 2006 Financial Crash");
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      // Synthesize a realistic 3-node documentary story tailored to the user's curiosity query
      const newStory: StoryPitch = {
        id: `gen-${Date.now()}`,
        title: `The Echo Effect: How "${topic}" Connects to History & Your Wallet`,
        subtitle: `An autonomous synthesis investigating how the macro shockwaves around "${topic}" mirror historical market inflection points and filter down to consumer pricing.`,
        category: topic.toLowerCase().includes("ai") ? "AI × Financial Markets" : "Cost of Living & Raw Materials",
        estimatedRuntime: "7 min 30 sec",
        wordCount: 1180,
        targetFormat: "YouTube Video Essay / Deep Dive",
        date: "Generated Just Now",
        impactScore: 95,
        sourceCatalyst: {
          outlet: "Autonomous Causal Engine",
          timeAgo: "Just now",
          headline: `Live News Synthesis: "${topic}"`,
        },
        nodes: {
          macroTrigger: {
            title: `Macro Catalyst: ${topic}`,
            date: "Current Market Event",
            description: `Recent institutional flow shifts and regulatory declarations regarding ${topic} are forcing capital reallocation across major asset managers.`,
            metricTag: "+42% Capital Volatility",
            source: "Global Macro Intelligence Desk",
          },
          historicalParallel: {
            title: "The 2006–2008 Structural Echo",
            period: "2006–2008 Historical Parallels",
            description: `When early stage valuation models decoupled from underlying operational yields, the financial system relied on secondary collateral swaps before true price discovery settled.`,
            similarityScore: "88% Dynamic Correlation",
            lesson: "The true cost of rapid expansion is always paid during the consolidation phase.",
          },
          humanImpact: {
            title: "Downstream Household Cost Rebalancing",
            affectedGroup: "Working Families & Consumers",
            description: `As suppliers absorb higher financing costs and operational restructuring, finished goods and municipal services pass an estimated 8-12% surcharge directly to end users.`,
            dollarOrPriceMetric: "+$65/mo Average Expense",
            actionableTakeaway: "Hedge household expenditures against short-term consumer credit rate volatility.",
          },
        },
        script: {
          coldOpen: {
            title: `COLD OPEN: The Domino Effect of ${topic}`,
            timestamp: "0:00 – 1:15",
            visualCue:
              "[CAPCUT CUES]\n• Fast-paced cinematic montage: High-frequency trading displays → historical newspaper headlines → modern kitchen table bills.\n• Text overlay: 'THE CAUSAL CHAIN: 3 NODES, 1 CONCLUSION'.\n• Audio SFX: Bass drop followed by heartbeat rhythm.",
            narration: `Most news stories tell you what happened ten minutes ago.\n\nThey show you stock tickers, politician press conferences, and corporate earnings reports. But what almost nobody explains is the hidden thread that connects those headlines to the money inside your pocket.\n\nWhen we look at ${topic}, we are not just looking at isolated news. We are looking at the exact same economic trap door that opened twenty years ago. And if you understand the pattern, you can see exactly where the falling dominoes will land.`,
          },
          actI: {
            title: "ACT I: The Catalyst Unfolds",
            timestamp: "1:15 – 3:15",
            visualCue:
              "[CAPCUT CUES]\n• Animated infographic explaining the macro catalyst step-by-step.\n• Sound design: Camera clicks, paper rustling, low sub-bass drone.",
            narration: `To see the full picture, you have to peel back the surface.\n\nThe real trigger behind ${topic} is not what is being reported in thirty-second television soundbites. It is about capital allocation. When billions of dollars flow into a single asset class without corresponding consumer demand, an invisible imbalance begins to build beneath the surface of the entire economy.`,
          },
          actII: {
            title: "ACT II: The 20-Year Historical Rhyme",
            timestamp: "3:15 – 5:30",
            visualCue:
              "[CAPCUT CUES]\n• Archival footage split-screen comparing past historical crises with current events.\n• High contrast text cards highlighting uncanny similarities.",
            narration: `Human nature does not change, and neither do financial cycles.\n\nTwenty years ago, market participants made the exact same assumptions. They believed that new technology and financial engineering had eliminated old economic rules. But history has a brutal way of reminding us that every debt must be settled, and every overbuilt network must find someone willing to pay the electric bill.`,
          },
          actIII: {
            title: "ACT III: The Direct Human Impact",
            timestamp: "5:30 – 7:30",
            visualCue:
              "[CAPCUT CUES]\n• Intimate B-roll of everyday family life: Grocery shopping, filling up gas, reviewing monthly bank statements.\n• Clear summary graphic with 3 key takeaway bullet points.",
            narration: `And that brings us to the final node in the causal chain: you.\n\nWall Street will survive. Venture capitalists will move on to the next trend. But the ripple effect of this imbalance will show up in the cost of your groceries, the interest rate on your car loan, and the price of your electricity.\n\nThe dots have always been connected. Now, you know how to see them before the bill arrives.`,
          },
        },
      };

      setIsGenerating(false);
      onStoryGenerated(newStory);
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0E131F] border border-blue-500/30 shadow-2xl p-6 sm:p-7 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Connect Dots with AI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synthesize a 3-Node Causal Documentary Pitch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 mt-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
              Curiosity Prompt or News Hook
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., What's up with AI, stocks & 2006 trends?"
              className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-white/10 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#141C2E] border border-slate-200 dark:border-white/5 space-y-2 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">
              Autonomous Synthesis Blueprint:
            </span>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Zap className="w-3.5 h-3.5" />
              <span>Node 1: Extract real-time macro trigger & financial flow</span>
            </div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <History className="w-3.5 h-3.5" />
              <span>Node 2: Pinpoint 10–30 year historical parallel (e.g. 2006 CapEx)</span>
            </div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Users className="w-3.5 h-3.5" />
              <span>Node 3: Calculate direct micro-economic impact on household bills</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141C2E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-blue-200" />
                  <span>Synthesizing 3 Nodes...</span>
                </>
              ) : (
                <>
                  <span>Synthesize Story Pitch</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
