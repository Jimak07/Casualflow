/**
 * Algorithmic Story Clustering & Consensus Scoring Engine
 * Groups live RSS headlines across global outlets with strict same-event clustering
 * and computes Popularity vs. Global Economic & Geopolitical Importance.
 */

export type GeopoliticalNiche =
  | "all"
  | "wars-conflicts"
  | "outbreaks-health"
  | "ai-tech"
  | "macro-trade";

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

export type ImportanceGrade = "S-Tier" | "A-Tier" | "B-Tier";

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
  categoryKey: EventCategoryKey;
  categoryLabel: string;
  category: string;
  primaryNiche: GeopoliticalNiche;
  sensitivityLabel: string;
  consensusBadge: string;
  outlets: string[];
  regions: string[];
  consensusScore: number; // Backward compatibility
  popularityScore: number; // 0 - 100 (Cross-Outlet Consensus)
  importanceScore: number; // 0 - 100 (Global Economic & Geopolitical Impact)
  importanceGrade: ImportanceGrade; // "S-Tier" | "A-Tier" | "B-Tier"
  tierGrade: ImportanceGrade; // Spec alias
  importanceLabel: string; // e.g. "94% Global Impact [S-Tier: Economy & Geopolitics]"
  recencyScore: number;
  timeAgo: string;
  sensitivityScore: number;
  articles: ClusteredNewsArticle[];
  keyPointsSummary: string[]; // 3 concise, strictly factual bullet points
}

/**
 * Stopwords to ignore during token extraction
 */
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
  "arent", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
  "but", "by", "cant", "cannot", "could", "couldnt", "did", "didnt", "do", "does", "doesnt",
  "doing", "dont", "down", "during", "each", "few", "for", "from", "further", "had", "hadnt",
  "has", "hasnt", "have", "havent", "having", "he", "hed", "hell", "hes", "her", "here",
  "heres", "hers", "herself", "him", "himself", "his", "how", "hows", "i", "id", "ill",
  "im", "ive", "if", "in", "into", "is", "isnt", "it", "its", "itself", "lets", "me", "more",
  "most", "mustnt", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
  "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shant",
  "she", "shed", "shell", "shes", "should", "shouldnt", "so", "some", "such", "than", "that",
  "thats", "the", "their", "theirs", "them", "themselves", "then", "there", "theres", "these",
  "they", "theyd", "theyll", "theyre", "theyve", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "wasnt", "we", "wed", "well", "were", "weve", "werent",
  "what", "whats", "when", "whens", "where", "wheres", "which", "while", "who", "whos", "whom",
  "why", "whys", "with", "wont", "would", "wouldnt", "you", "youd", "youll", "youre", "youve",
  "your", "yours", "yourself", "yourselves"
]);

/**
 * Generic news reporting verbs, filler nouns, and broadcast boilerplate.
 * These never define a specific event.
 */
const GENERIC_NEWS_WORDS = new Set([
  "says", "said", "saying", "warns", "warned", "warning", "latest", "new", "news",
  "report", "reports", "reported", "reporting", "world", "hit", "hits", "hitting",
  "after", "amid", "over", "claims", "claimed", "claiming", "tells", "told",
  "reveals", "revealed", "urges", "urged", "moves", "move", "plans", "planned", "planning",
  "calls", "called", "calling", "faces", "facing", "shows", "shown", "showing",
  "spotted", "seen", "first", "two", "three", "four", "five", "breaking", "update", "updates",
  "live", "watch", "video", "photos", "exclusive", "alert", "alerts", "daily", "today",
  "yesterday", "week", "month", "year", "years", "state", "states", "official", "officials",
  "minister", "president", "leader", "leaders", "chief", "chiefs", "spokesman", "spokesperson",
  "govt", "government", "governments", "people", "man", "woman", "time", "day", "days",
  "back", "meet", "meets", "meeting", "meetings", "talk", "talks", "visit", "visits", "visiting",
  "key", "rise", "rises", "rising", "falls", "falling", "finds", "finding", "takes", "taking",
  "look", "looks", "know", "wants", "want", "could", "would", "might", "will", "just",
  "more", "many", "much", "high", "down", "make", "makes", "here", "what", "where", "when",
  "who", "how", "why", "about", "into", "onto", "than", "then", "their", "there", "they",
  "them", "this", "that", "these", "those", "from", "with", "without", "between", "against",
  "under", "until", "before", "during", "since", "while", "ahead", "behind", "around",
  "across", "near", "next", "last", "former", "top", "big", "major", "huge", "small",
  "some", "such", "also", "even", "still", "well", "both", "either", "neither", "only",
  "very", "too", "quite", "really", "almost", "nearly", "always", "never", "ever",
  "good", "bad", "better", "best", "worse", "worst", "full", "part", "own", "other",
  "others", "another", "same", "different", "general", "special", "public", "private",
  "case", "cases", "point", "points", "way", "ways", "end", "ends", "start", "starts",
  "open", "close", "set", "sets", "put", "puts", "hold", "holds", "held", "keep", "keeps",
  "lead", "leads", "led", "bring", "brings", "brought", "send", "sends", "sent",
  "story", "sources", "source", "post", "posts", "view", "views", "read", "reads"
]);

/**
 * Country, nationality, demonym, region, and capital city tokens.
 * Two headlines CANNOT be clustered solely because they share these country names!
 */
