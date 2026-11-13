"use client";

import React from "react";
import Link from "next/link";
import {
  ClusteredNewsEvent,
  EventCategoryMeta,
} from "@/types";
import {
  Globe,
  ShieldAlert,
  TrendingUp,
  Landmark,
  Zap,
  Anchor,
  Cpu,
  Scale,
  Wheat,
  Gem,
  DollarSign,
  Compass,
  Layers,
  Navigation,
  Building,
  MapPin,
  Activity,
  ShieldCheck,
  Users,
  Workflow,
  Droplets,
  Briefcase,
  Plane,
  Home as HomeIcon,
  ArrowRight,
  FileText,
  Download,
  ExternalLink,
  Radio,
  BookOpen,
  PenTool,
} from "lucide-react";

// Icon mapping for all 24 documentary sections
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  ShieldAlert,
  TrendingUp,
  Landmark,
  Zap,
  Anchor,
  Cpu,
  Scale,
  Wheat,
  Gem,
  DollarSign,
  Compass,
  Layers,
  Navigation,
  Building,
  MapPin,
  Activity,
  ShieldCheck,
  Users,
  Workflow,
  Droplets,
  Briefcase,
  Plane,
  Home: HomeIcon,
};

interface SectionPreviewCardProps {
  sectionIndex: number;
  meta: EventCategoryMeta;
  clusters: ClusteredNewsEvent[];
  onOpenSectionSummary: (meta: EventCategoryMeta) => void;
  onDownloadSectionTxt: (meta: EventCategoryMeta) => void;
  onSelectClusterForBriefing?: (cluster: ClusteredNewsEvent) => void;
  onSelectClusterForScript?: (cluster: ClusteredNewsEvent) => void;
}

export const SectionPreviewCard: React.FC<SectionPreviewCardProps> = ({
  sectionIndex,
  meta,
  clusters,
  onOpenSectionSummary,
  onDownloadSectionTxt,
  onSelectClusterForBriefing,
  onSelectClusterForScript,
}) => {
  const IconComponent = ICON_MAP[meta.icon] || Globe;

  // #1 Top-Ranked Headline in this section
  const topCluster = clusters[0] || null;

  return (
    <div className="flex flex-col justify-between rounded-3xl bg-[#0E131F] border border-white/10 hover:border-blue-500/40 shadow-xl shadow-black/40 transition-all duration-200 overflow-hidden group">
      {/* 1. Section Header Banner */}
      <div className="p-5 border-b border-white/5 bg-[#06080F]/40 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-blue-400">
                #{sectionIndex + 1}
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug group-hover:text-blue-300 transition-colors">
                {meta.label}
              </h3>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              {meta.description}
            </p>
          </div>
        </div>

        {/* Story Count Pill */}
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold shrink-0 ${
            clusters.length > 0
              ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
              : "bg-white/5 text-slate-500 border border-white/5"
          }`}
        >
          {clusters.length} {clusters.length === 1 ? "story" : "stories"}
        </span>
      </div>

      {/* 2. ONLY THE #1 TOP-RANKED HEADLINE PREVIEW */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {topCluster ? (
          <div className="space-y-3.5">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Consensus / Outlets badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-blue-600/15 text-blue-300 border border-blue-500/20">
                  <Radio className="w-3 h-3 text-blue-400" />
                  <span>{topCluster.consensusBadge}</span>
                </span>

                {/* Weighted Importance grade */}
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                    (topCluster.tierGrade || topCluster.importanceGrade) === "S-Tier"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : (topCluster.tierGrade || topCluster.importanceGrade) === "A-Tier"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-300 border border-white/10"
                  }`}
                >
                  {topCluster.importanceScore}% {topCluster.tierGrade || topCluster.importanceGrade}
                </span>
              </div>

              <span className="text-[11px] font-mono text-slate-400">
                {topCluster.timeAgo}
              </span>
            </div>

            {/* Headline */}
            <h4 className="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-blue-200 transition-colors line-clamp-2">
              {topCluster.title}
            </h4>

            {/* Executive Summary */}
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {topCluster.summary}
            </p>

            {/* 3 Key Points Preview */}
            {topCluster.keyPointsSummary && topCluster.keyPointsSummary.length > 0 && (
              <div className="p-3 rounded-2xl bg-[#06080F] border border-white/5 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Key Verified Facts:
                </span>
                {topCluster.keyPointsSummary.slice(0, 3).map((pt, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-1.5 text-xs text-slate-300">
                    <span className="text-blue-400 shrink-0 font-bold">•</span>
                    <p className="line-clamp-1 text-[11px]">{pt}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Verified Sources Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-slate-400 mr-1">
                Verified:
              </span>
              {topCluster.articles.slice(0, 3).map((art, aIdx) => (
                <a
                  key={aIdx}
                  href={art.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-medium text-slate-300 hover:text-white transition-all"
                >
                  <span>{art.source}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                </a>
              ))}
              {topCluster.articles.length > 3 && (
                <span className="text-[10px] text-slate-400">
                  +{topCluster.articles.length - 3} more
                </span>
              )}
            </div>

            {/* Quick Action Pills for #1 Story */}
            {(onSelectClusterForBriefing || onSelectClusterForScript) && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                {onSelectClusterForBriefing && (
                  <button
                    type="button"
                    onClick={() => onSelectClusterForBriefing(topCluster)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
                  >
                    <BookOpen className="w-3 h-3 text-blue-400" />
                    <span>Read Briefing</span>
                  </button>
                )}
                {onSelectClusterForScript && (
                  <button
                    type="button"
                    onClick={() => onSelectClusterForScript(topCluster)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition-all"
                  >
                    <PenTool className="w-3 h-3" />
                    <span>Generate Script</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Empty Section State */
          <div className="py-8 text-center space-y-2">
            <Radio className="w-6 h-6 text-slate-400 mx-auto animate-pulse" />
            <p className="text-xs font-medium text-slate-400">
              Monitoring global feeds for breaking dispatches...
            </p>
            <p className="text-[11px] text-slate-400">
              No active clustered events right now.
            </p>
          </div>
        )}
      </div>

      {/* 3. Bottom 3 Action Buttons */}
      <div className="p-3 sm:p-4 border-t border-white/5 bg-[#06080F]/60 flex flex-col sm:flex-row items-center gap-2">
        {/* Action 1: Explore More Webpage */}
        <Link
          href={`/section/${meta.key}`}
          className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all"
        >
          <span>Click to explore more</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <div className="w-full sm:w-auto flex items-center gap-2">
          {/* Action 2: Section Summary */}
          <button
            type="button"
            onClick={() => onOpenSectionSummary(meta)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            title={`View compiled summary sheet for ${meta.label}`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Summary</span>
          </button>

          {/* Action 3: Download Section (.TXT) */}
          <button
            type="button"
            onClick={() => onDownloadSectionTxt(meta)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            title={`Download .TXT summary for ${meta.label}`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>.TXT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
