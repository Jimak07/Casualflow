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
  | "world"
  | "insecurity-wars"
  | "financials-markets"
  | "central-banks-debt"
  | "energy-power"
  | "shipping-chokepoints"
  | "ai-semiconductors"
  | "sanctions-trade"
  | "food-agriculture"
  | "critical-minerals"
  | "currency-inflation"
  | "africa-macro"
  | "asia-industrial"
  | "middle-east-corridors"
  | "europe-economy"
  | "americas-policy"
  | "biosecurity-health"
  | "cyber-shadow-finance"
  | "demographics-labor"
  | "mega-infrastructure"
  | "water-climate-econ"
  | "corporate-monopolies"
  | "aviation-defense-tech"
  | "real-estate-housing";

export interface EventCategoryMeta {
  key: EventCategoryKey;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const EVENT_CATEGORIES: EventCategoryMeta[] = [
  {
    key: "world",
    label: "World & Diplomatic Flashpoints",
    shortLabel: "World & Diplomacy",
    icon: "Globe",
    description: "International summits, bilateral treaties, UN Security Council tensions, foreign ministries, and border diplomacy.",
  },
  {
    key: "insecurity-wars",
    label: "Insecurity, Wars & Armed Conflicts",
    shortLabel: "Wars & Conflicts",
    icon: "ShieldAlert",
    description: "Active kinetic warfare, military strikes, missile defenses, insurgencies, casualties, and troop deployments.",
  },
  {
    key: "financials-markets",
    label: "Financials, Stock Markets & Capital Flows",
    shortLabel: "Markets & Capital",
    icon: "TrendingUp",
    description: "Equities, bond yields, institutional asset management, hedge funds, liquidity cycles, and market selloffs.",
  },
  {
    key: "central-banks-debt",
    label: "Central Banks, Interest Rates & Sovereign Debt",
    shortLabel: "Central Banks & Debt",
    icon: "Landmark",
    description: "Federal Reserve, ECB, interest rate decisions, national debt defaults, bond markets, and IMF emergency facilities.",
  },
  {
    key: "energy-power",
    label: "Energy, Oil, Gas & Power Grids",
    shortLabel: "Energy & Power Grids",
    icon: "Zap",
    description: "Crude oil, natural gas, OPEC quotas, LNG shipments, electricity grid blackouts, and uranium nuclear power.",
  },
  {
    key: "shipping-chokepoints",
    label: "Maritime Chokepoints, Canals & Global Freight",
    shortLabel: "Maritime Chokepoints",
    icon: "Anchor",
    description: "Suez Canal, Red Sea transit, Strait of Hormuz, Malacca, container freight rates, and tanker blockades.",
  },
  {
    key: "ai-semiconductors",
    label: "AI, Semiconductors & Compute Hardware",
    shortLabel: "AI & Semiconductors",
    icon: "Cpu",
    description: "Artificial intelligence models, GPU manufacturing, TSMC, ASML, lithography, compute data centers, and chip bans.",
  },
  {
    key: "sanctions-trade",
    label: "Sanctions, Tariffs & Trade Wars",
    shortLabel: "Sanctions & Tariffs",
    icon: "Scale",
    description: "Import tariffs, bilateral trade embargoes, WTO disputes, protectionist barriers, and export controls.",
  },
  {
    key: "food-agriculture",
    label: "Global Food Supply, Fertilizer & Agriculture",
    shortLabel: "Food & Agriculture",
    icon: "Wheat",
    description: "Grain harvests, wheat corridors, fertilizer shortages, drought crop failures, and global famine risks.",
  },
  {
    key: "critical-minerals",
    label: "Rare Earths, Copper, Lithium & Mining",
    shortLabel: "Critical Minerals",
    icon: "Gem",
    description: "Lithium triangle, rare earth processing, copper shortages, cobalt mining, and critical industrial mineral reserves.",
  },
  {
    key: "currency-inflation",
    label: "Currency Devaluation & Cost-of-Living Crises",
    shortLabel: "Currency & Inflation",
    icon: "DollarSign",
    description: "Hyperinflation, currency devaluations, purchasing power collapse, consumer price indices, and household living costs.",
  },
  {
    key: "africa-macro",
    label: "Africa & Emerging Market Macroeconomics",
    shortLabel: "Africa Macro",
    icon: "Compass",
    description: "Sub-Saharan trade corridors, AfCFTA integration, African Union initiatives, commodity exports, and fiscal reforms.",
  },
  {
    key: "asia-industrial",
    label: "Asia-Pacific, China & India Industrial Shifts",
    shortLabel: "Asia Industrial Shifts",
    icon: "Layers",
    description: "Manufacturing supply chain relocations, industrial factory output, industrial robotics, and Asian trade hubs.",
  },
  {
    key: "middle-east-corridors",
    label: "Middle East Petrodollars & Strategic Corridors",
    shortLabel: "Middle East Corridors",
    icon: "Navigation",
    description: "Gulf sovereign wealth funds, petrodollar investments, regional economic corridors (IMEC), and transit routes.",
  },
  {
    key: "europe-economy",
    label: "European Deindustrialization & Policy",
    shortLabel: "Europe Economy",
    icon: "Building",
    description: "Eurozone industrial decline, energy cost pressures on manufacturing, European Commission policies, and fiscal strains.",
  },
  {
    key: "americas-policy",
    label: "Americas, US Fiscal Policy & LatAm Resources",
    shortLabel: "Americas Policy",
    icon: "MapPin",
    description: "US Congressional fiscal showdowns, Latin American resource extraction, Mercosur trade, and hemispheric treaties.",
  },
  {
    key: "biosecurity-health",
    label: "Disease Outbreaks, Bio-Health & Pharma Supply",
    shortLabel: "Biosecurity & Health",
    icon: "Activity",
    description: "Viral epidemic outbreaks, WHO international alerts, pharmaceutical supply chains, vaccine logistics, and pathogen surveillance.",
  },
  {
    key: "cyber-shadow-finance",
    label: "Cyber Warfare, Illicit Finance & Crypto Heists",
    shortLabel: "Cyber & Shadow Finance",
    icon: "ShieldCheck",
    description: "State-sponsored cyber intrusions, crypto exchange heists, dark web money laundering, and shadow banking routes.",
  },
  {
    key: "demographics-labor",
    label: "Demographic Shifts, Labor & Migration",
    shortLabel: "Demographics & Labor",
    icon: "Users",
    description: "Aging workforces, plummeting fertility rates, mass migration corridors, labor strikes, and national pension deficits.",
  },
  {
    key: "mega-infrastructure",
    label: "Mega-Projects, Ports, Rail & Belt-and-Road",
    shortLabel: "Mega Infrastructure",
    icon: "Workflow",
    description: "Deep-water ports, trans-continental high-speed rail, Belt-and-Road projects, mega-dams, and logistics highways.",
  },
  {
    key: "water-climate-econ",
    label: "Water Scarcity, Dikes & Resource Economics",
    shortLabel: "Water & Resource Econ",
    icon: "Droplets",
    description: "Transboundary river rights, aquifer depletion, desalinization infrastructure, dam diplomacy, and water rationing.",
  },
  {
    key: "corporate-monopolies",
    label: "Corporate Giants, Antitrust & Monopoly Power",
    shortLabel: "Corporate Monopolies",
    icon: "Briefcase",
    description: "Antitrust enforcement, mega-mergers, regulatory breakups, market dominance abuse, and cartel investigations.",
  },
  {
    key: "aviation-defense-tech",
    label: "Aerospace, Defense Industry & Military Tech",
    shortLabel: "Aviation & Defense Tech",
    icon: "Plane",
    description: "Commercial aerospace backlogs, fifth-gen stealth fighters, hypersonic missiles, drone swarms, and defense contractors.",
  },
  {
    key: "real-estate-housing",
    label: "Global Property Markets, Urban Crisis & Housing",
    shortLabel: "Real Estate & Housing",
    icon: "Home",
    description: "Commercial real estate defaults, mortgage rate shocks, urban housing shortages, property developer crises, and rent spikes.",
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
  tierGrade?: ImportanceGrade;
  importanceLabel: string;
  recencyScore: number;
  timeAgo: string;
  sensitivityScore: number;
  articles: ClusteredNewsArticle[];
  keyPointsSummary?: string[];
}