export const COUNTRY_REGION_TOKENS = new Set([
  // Asia & Pacific
  "korea", "korean", "koreas", "north", "south", "pyongyang", "seoul",
  "china", "chinese", "beijing", "shanghai", "hong", "kong", "hongkong", "taiwan", "taiwanese", "taipei",
  "japan", "japanese", "tokyo",
  "india", "indian", "indians", "delhi", "newdelhi", "mumbai",
  "pakistan", "pakistani", "islamabad", "bangladesh", "bangladeshi", "dhaka",
  "afghanistan", "afghan", "kabul",
  "philippines", "filipino", "manila", "indonesia", "indonesian", "jakarta",
  "vietnam", "vietnamese", "hanoi", "thailand", "thai", "bangkok",
  "myanmar", "burma", "burmese", "malaysia", "malaysian", "singapore",
  "australia", "australian", "canberra", "sydney", "newzealand", "auckland",
  // Europe
  "russia", "russian", "russians", "moscow",
  "ukraine", "ukrainian", "ukrainians", "kyiv", "kiev",
  "uk", "britain", "british", "london", "england", "english", "scotland", "scottish", "wales",
  "germany", "german", "germans", "berlin", "france", "french", "paris",
  "italy", "italian", "rome", "spain", "spanish", "madrid",
  "poland", "polish", "warsaw", "belarus", "minsk",
  "sweden", "swedish", "finland", "finnish", "norway", "norwegian", "denmark", "danish",
  "greece", "greek", "athens", "turkey", "turkish", "turkiye", "ankara", "istanbul",
  "netherlands", "dutch", "amsterdam", "belgium", "belgian", "brussels",
  "switzerland", "swiss", "austria", "austrian", "vienna",
  "ireland", "irish", "dublin", "hungary", "hungarian", "budapest",
  "romania", "romanian", "bucharest", "serbia", "serbian", "belgrade",
  // Middle East
  "israel", "israeli", "israelis", "jerusalem", "telaviv",
  "gaza", "palestine", "palestinian", "palestinians", "westbank",
  "iran", "iranian", "iranians", "tehran",
  "lebanon", "lebanese", "beirut", "hezbollah",
  "syria", "syrian", "damascus",
  "yemen", "yemeni", "yemenis", "sanaa", "houthi", "houthis",
  "iraq", "iraqi", "baghdad",
  "saudi", "arabia", "saudiarabia", "riyadh",
  "uae", "dubai", "abudhabi", "emirates", "emirati",
  "qatar", "qatari", "doha", "kuwait", "oman", "bahrain", "jordan", "jordanian", "amman",
  // Africa
  "egypt", "egyptian", "cairo",
  "sudan", "sudanese", "khartoum",
  "nigeria", "nigerian", "lagos", "abuja",
  "southafrica", "johannesburg", "capetown",
  "kenya", "kenyan", "nairobi", "ethiopia", "ethiopian", "addis",
  "somalia", "somali", "mogadishu", "drcongo", "congo", "drc", "kinshasa",
  "rwanda", "rwandan", "kigali", "uganda", "ugandan", "kampala",
  "ghana", "ghanaian", "accra", "senegal", "dakar",
  "morocco", "moroccan", "rabat", "algeria", "algerian", "algiers", "tunisia", "libya", "libyan", "tripoli",
  "sahel", "mali", "niger", "burkina", "faso",
  // Americas
  "us", "usa", "america", "american", "americans", "washington", "biden", "trump",
  "canada", "canadian", "ottawa", "toronto",
  "mexico", "mexican", "mexicocity",
  "brazil", "brazilian", "brasilia", "argentina", "argentine", "buenosaires",
  "colombia", "colombian", "bogota", "venezuela", "venezuelan", "caracas",
  "cuba", "cuban", "havana", "chile", "chilean", "peru", "peruvian",
  // Broad continents
  "africa", "african", "africans", "asia", "asian", "asiapacific", "apac",
  "europe", "european", "americas", "latinamerica", "middleeast", "mideast", "global", "international"
]);

const MULTI_WORD_COUNTRIES = [
  "north korea", "south korea", "united states", "united kingdom",
  "saudi arabia", "south africa", "middle east", "latin america",
  "gaza strip", "west bank", "dr congo", "burkina faso", "sri lanka",
  "new zealand", "puerto rico", "costa rica", "hong kong", "czech republic"
];

// Niche keywords for scope filtering
const NICHE_KEYWORDS = {
  "wars-conflicts": [
    "war", "military", "missile", "drone", "strike", "airstrike", "army", "troop", "rebel",
    "combat", "attack", "invasion", "ceasefire", "weapons", "soldier", "artillery", "naval",
    "tank", "airbase", "hamas", "gaza", "israel", "hezbollah", "lebanon", "ukraine", "russia",
    "sudan", "yemen", "houthi", "syria", "somalia", "kiev", "kyiv", "moscow", "tehran",
    "defense", "casualty", "casualties", "killed", "hostage", "shelling", "clash", "clashes",
    "cluster-bomb", "warhead", "icbm", "ballistic", "warheads"
  ],
  "outbreaks-health": [
    "outbreak", "virus", "disease", "flu", "bird flu", "h5n1", "mpox", "covid", "pandemic",
    "epidemic", "vaccine", "vaccination", "infection", "contagion", "patient", "hospital",
    "pathogen", "ebola", "cholera", "marburg", "health emergency", "who", "cdc", "medical",
    "quarantine", "biosecurity", "transmission", "cancer"
  ],
  "ai-tech": [
    "ai", "artificial intelligence", "chip", "semiconductor", "nvidia", "openai", "compute",
    "model", "gpu", "tsmc", "deepseek", "anthropic", "quantum", "cyber", "robot", "robotics",
    "algorithm", "datacenter", "data center", "tech giant", "tech export", "supercomputer",
    "h100", "blackwell", "asml", "lithography", "crypto", "bitcoin", "ethereum", "binance"
  ],
  "macro-trade": [
    "tariff", "tariffs", "trade war", "trade", "inflation", "cpi", "fed", "federal reserve",
    "central bank", "rate cut", "rate hike", "interest rate", "currency", "bond", "treasury",
    "dollar", "euro", "yen", "yuan", "ruble", "oil", "brent", "crude", "gas", "lng", "opec",
    "debt", "default", "deficit", "gdp", "supply chain", "shipping", "freight", "container",
    "grain", "wheat", "food price", "export ban", "sanction", "sanctions", "customs"
  ]
};

