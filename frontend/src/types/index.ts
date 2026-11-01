export interface ScriptSection {
  act: string;
  cue: string; // [CapCut Visual Cues]: B-roll, stock, sound effects, text overlay
  narration: string; // Clean voiceover copy without brackets or stage directions
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
  searchQueries?: string[];
  historyShort?: string;
  sourceCatalyst: {
    outlet: string;
    timeAgo: string;
    headline: string;
  };
  nodes: {
    macroTrigger: {
      title: string;
      date: string;
      description: string;
      metricTag: string;
      source: string;
    };
    historicalParallel: {
      title: string;
      period: string;
      description: string;
      similarityScore: string;
      lesson: string;
    };
    humanImpact: {
      title: string;
      affectedGroup: string;
      description: string;
      dollarOrPriceMetric: string;
      actionableTakeaway: string;
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
