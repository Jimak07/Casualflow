import { ClusteredNewsEvent, EventCategoryMeta, EVENT_CATEGORIES } from "@/types";

export interface GenerateSummaryParams {
  scope: string; // e.g. "ALL 24 SECTIONS" or specific section name
  sortMode: string; // e.g. "Weighted Importance (Impact)" or "Popularity (Consensus)"
  events: ClusteredNewsEvent[];
  sectionMetas?: EventCategoryMeta[];
  timestamp?: string;
}

/**
 * Compiles a formatted summary sheet matching the required layout for 1-click .txt downloads.
 * Strictly adheres to the verbatim format defined in CausalFlow specifications
 */
export function generateCompiledSummaryText(params: GenerateSummaryParams): string {
  const {
    scope,
    sortMode,
    events,
    sectionMetas = EVENT_CATEGORIES,
    timestamp,
  } = params;

  const generatedTime = timestamp || "Live Matrix Snapshot";

  const lines: string[] = [
    "========================================================================",
    "CAUSALFLOW // COMPILED DOCUMENTARY INTELLIGENCE SUMMARY SHEET",
    `Scope: ${scope.toUpperCase()}`,
    `Generated: ${generatedTime} | Sort Mode: ${sortMode}`,
    "========================================================================",
    "",
  ];

  // Group events by categoryKey
  const eventsByCategory = new Map<string, ClusteredNewsEvent[]>();
  for (const event of events) {
    const key = event.categoryKey || "world";
    if (!eventsByCategory.has(key)) {
      eventsByCategory.set(key, []);
    }
    eventsByCategory.get(key)!.push(event);
  }

  // Iterate over sections
  const isGlobal =
    scope.toUpperCase() === "ALL 24 SECTIONS" ||
    scope.toUpperCase() === "GLOBAL" ||
    scope.toUpperCase() === "ALL SECTIONS";

  const sectionsToInclude = isGlobal
    ? sectionMetas
    : sectionMetas.filter(
        (s) =>
          s.label.toUpperCase() === scope.toUpperCase() ||
          s.key.toLowerCase() === scope.toLowerCase() ||
          s.shortLabel.toUpperCase() === scope.toUpperCase()
      );

  for (const sec of sectionsToInclude) {
    const secEvents = eventsByCategory.get(sec.key) || [];

    lines.push(`=== SECTION: ${sec.label.toUpperCase()} ===`);
    lines.push("------------------------------------------------------------------------");

    if (secEvents.length === 0) {
      lines.push("No active breaking dispatches currently clustered in this section.");
      lines.push("");
      continue;
    }

    secEvents.forEach((ev, idx) => {
      const topOutlets = ev.outlets.slice(0, 4).join(", ");
      const outletsCount = ev.outlets.length;
      lines.push(
        `[#${idx + 1}] [IMPORTANCE: ${ev.importanceScore}% ${ev.tierGrade || ev.importanceGrade} | POPULARITY: ${ev.popularityScore}% (${outletsCount} Outlets: ${topOutlets})]`
      );
      lines.push(`HEADLINE: ${ev.title.trim()}`);
      lines.push(`PUBLISHED: ${ev.timeAgo} (${new Date(ev.recencyScore).toISOString()})`);
      lines.push("KEY POINTS:");
      if (ev.keyPointsSummary && ev.keyPointsSummary.length > 0) {
        ev.keyPointsSummary.forEach((kp) => {
          lines.push(`• ${kp}`);
        });
      } else {
        lines.push(`• Verified dispatch: ${ev.summary.slice(0, 140)}`);
        lines.push(`• Corroborated by ${ev.outlets.join(", ")}`);
        lines.push(`• Reporting across ${ev.regions.join(", ")}`);
      }
      lines.push("VERIFIED SOURCES:");
      ev.articles.forEach((art) => {
        lines.push(`- ${art.source} (${art.region}): ${art.link}`);
      });
      lines.push("");
    });
  }

  return lines.join("\n");
}

/**
 * Triggers a direct browser file download for a generated summary text
 */
export function downloadSummaryTextFile(content: string, filename: string): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
