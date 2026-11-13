export interface ScriptSection {
  act: string;
  cue: string; // [CapCut Visual Cues]: B-roll, stock, sound effects, text overlay
  narration: string; // Spoken voiceover copy with inline citations [Source: ...]
  timestamp?: string;
}

export interface ScriptAct {
  title: string;
  timestamp: string;
  visualCue: string;
  narration: string;
}

export interface DocumentaryScript {
  sections?: ScriptSection[];
  coldOpen?: ScriptAct;
  actI?: ScriptAct;
  actII?: ScriptAct;
  actIII?: ScriptAct;
  outro?: ScriptAct;
}

export interface VerifiedSource {
  title: string;
  source: string;
  region: string;
  link: string;
  pubDate?: string;
  snippet?: string;
  type?: "breaking_consensus" | "background_context";
}

export interface StorylineMap {
  timelineThread: {
    title: string;
    baselineOrigin: string; // How this story started months/years ago
    breakingUpdate: string; // Why today's multi-outlet breaking update changes the game
    outletsReporting?: string;
    metricTag?: string;
    description: string;
  };
  historicalParallel: {
    title: string;
    precedentEvent: string; // Concrete historical precedent (exact year and event)
    period: string; // e.g. "1973–1979"
    similarityScore: string; // e.g. "93% Structural Match"
    mechanism: string; // The structural echo
    lesson: string;
    description: string;
  };
  averagePersonImpact: {
    title: string;
    affectedGroup: string;
    stepByStepChain: string; // Step-by-step cause-and-effect chain to wallet, food prices, energy bill, or daily life
    dollarOrPriceMetric: string;
    actionableTakeaway: string;
    description: string;
  };
}

export interface EvidencePack {
  breakingArticles: VerifiedSource[];
  contextArticles: VerifiedSource[];
}

export type EventCategoryKey =
  | "insecurity-wars"
  | "financials-markets"
  | "geopolitics-diplomacy"
  | "energy-commodities"
  | "tech-health";

export interface EventCategoryMeta {
  key: EventCategoryKey;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const EVENT_CATEGORIES: EventCategoryMeta[] = [
  {
    key: "insecurity-wars",
    label: "Insecurity, Wars & Armed Conflicts",
    shortLabel: "Wars & Conflicts",
    icon: "ShieldAlert",
    description: "Active kinetic warfare, military strikes, missile defenses, insurgencies, and armed troop deployments.",
  },
  {
    key: "financials-markets",
    label: "Financials, Markets & Macro Economy",
    shortLabel: "Markets & Macro",
    icon: "TrendingUp",
    description: "Equities, bond yields, central bank rate decisions, debt cycles, inflation, and bank contagion.",
  },
  {
    key: "geopolitics-diplomacy",
    label: "Geopolitics, Diplomacy & Trade Chokepoints",
    shortLabel: "Geopolitics & Diplomacy",
    icon: "Globe",
    description: "International treaties, diplomatic summits, bilateral sanctions, maritime chokepoints, and trade tariffs.",
  },
  {
    key: "energy-commodities",
    label: "Energy, Commodities & Cost of Living",
    shortLabel: "Energy & Commodities",
    icon: "Zap",
    description: "Crude oil, natural gas, agriculture, critical minerals, electricity grids, and household cost of living.",
  },
  {
    key: "tech-health",
    label: "Tech, AI & Global Health Crises",
    shortLabel: "Tech & Health",
    icon: "Cpu",
    description: "Artificial intelligence, semiconductor supply chains, cybersecurity breaches, and global health outbreaks.",
  },
];

export interface KeyFactsData {
  figures: string[];
  dates: string[];
  quotes: string[];
  bulletSummary: string[];
}

export interface BriefingPackArticle {
  title: string;
  source: string;
  url: string;
  region?: string;
  pubDate?: string;
  paragraphsCount: number;
  snippet?: string;
  paragraphs?: string[];
  fullText?: string;
}

export interface BriefingPackData {
  topic: string;
  consensusBadge?: string;
  scrapedCount: number;
  timelineCount: number;
  articles: BriefingPackArticle[];
  backgroundTimeline: {
    title: string;
    source: string;
    url: string;
    snippet: string;
  }[];
  keyFacts?: KeyFactsData;
  briefingPackText?: string;
}

export interface StoryPitch {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  estimatedRuntime: string;
  wordCount: number;
  targetFormat: string;
  date: string;
  impactScore: number; // 0 - 100
  badge?: string;
  consensusBadge?: string;
  regionsReporting?: string[];
  searchQueries?: string[];
  historyShort?: string;
  verifiedSources?: VerifiedSource[];
  storylineMap?: StorylineMap;
  evidencePack?: EvidencePack;
  briefingPack?: BriefingPackData;
  sourceCatalyst: {
    outlet: string;
    timeAgo: string;
    headline: string;
  };
  nodes: {
    macroTrigger: {
      title: string;
      date?: string;
      description: string;
      metricTag: string;
      source: string;
      baselineOrigin?: string;
      breakingUpdate?: string;
      outletsReporting?: string;
    };
    historicalParallel: {
      title: string;
      period: string;
      description: string;
      similarityScore: string;
      lesson: string;
      mechanism?: string;
      historicalPrecedent?: string;
    };
    humanImpact: {
      title: string;
      affectedGroup: string;
      description: string;
      dollarOrPriceMetric: string;
      actionableTakeaway: string;
      groundLevelEffect?: string;
    };
  };
  script: DocumentaryScript;
}

export interface SavedScriptEntry {
  id: string;
  pitchId: string;
  title: string;
  category: string;
  savedAt: string;
  wordCount: number;
  runtime: string;
  scriptText?: string;
  fullVoiceover?: string;
  sections?: ScriptSection[];
  briefingPack?: BriefingPackData;
  verifiedSources?: VerifiedSource[];
}

export interface ApiKeysConfig {
  apiKey?: string;
  groqKey: string;
  tavilyKey: string;
  customRssUrl: string;
  model: string;
  provider?: string;
}

export type LensPreset = {
  id: string;
  label: string;
  iconName: string;
  queryFilter?: string;
  isCustom?: boolean;
};

export type GeopoliticalNiche =
  | "all"
  | "wars-conflicts"
  | "outbreaks-health"
  | "ai-tech"
  | "macro-trade";

export type ImportanceGrade = "S-Tier" | "A-Tier" | "B-Tier";

export type SortMode =
  | "popularity"
  | "importance"
  | "latest"
  | "consensus"
  | "sensitivity"
  | "relevance";

export interface ClusteredNewsArticle {
  title: string;
  source: string;
  region: string;
  link: string;
  pubDate: string;
  snippet?: string;
}

export interface ClusteredNewsEvent {
  id: string;
  title: string;
  summary: string;
  categoryKey?: EventCategoryKey;
  categoryLabel?: string;
  category?: string;
  primaryNiche: GeopoliticalNiche;
  sensitivityLabel: string;
  consensusBadge: string;
  outlets: string[];
  regions: string[];
  consensusScore: number;
  popularityScore: number;
  importanceScore: number;
  importanceGrade: ImportanceGrade;
  importanceLabel: string;
  recencyScore: number;
  timeAgo: string;
  sensitivityScore: number;
  articles: ClusteredNewsArticle[];
}
