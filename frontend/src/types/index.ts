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

export interface BriefingPackArticle {
  title: string;
  source: string;
  url: string;
  region?: string;
  pubDate?: string;
  paragraphsCount: number;
  snippet?: string;
  paragraphs?: string[];
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
  sections: ScriptSection[];
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

export type SortMode = "consensus" | "latest" | "sensitivity" | "relevance";

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
  primaryNiche: GeopoliticalNiche;
  sensitivityLabel: string;
  consensusBadge: string;
  outlets: string[];
  regions: string[];
  consensusScore: number;
  recencyScore: number;
  timeAgo: string;
  sensitivityScore: number;
  articles: ClusteredNewsArticle[];
}