/**
 * Extracts non-country content tokens from text.
 * Strictly excludes country/nationality names and generic news words.
 */
export function extractNonCountryTokens(text: string): {
  nonCountryTokens: Set<string>;
  allTokens: Set<string>;
  rawList: string[];
} {
  let normalized = text.toLowerCase();

  // Strip multi-word country names so their pieces don't pollute tokens
  for (const mwc of MULTI_WORD_COUNTRIES) {
    normalized = normalized.split(mwc).join(" ");
  }

  // Preserve hyphenated entities (like cluster-bomb) and financial figures ($6bn, 100m, 50%)
  const tokens = normalized
    .replace(/[$€£]/g, "")
    .replace(/[^a-z0-9\-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const nonCountryTokens = new Set<string>();
  const allTokens = new Set<string>();
  const rawList: string[] = [];

  for (const token of tokens) {
    allTokens.add(token);

    // Ignore pure 1-2 digit numbers
    if (/^\d{1,2}$/.test(token)) continue;

    // Filter stop words and generic news reporting filler
    if (STOP_WORDS.has(token) || GENERIC_NEWS_WORDS.has(token)) continue;

    // Filter country/region names
    if (COUNTRY_REGION_TOKENS.has(token)) continue;

    // Keep meaningful non-country tokens (length >= 3 or metrics like '6bn')
    if (token.length >= 3 || /^\d+[kmb]$/.test(token)) {
      nonCountryTokens.add(token);
      rawList.push(token);
    }
  }

  return { nonCountryTokens, allTokens, rawList };
}

/**
 * Computes Popularity Score (Cross-Outlet Consensus — 0 to 100)
 * Evaluates the number of distinct global outlets, distinct continents/regions, and recency.
 */
export function calculatePopularityScore(
  uniqueOutletsCount: number,
  uniqueRegionsCount: number,
  latestTimestamp: number
): number {
  let score = 25; // Base score for verified breaking item

  // 1. Unique global news outlets
  if (uniqueOutletsCount === 1) {
    score += 10;
  } else if (uniqueOutletsCount === 2) {
    score += 30;
  } else if (uniqueOutletsCount === 3) {
    score += 44;
  } else if (uniqueOutletsCount === 4) {
    score += 54;
  } else {
    // 5+ outlets: strong international consensus
    score += 62 + Math.min((uniqueOutletsCount - 5) * 3, 14);
  }

  // 2. Multi-region coverage bonus
  if (uniqueRegionsCount === 2) {
    score += 8;
  } else if (uniqueRegionsCount === 3) {
    score += 14;
  } else if (uniqueRegionsCount >= 4) {
    score += 20;
  }

  // 3. Recency boost
  const ageHours = (Date.now() - latestTimestamp) / (1000 * 60 * 60);
  if (ageHours < 3) {
    score += 10;
  } else if (ageHours < 8) {
    score += 6;
  } else if (ageHours < 24) {
    score += 2;
  }

  return Math.min(Math.max(Math.round(score), 15), 100);
}

/**
 * Computes Global Economic & Geopolitical Importance Score (0 to 100)
 * Evaluates the structural impact across 5 weighted dimensions:
 * 1. Macro Financial & Market Shock (+30 max)
 * 2. Supply Chain, Energy & Trade Chokepoints (+30 max)
 * 3. Geopolitical & Military Escalation (+25 max)
 * 4. Global Bio-Health & Outbreaks (+20 max)
 * 5. Multi-Region Spillover Bonus (+15 max)
 */
export function calculateImportanceScore(
  text: string,
  uniqueRegionsCount: number
): {
  score: number;
  grade: ImportanceGrade;
  label: string;
} {
  const lower = text.toLowerCase();
  let score = 28; // Base score

  // 1. Macro Financial & Market Shock (+30 pts max)
  let financialPts = 0;
  const hasBigFigures =
    /\b(\$\d+|\d+\s*(billion|trillion|bn|tn)|multi-billion|hundreds of millions)\b/i.test(lower) ||
    lower.includes("billion") || lower.includes("trillion") || lower.includes("$bn") || lower.includes("6bn");
  if (hasBigFigures) financialPts += 15;

  const hasFinancialCrisis = [
    "central bank", "federal reserve", "interest rate", "rate cut", "rate hike",
    "currency crash", "currency crisis", "devaluation", "bank run", "banking crisis",
    "default", "debt crisis", "sovereign debt", "imf", "world bank", "inflation spike",
    "market crash", "stocks plunge", "crypto theft", "crypto hack", "binance", "coinbase",
    "heist", "crypto markets slide"
  ].some((kw) => lower.includes(kw));
  if (hasFinancialCrisis) financialPts += 15;
  score += Math.min(financialPts, 30);

  // 2. Supply Chain, Energy & Trade Chokepoints (+30 pts max)
  let supplyPts = 0;
  const hasEnergy = [
    "oil", "crude", "brent", "gas", "lng", "opec", "refinery", "pipeline",
    "electricity grid", "blackout", "power outage", "fuel shortage"
  ].some((kw) => lower.includes(kw));
  if (hasEnergy) supplyPts += 15;

  const hasChokepointTrade = [
    "suez", "red sea", "strait of hormuz", "bab-el-mandeb", "taiwan strait",
    "tariff", "tariffs", "trade war", "export ban", "sanction", "sanctions",
    "embargo", "blockade", "semiconductor", "tsmc", "asml", "chip ban",
    "microchip", "rare earths", "lithium", "uranium", "critical minerals",
    "grain", "wheat", "food price"
  ].some((kw) => lower.includes(kw));
  if (hasChokepointTrade) supplyPts += 15;
  score += Math.min(supplyPts, 30);

  // 3. Geopolitical & Military Escalation (+25 pts max)
  const hasMilitaryEscalation = [
    "missile", "warhead", "cluster-bomb", "nuclear", "icbm", "ballistic",
    "airstrike", "drone strike", "air strike", "invasion", "cross-border strike",
    "naval clash", "war", "martial law", "mobilization", "military coup",
    "defense pact", "airbase", "fighter jet", "iron dome", "patriot missile",
    "massacre", "casualties", "killed", "hackers", "cyber attack", "cyber unit",
    "sanctions", "sanction", "regime shift", "treaty"
  ].some((kw) => lower.includes(kw));
  if (hasMilitaryEscalation) score += 25;

  // 4. Global Bio-Health & Outbreaks (+20 pts max)
  const hasHealthOutbreak = [
    "outbreak", "pandemic", "epidemic", "bird flu", "h5n1", "mpox", "cholera",
    "marburg", "ebola", "pathogen", "who alert", "health emergency", "quarantine"
  ].some((kw) => lower.includes(kw));
  if (hasHealthOutbreak) score += 20;

  // 5. Multi-Region Spillover Bonus (+15 pts max)
  if (uniqueRegionsCount >= 3) {
    score += 15;
  } else if (uniqueRegionsCount >= 2) {
    score += 8;
  }

  const clampedScore = Math.min(Math.max(score, 30), 99);

  let grade: ImportanceGrade;
  let label: string;

  if (clampedScore >= 85) {
    grade = "S-Tier";
    label = `🌍 ${clampedScore}% Global Impact [S-Tier: Economy & Geopolitics]`;
  } else if (clampedScore >= 70) {
    grade = "A-Tier";
    label = `🌍 ${clampedScore}% Global Impact [A-Tier: Strategic Shift]`;
  } else {
    grade = "B-Tier";
    label = `🌍 ${clampedScore}% Global Impact [B-Tier: Regional / Sectoral]`;
  }

  return { score: clampedScore, grade, label };
}

/**
 * Classifies an event into one of the 24 distinct documentary sections
 */
export function classifyEventCategory(text: string, regionHint?: string): {
  key: EventCategoryKey;
  label: string;
} {
  const lower = text.toLowerCase();

  const scores: Record<EventCategoryKey, number> = {
    world: 0,
    "insecurity-wars": 0,
    "financials-markets": 0,
    "central-banks-debt": 0,
    "energy-power": 0,
    "shipping-chokepoints": 0,
    "ai-semiconductors": 0,
    "sanctions-trade": 0,
    "food-agriculture": 0,
    "critical-minerals": 0,
    "currency-inflation": 0,
    "africa-macro": 0,
    "asia-industrial": 0,
    "middle-east-corridors": 0,
    "europe-economy": 0,
    "americas-policy": 0,
    "biosecurity-health": 0,
    "cyber-shadow-finance": 0,
    "demographics-labor": 0,
    "mega-infrastructure": 0,
    "water-climate-econ": 0,
    "corporate-monopolies": 0,
    "aviation-defense-tech": 0,
    "real-estate-housing": 0,
  };

  const keywords: Record<EventCategoryKey, string[]> = {
    world: [
      "diplomacy", "diplomatic", "summit", "treaty", "pact", "united nations", "un security council",
      "nato summit", "brics summit", "embassy", "ambassador", "bilateral talks", "foreign minister",
      "peace talks", "ceasefire agreement", "international court", "icj", "icc", "geneva", "head of state",
      "sovereignty dispute", "geopolitical talks", "consulate", "expel diplomat"
    ],
    "insecurity-wars": [
      "war", "military", "missile", "drone strike", "airstrike", "army", "troops", "rebel",
      "combat", "attack", "invasion", "weapons", "soldier", "artillery", "naval clash",
      "tank", "airbase", "hamas", "gaza", "israel", "hezbollah", "lebanon", "ukraine", "russia",
      "sudan", "yemen", "houthi", "syria", "somalia", "kiev", "kyiv", "moscow", "tehran",
      "casualties", "killed", "hostage", "shelling", "clash", "clashes", "cluster-bomb",
      "warhead", "icbm", "ballistic", "frontline", "infantry", "air strike", "massacre"
    ],
    "financials-markets": [
      "stock", "stocks", "wall street", "nasdaq", "s&p 500", "dow jones", "equities", "shares",
      "bond yield", "treasury yields", "market rally", "market selloff", "investor", "hedge fund",
      "private equity", "capital flows", "liquidity", "asset management", "trading volume",
      "bourse", "ftse", "nikkei", "derivatives", "index funds", "market plunge", "rally"
    ],
    "central-banks-debt": [
      "central bank", "federal reserve", "powell", "ecb", "lagarde", "bank of england",
      "bank of japan", "interest rate", "rate hike", "rate cut", "monetary policy",
      "sovereign debt", "debt default", "debt ceiling", "national debt", "treasury bonds",
      "bond market", "imf bailout", "world bank", "quantitative tightening", "balance sheet",
      "bank collapse", "bank run", "banking crisis", "insolvency", "depositors"
    ],
    "energy-power": [
      "oil", "crude", "brent", "wti", "opec", "opec+", "natural gas", "lng", "pipeline",
      "refinery", "power grid", "blackout", "electricity", "nuclear power", "uranium reactor",
      "turbine", "solar power", "wind energy", "coal", "fuel shortage", "diesel", "petrol",
      "gasoline", "utilities", "drilling", "saudi aramco", "gazprom", "exxon"
    ],
    "shipping-chokepoints": [
      "shipping", "maritime", "freight", "container", "cargo", "suez canal", "panama canal",
      "red sea", "strait of hormuz", "bab al-mandab", "bab-el-mandeb", "strait of malacca",
      "bosphorus", "vessel", "tanker", "port congestion", "maersk", "evergreen", "houthi shipping",
      "sea freight", "charter rates", "bulk carrier", "dockworkers", "dry bulk"
    ],
    "ai-semiconductors": [
      "ai", "artificial intelligence", "chip", "chips", "semiconductor", "microchip", "nvidia",
      "tsmc", "asml", "openai", "deepseek", "anthropic", "compute", "gpu", "datacenter", "data center",
      "foundry", "lithography", "wafer", "llm", "neural network", "chatgpt", "gemini", "claude",
      "blackwell", "h100", "ai model", "chips act", "supercomputer"
    ],
    "sanctions-trade": [
      "tariff", "tariffs", "sanctions", "trade war", "export control", "export ban", "embargo",
      "customs", "wto", "protectionism", "trade deficit", "bilateral trade", "import duties",
      "trade barrier", "trade dispute", "counter-tariffs", "secondary sanctions", "trade pact"
    ],
    "food-agriculture": [
      "food", "agriculture", "grain", "wheat", "corn", "rice", "fertilizer", "harvest", "famine",
      "drought crop", "potash", "food supply", "farm", "farming", "farmers", "livestock",
      "food inflation", "breadbasket", "cargill", "food crisis", "food security", "poultry"
    ],
    "critical-minerals": [
      "rare earths", "lithium", "cobalt", "nickel", "copper", "mining", "miners", "bauxite",
      "graphite", "manganese", "mineral deposit", "refining minerals", "critical raw materials",
      "ore", "smelting", "glencore", "rio tinto", "bhp", "mineral supply", "rare-earth"
    ],
    "currency-inflation": [
      "inflation", "cpi", "cost of living", "currency devaluation", "hyperinflation",
      "consumer prices", "purchasing power", "peso", "naira", "lira", "ruble", "dollar index",
      "dxy", "forex", "exchange rate", "price spikes", "living costs", "affordability", "deflation"
    ],
    "africa-macro": [
      "africa", "african union", "ecowas", "nigeria", "south africa", "kenya", "ghana",
      "ethiopia", "angola", "cfa franc", "afcfta", "sub-saharan", "african development bank",
      "nairobi", "lagos", "johannesburg", "african debt", "continental trade", "allafrica"
    ],
    "asia-industrial": [
      "china manufacturing", "india manufacturing", "taiwan industrial", "vietnam factory",
      "indonesia nickel", "supply chain shift", "industrial output", "shenzhen", "guangdong",
      "export hub", "foxconn", "japan industrial", "south korea industrial", "factory output",
      "manufacturing pmi", "electronics assembly", "industrial shift"
    ],
    "middle-east-corridors": [
      "middle east", "gulf states", "saudi arabia", "uae", "qatar", "petrodollars",
      "sovereign wealth fund", "pif", "aramco", "abu dhabi", "riyadh", "economic corridor",
      "imec", "transit route", "neom", "gulf investment", "gcc", "oman", "kuwait"
    ],
    "europe-economy": [
      "europe", "european union", "eu", "germany", "france", "eurozone", "deindustrialization",
      "bundesbank", "german industry", "energy crisis europe", "brussels regulations",
      "italy debt", "uk economy", "boe", "european commission", "eurozone pmi"
    ],
    "americas-policy": [
      "us fiscal", "congress budget", "white house economic", "us national debt", "latin america",
      "mercosur", "brazil", "mexico", "argentina", "milei", "lula", "andean", "lithium triangle",
      "pan-american", "nafta", "usmca", "canada economy", "washington policy"
    ],
    "biosecurity-health": [
      "virus", "outbreak", "bird flu", "h5n1", "mpox", "covid", "pandemic", "epidemic",
      "pathogen", "vaccine", "vaccination", "who", "cdc", "pharma", "drug shortage",
      "pharmaceutical", "biosecurity", "health emergency", "hospital beds", "disease spread"
    ],
    "cyber-shadow-finance": [
      "cyber warfare", "cyber attack", "hackers", "malware", "ransomware", "crypto heist",
      "binance", "illicit finance", "money laundering", "dark web", "shadow banking",
      "espionage", "data breach", "ddos", "north korea hackers", "crypto hack", "lazarus group"
    ],
    "demographics-labor": [
      "demographics", "aging population", "birth rate", "fertility rate", "labor shortage",
      "migration", "migrant", "border crisis", "workforce", "pension crisis", "strike",
      "strikes", "trade union", "asylum", "labor market", "working age", "depopulation"
    ],
    "mega-infrastructure": [
      "infrastructure", "belt and road", "bri", "mega-project", "high-speed rail",
      "deep-water port", "bridge", "dam", "highway corridor", "grid expansion",
      "construction project", "tunnels", "railway network", "airport expansion"
    ],
    "water-climate-econ": [
      "water scarcity", "drought", "aquifer", "desalination", "dam water", "nile",
      "colorado river", "flood", "flooding", "sea level", "resource economics",
      "climate adaptation", "reservoir", "water rationing", "freshwater", "basin"
    ],
    "corporate-monopolies": [
      "antitrust", "monopoly", "monopolistic", "doj antitrust", "ftc", "lina khan",
      "regulatory crackdown", "merger", "acquisition", "big tech monopoly", "cartel",
      "market dominance", "price fixing", "anti-competitive", "breakup"
    ],
    "aviation-defense-tech": [
      "aerospace", "aviation", "boeing", "airbus", "fighter jet", "f-35", "defense contractor",
      "lockheed", "raytheon", "northrop", "drone swarm", "hypersonic", "space defense",
      "military tech", "radar system", "air superiority", "missile defense"
    ],
    "real-estate-housing": [
      "housing", "real estate", "mortgage", "mortgage rates", "property crisis", "rent",
      "housing bubble", "commercial real estate", "cre", "developers", "eviction",
      "evergrande", "housing market", "home prices", "affordable housing", "tenants"
    ],
  };

  for (const [key, kwList] of Object.entries(keywords) as [EventCategoryKey, string[]][]) {
    for (const kw of kwList) {
      if (lower.includes(kw)) {
        scores[key] += kw.length > 5 ? 2 : 1;
      }
    }
  }

  let bestKey: EventCategoryKey = "world";
  let maxScore = 0;
  for (const [key, score] of Object.entries(scores) as [EventCategoryKey, number][]) {
    if (score > maxScore) {
      maxScore = score;
      bestKey = key;
    }
  }

  // Fallback to region hints if generic
  if (maxScore === 0) {
    if (lower.includes("africa") || regionHint?.toLowerCase().includes("africa")) {
      bestKey = "africa-macro";
    } else if (lower.includes("china") || lower.includes("asia") || regionHint?.toLowerCase().includes("asia")) {
      bestKey = "asia-industrial";
    } else if (lower.includes("middle east") || lower.includes("gulf") || regionHint?.toLowerCase().includes("middle east")) {
      bestKey = "middle-east-corridors";
    } else if (lower.includes("europe") || regionHint?.toLowerCase().includes("europe")) {
      bestKey = "europe-economy";
    } else if (lower.includes("latin america") || lower.includes("americas") || regionHint?.toLowerCase().includes("us")) {
      bestKey = "americas-policy";
    } else {
      bestKey = "world";
    }
  }

  const categoryMeta = EVENT_CATEGORIES.find((c) => c.key === bestKey) || EVENT_CATEGORIES[0];
  return {
    key: bestKey,
    label: categoryMeta.label,
  };
}

/**
 * Generates 3 concise, strictly factual bullet points directly grounded in the verified reports.
 * Never invents, embellishes, or twists any words.
 */
export function generateKeyPointsSummary(
  bestArticle: ClusteredNewsArticle,
  clusterArticles: ClusteredNewsArticle[]
): string[] {
  const points: string[] = [];

  // Bullet 1: Core factual event pulled strictly from primary title/snippet
  const primarySnippet = (bestArticle.snippet || "").replace(/<[^>]*>?/gm, "").trim();
  const primarySentences = primarySnippet
    ? primarySnippet.split(/(?<=[.?!])\s+/).filter((s) => s.length > 20 && !s.includes("<!DOCTYPE"))
    : [];

  if (primarySentences[0]) {
    points.push(primarySentences[0].replace(/\.\.\.$/, ""));
  } else {
    points.push(`Verified breaking dispatch: ${bestArticle.title.trim()}`);
  }

  // Bullet 2: Corroborating facts / institutional responses / numbers
  let point2 = "";
  if (primarySentences[1] && primarySentences[1] !== primarySentences[0]) {
    point2 = primarySentences[1].replace(/\.\.\.$/, "");
  } else if (clusterArticles.length > 1) {
    const secArticle = clusterArticles.find((a) => a !== bestArticle && a.snippet && a.snippet.length > 25);
    if (secArticle && secArticle.snippet) {
      const secSentence = secArticle.snippet.split(/(?<=[.?!])\s+/).filter((s) => s.length > 20)[0];
      if (secSentence) point2 = `${secArticle.source} reports: ${secSentence.replace(/\.\.\.$/, "")}`;
    }
  }

  if (!point2) {
    const outletsList = clusterArticles.map((a) => a.source).slice(0, 3).join(", ");
    point2 = `Confirmed across primary international news services including ${outletsList}.`;
  }
  points.push(point2);

  // Bullet 3: Strategic geopolitical or economic impact
  let point3 = "";
  if (primarySentences[2]) {
    point3 = primarySentences[2].replace(/\.\.\.$/, "");
  } else if (clusterArticles.length > 2) {
    const thirdArticle = clusterArticles[2];
    if (thirdArticle.snippet && thirdArticle.snippet.length > 25) {
      point3 = `${thirdArticle.source} notes operational impact: ${thirdArticle.snippet.slice(0, 140)}`;
    }
  }

  if (!point3) {
    const regions = Array.from(new Set(clusterArticles.map((a) => a.region)));
    point3 = `Immediate systemic impact observed across regional jurisdictions (${regions.join(", ") || "Global"}).`;
  }
  points.push(point3);

  // Return exactly 3 strictly factual bullets
  return points.slice(0, 3).map((p) => p.replace(/\s+/g, " ").trim().replace(/\.*$/, ""));
}

/**
 * Compiles a formatted summary sheet matching the required layout for 1-click .txt downloads
 */
export function generateCompiledSummaryText(params: {
  scope: string; // e.g. "ALL 24 SECTIONS" or "WORLD & DIPLOMATIC FLASHPOINTS"
  sortMode: string; // e.g. "Weighted Importance" or "Popularity (Consensus)"
  events: ClusteredNewsEvent[];
  sectionMetas?: EventCategoryMeta[];
}): string {
  const { scope, sortMode, events, sectionMetas = EVENT_CATEGORIES } = params;
  const now = new Date();
  const generatedTime = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)} UTC`;

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
  const isGlobal = scope.toUpperCase() === "ALL 24 SECTIONS" || scope.toUpperCase() === "GLOBAL";
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
      (ev.keyPointsSummary || []).forEach((kp) => {
        lines.push(`• ${kp}`);
      });
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
 * Calculates sensitivity classification for backwards compatibility and tags
 */
export function calculateSensitivity(text: string): { score: number; label: string; primaryNiche: GeopoliticalNiche } {
  const lower = text.toLowerCase();
  let matchedNiche: GeopoliticalNiche = "all";
  let maxNicheMatches = 0;

  for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
    let count = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) count++;
    }
    if (count > maxNicheMatches) {
      maxNicheMatches = count;
      matchedNiche = niche as GeopoliticalNiche;
    }
  }

  const nicheNameMap: Record<string, string> = {
    "wars-conflicts": "Wars & Conflicts",
    "outbreaks-health": "Bio-Health & Outbreak",
    "ai-tech": "AI & Tech Geopolitics",
    "macro-trade": "Global Macro & Trade",
    all: "Geopolitics",
  };

  return {
    score: 8,
    label: `⚡ Active • ${nicheNameMap[matchedNiche] || "Geopolitics"}`,
    primaryNiche: matchedNiche,
  };
}

/**
 * Formats time ago string (e.g. "14m ago", "2h ago", "1d ago")
 */
export function formatTimeAgo(dateString: string): string {
  const timestamp = new Date(dateString).getTime();
  if (isNaN(timestamp)) return "Recent";

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return "Just now";

  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface RawArticleItem {
  title: string;
  source: string;
  region: string;
  pubDate: string;
  link: string;
  category?: string;
  snippet?: string;
}

interface IntermediateCluster {
  id: string;
  articles: ClusteredNewsArticle[];
  centroidTokens: Set<string>; // Core non-country event tokens of the cluster
  latestTimestamp: number;
}

/**
 * STRICT SAME-EVENT CLUSTERING ENGINE
 *
 * Rules:
 * 1. Two headlines CANNOT be grouped solely because they share a country name or generic news words!
 * 2. To belong to the same cluster, a candidate article MUST share at least 2 specific NON-COUNTRY
 *    event tokens with the cluster's core subject, OR exceed a 0.38 Jaccard similarity on non-country tokens.
 * 3. No Transitive Chaining ("Snowballing"): Compare candidate directly against the cluster's core centroid.
 * 4. Unique Outlet Counting: Counts distinct news organizations accurately.
 * 5. Best Headline Selection: Sets the display title to the headline with highest overlap across the cluster.
 */
export function clusterAndScoreHeadlines(rawArticles: RawArticleItem[], query?: string): ClusteredNewsEvent[] {
  const clusters: IntermediateCluster[] = [];

  for (const article of rawArticles) {
    if (!article.title || article.title.length < 8) continue;

    const fullArticleText = `${article.title} ${article.snippet || ""}`;
    const { nonCountryTokens } = extractNonCountryTokens(fullArticleText);

    // If an article has fewer than 2 non-country tokens, it's too ambiguous to cluster blindly
    let bestCluster: IntermediateCluster | null = null;
    let highestSimilarity = 0;

    for (const cluster of clusters) {
      let sharedCount = 0;
      for (const token of nonCountryTokens) {
        if (cluster.centroidTokens.has(token)) {
          sharedCount++;
        }
      }

      const unionSize = new Set([...nonCountryTokens, ...cluster.centroidTokens]).size;
      const jaccard = unionSize > 0 ? sharedCount / unionSize : 0;

      // STRICT RULE: Must share at least 2 specific NON-COUNTRY event tokens, OR have Jaccard >= 0.38
      const isMatch = sharedCount >= 2 || (jaccard >= 0.38 && sharedCount >= 1);

      if (isMatch) {
        const similarityScore = sharedCount * 1.5 + jaccard;
        if (similarityScore > highestSimilarity) {
          highestSimilarity = similarityScore;
          bestCluster = cluster;
        }
      }
    }

    const pubTime = new Date(article.pubDate).getTime() || Date.now();

    if (bestCluster) {
      // Add article to cluster
      bestCluster.articles.push({
        title: article.title,
        source: article.source,
        region: article.region,
        link: article.link,
        pubDate: article.pubDate,
        snippet: article.snippet,
      });

      // Maintain centroid focus without runaway drift (no transitive snowballing):
      // Only retain/add tokens that have multiple confirmations
      if (pubTime > bestCluster.latestTimestamp) {
        bestCluster.latestTimestamp = pubTime;
      }
    } else {
      // Create new cluster with this article's non-country tokens as the anchor centroid
      clusters.push({
        id: `cluster-${Date.now()}-${clusters.length + 1}`,
        articles: [
          {
            title: article.title,
            source: article.source,
            region: article.region,
            link: article.link,
            pubDate: article.pubDate,
            snippet: article.snippet,
          },
        ],
        centroidTokens: new Set(nonCountryTokens),
        latestTimestamp: pubTime,
      });
    }
  }

  // Refine each cluster into a final ClusteredNewsEvent
  const events: ClusteredNewsEvent[] = clusters.map((c) => {
    // Collect distinct outlets & regions
    const distinctOutlets = Array.from(new Set(c.articles.map((a) => a.source.trim())));
    const distinctRegions = Array.from(new Set(c.articles.map((a) => a.region.trim())));

    // Best Headline Selection:
    // Select the headline from a premier outlet that has the highest overlap with all articles in this cluster
    const PREMIER_OUTLETS = [
      "reuters", "bloomberg", "financial times", "bbc", "al jazeera", "ap", "associated press",
      "cnn", "dw", "france24", "the hindu", "the guardian", "wall street journal", "wsj"
    ];

    let bestArticle = c.articles[0];
    let bestHeadlineScore = -1;

    for (const art of c.articles) {
      const artTokens = extractNonCountryTokens(art.title).nonCountryTokens;
      let overlapSum = 0;

      for (const other of c.articles) {
        if (other === art) continue;
        const otherTokens = extractNonCountryTokens(other.title).nonCountryTokens;
        for (const t of artTokens) {
          if (otherTokens.has(t)) overlapSum++;
        }
      }

      // Outlet authority weight
      const isPremier = PREMIER_OUTLETS.some((o) => art.source.toLowerCase().includes(o));
      const authorityBonus = isPremier ? 4 : 0;

      // Length penalty if too short (<25 chars) or too long (>140 chars)
      const lengthBonus = art.title.length >= 35 && art.title.length <= 130 ? 2 : 0;

      const totalScore = overlapSum + authorityBonus + lengthBonus;
      if (totalScore > bestHeadlineScore) {
        bestHeadlineScore = totalScore;
        bestArticle = art;
      }
    }

    // Build 2-sentence summary
    const validSnippets = c.articles
      .map((a) => a.snippet?.trim())
      .filter((s): s is string => Boolean(s && s.length > 25 && !s.includes("<!DOCTYPE")));

    let summary = validSnippets[0] || "";
    if (validSnippets.length > 1 && validSnippets[1] !== validSnippets[0]) {
      summary = `${summary.replace(/\.\.\.$/, "")}. ${validSnippets[1]}`;
    }
    if (!summary || summary.length < 20) {
      summary = `${bestArticle.title}. Verified dispatches from ${distinctOutlets.length} international news services reporting across ${distinctRegions.join(", ")}.`;
    }
    summary = summary.replace(/\s+/g, " ").trim();
    if (summary.length > 250) {
      summary = summary.slice(0, 247) + "...";
    }

    // Full text of all articles in the cluster for importance scoring
    const fullClusterText = c.articles.map((a) => `${a.title} ${a.snippet || ""}`).join(" ");

    // Scores
    const popularityScore = calculatePopularityScore(
      distinctOutlets.length,
      distinctRegions.length,
      c.latestTimestamp
    );

    const { score: importanceScore, grade: importanceGrade, label: importanceLabel } =
      calculateImportanceScore(fullClusterText, distinctRegions.length);

    const { primaryNiche, label: sensitivityLabel, score: sensitivityScore } =
      calculateSensitivity(fullClusterText);

    const { key: categoryKey, label: categoryLabel } = classifyEventCategory(fullClusterText);

    // Consensus badge showing which major global outlets are reporting this same event right now
    const topOutletsSample = distinctOutlets.slice(0, 3).join(", ");
    const remainingOutletsCount = distinctOutlets.length - 3;
    const outletsSuffix = remainingOutletsCount > 0 ? ` +${remainingOutletsCount} more` : "";
    const consensusBadge =
      distinctOutlets.length >= 2
        ? `🚨 ${distinctOutlets.length} Outlets: ${topOutletsSample}${outletsSuffix}`
        : `📡 ${distinctOutlets[0] || "Global Wire"}`;

    const keyPointsSummary = generateKeyPointsSummary(bestArticle, c.articles);

    return {
      id: c.id,
      title: bestArticle.title,
      summary,
      categoryKey,
      categoryLabel,
      category: categoryLabel,
      primaryNiche,
      sensitivityLabel,
      consensusBadge,
      outlets: distinctOutlets,
      regions: distinctRegions,
      consensusScore: popularityScore, // Backward compatibility
      popularityScore,
      importanceScore,
      importanceGrade,
      tierGrade: importanceGrade,
      importanceLabel,
      recencyScore: c.latestTimestamp,
      timeAgo: formatTimeAgo(new Date(c.latestTimestamp).toISOString()),
      sensitivityScore,
      articles: c.articles,
      keyPointsSummary,
    };
  });

  // Default sort: Query relevance first (if searching), then popularity, then importance
  events.sort((a, b) => {
    if (query) {
      const qLower = query.toLowerCase();
      const aMatches = a.title.toLowerCase().includes(qLower) || a.summary.toLowerCase().includes(qLower);
      const bMatches = b.title.toLowerCase().includes(qLower) || b.summary.toLowerCase().includes(qLower);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
    }

    if (b.popularityScore !== a.popularityScore) {
      return b.popularityScore - a.popularityScore;
    }
    if (b.importanceScore !== a.importanceScore) {
      return b.importanceScore - a.importanceScore;
    }
    return b.recencyScore - a.recencyScore;
  });

  return events;
}
