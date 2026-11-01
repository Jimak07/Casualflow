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
