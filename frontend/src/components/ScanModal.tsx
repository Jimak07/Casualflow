"use client";

import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  Radar,
  Radio,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  ArrowRight,
} from "lucide-react";

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInjectNewStory: () => void;
}

const SCAN_STEPS = [
  "Connecting to Reuters World Economy & FT Commodities feeds...",
  "Querying London Metal Exchange & European Power Grid spot prices...",
  "Cross-referencing 2001-2008 historical macroeconomic parallels...",
  "Synthesizing 3-Node Causal Timeline with everyday human impact...",
  "Formatting CapCut visual cues and TTS voiceover screenplay...",
];

export const ScanModal: React.FC<ScanModalProps> = ({
  isOpen,
  onClose,
  onInjectNewStory,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setIsComplete(false);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < SCAN_STEPS.length - 1) {
          return prev + 1;
        } else {
          setIsComplete(true);
          clearInterval(interval);
          return prev;
        }
      });
    }, 750);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0E131F] border border-blue-500/40 shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Top Radial Glow inside modal */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          {/* Animated Radar Pulse Graphic */}
          <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-60" />
            <div className="absolute inset-2 rounded-full border border-blue-400/50 animate-spin" style={{ animationDuration: "6s" }} />
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 ring-4 ring-blue-500/20">
              <Radar className="w-7 h-7 animate-pulse-subtle" />
            </div>
          </div>

          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
            {isComplete ? "Macro Radar Synthesis Complete" : "Scanning Global Feeds"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-6">
            Autonomous 3-Node Causal Intelligence Engine
          </p>

          {/* Stepper logs */}
          <div className="w-full bg-slate-50 dark:bg-[#06080F] rounded-xl p-4 border border-slate-200 dark:border-white/10 text-left font-mono text-xs space-y-2.5 mb-6">
            {SCAN_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex && !isComplete;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 transition-colors ${
                    isPast
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isCurrent
                      ? "text-blue-600 dark:text-blue-400 font-bold"
                      : "text-slate-400 dark:text-slate-600"
                  }`}
                >
                  <span className="shrink-0 mt-0.5">
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-700" />
                    )}
                  </span>
                  <span className="leading-tight">{step}</span>
                </div>
              );
            })}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-[#141C2E] dark:hover:bg-[#1E293B] transition-colors"
            >
              Cancel
            </button>

            {isComplete && (
              <button
                onClick={() => {
                  onInjectNewStory();
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
              >
                <span>Load Discovered Story</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
