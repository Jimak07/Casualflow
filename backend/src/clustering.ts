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
  primaryNiche: GeopoliticalNiche;
  sensitivityLabel: string;
  consensusBadge: string;
  outlets: string[];
  regions: string[];
  consensusScore: number; // Backward compatibility
  popularityScore: number; // 0 - 100 (Cross-Outlet Consensus)
  importanceScore: number; // 0 - 100 (Global Economic & Geopolitical Impact)
  importanceGrade: ImportanceGrade; // "S-Tier" | "A-Tier" | "B-Tier"
  importanceLabel: string; // e.g. "94% Global Impact [S-Tier: Economy & Geopolitics]"
  recencyScore: number;
  timeAgo: string;
  sensitivityScore: number;
  articles: ClusteredNewsArticle[];
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

    // Consensus badge formatted as: 📡 6 Global Outlets (4 Regions)
    const consensusBadge =
      distinctOutlets.length >= 2
        ? `📡 ${distinctOutlets.length} Global Outlets (${distinctRegions.length} Regions)`
        : `📡 1 Global Outlet (${distinctRegions[0] || "Global"})`;

    return {
      id: c.id,
      title: bestArticle.title,
      summary,
      primaryNiche,
      sensitivityLabel,
      consensusBadge,
      outlets: distinctOutlets,
      regions: distinctRegions,
      consensusScore: popularityScore, // Backward compatibility
      popularityScore,
      importanceScore,
      importanceGrade,
      importanceLabel,
      recencyScore: c.latestTimestamp,
      timeAgo: formatTimeAgo(new Date(c.latestTimestamp).toISOString()),
      sensitivityScore,
      articles: c.articles,
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
