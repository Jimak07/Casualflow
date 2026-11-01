"use client";

import React, { useState } from "react";
import { X, Plus, Sparkles, Compass } from "lucide-react";
import { LensPreset } from "@/types";

interface AddPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPreset: (preset: LensPreset) => void;
}

export const AddPresetModal: React.FC<AddPresetModalProps> = ({
  isOpen,
  onClose,
  onAddPreset,
}) => {
  const [label, setLabel] = useState("");
  const [queryFilter, setQueryFilter] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const newPreset: LensPreset = {
      id: `custom-${Date.now()}`,
      label: label.trim(),
      iconName: "Compass",
      queryFilter: queryFilter.trim() || label.trim(),
      isCustom: true,
    };

    onAddPreset(newPreset);
    setLabel("");
    setQueryFilter("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 shadow-2xl p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-400">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Create Custom Radar Lens
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
              Lens Name / Topic
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Semiconductor War & TSMC"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-white/10 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
              Filter Keyword (Optional)
            </label>
            <input
              type="text"
              value={queryFilter}
              onChange={(e) => setQueryFilter(e.target.value)}
              placeholder="e.g., chips, taiwan, lithography"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#06080F] text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-white/10 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
            <p className="text-[11px] text-slate-400">
              Saved locally to your browser and available across sessions.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#141C2E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Save Lens</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
