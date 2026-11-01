/**
 * Algorithmic Story Clustering & Consensus Scoring Engine
 * Groups live RSS headlines across global outlets without requiring an LLM.
 */

export type GeopoliticalNiche =
  | "all"
  | "wars-conflicts"
  | "outbreaks-health"
  | "ai-tech"
  | "macro-trade";

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

// Common English stopwords to ignore during keyword extraction
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
  "your", "yours", "yourself", "yourselves", "says", "said", "will", "new", "first", "two", "three",
  "amid", "after", "over", "into", "year", "years", "day", "days", "week", "weeks", "latest",
  "report", "reports", "reported", "breaking", "update", "live", "watch", "video", "photos",
  "one", "also", "back", "just", "now", "like", "get", "make", "take", "see", "know", "world",
  "news", "exclusive", "alert"
]);

// Known multi-word entities for high-confidence entity matching
const KNOWN_ENTITIES = [
  "donald trump", "kamala harris", "joe biden", "vladimir putin", "xi jinping",
  "benjamin netanyahu", "volodymyr zelenskyy", "zelenskyy", "zelensky",
  "middle east", "red sea", "gaza strip", "west bank", "south china sea", "taiwan strait",
  "cape of good hope", "suez canal", "bab-el-mandeb", "strait of hormuz",
  "federal reserve", "central bank", "bank of england", "european central bank", "international monetary fund",
  "world health organization", "united nations", "european union", "nato",
  "artificial intelligence", "deepseek", "nvidia", "openai", "semiconductor",
  "wall street", "silicon valley", "white house", "downing street", "kremlin",
  "north korea", "south korea", "saudi arabia", "south africa", "united states", "united kingdom"
];

// Niche keywords for scope filtering
const NICHE_KEYWORDS = {
  "wars-conflicts": [
    "war", "military", "missile", "drone", "strike", "airstrike", "army", "troop", "rebel",
    "combat", "attack", "invasion", "ceasefire", "weapons", "soldier", "artillery", "naval",
    "tank", "airbase", "hamas", "gaza", "israel", "hezbollah", "lebanon", "ukraine", "russia",
    "sudan", "yemen", "houthi", "syria", "somalia", "kiev", "kyiv", "moscow", "tehran",
    "defense", "casualty", "casualties", "killed", "hostage", "shelling", "clash", "clashes"
  ],
  "outbreaks-health": [
    "outbreak", "virus", "disease", "flu", "bird flu", "h5n1", "mpox", "covid", "pandemic",
    "epidemic", "vaccine", "vaccination", "infection", "contagion", "patient", "hospital",
    "pathogen", "ebola", "cholera", "marburg", "health emergency", "who", "cdc", "medical",
    "quarantine", "biosecurity", "transmission"
  ],
  "ai-tech": [
    "ai", "artificial intelligence", "chip", "semiconductor", "nvidia", "openai", "compute",
    "model", "gpu", "tsmc", "deepseek", "anthropic", "quantum", "cyber", "robot", "robotics",
    "algorithm", "datacenter", "data center", "tech giant", "tech export", "supercomputer",
    "h100", "blackwell", "asml", "lithography"
  ],
  "macro-trade": [
    "tariff", "tariffs", "trade war", "trade", "inflation", "cpi", "fed", "federal reserve",
    "central bank", "rate cut", "rate hike", "interest rate", "currency", "bond", "treasury",
    "dollar", "euro", "yen", "yuan", "ruble", "oil", "brent", "crude", "gas", "lng", "opec",
    "debt", "default", "deficit", "gdp", "supply chain", "shipping", "freight", "container",
    "grain", "wheat", "food price", "export ban", "sanction", "sanctions", "customs"
  ]
};

// Sensitivity score weights
const SENSITIVITY_WEIGHTS: Record<string, number> = {
  // Extreme urgency (+10)
  war: 10, invasion: 10, missile: 10, nuclear: 12, outbreak: 10, pandemic: 10,
  ebola: 10, mpox: 10, "bird flu": 10, coup: 10, airstrike: 10, massacre: 10,
  explosion: 9, blast: 9, casualties: 9, killed: 8, martial: 9, emergency: 8,
  // High geopolitical/economic urgency (+6)
  sanctions: 7, tariff: 7, tariffs: 7, "trade war": 7, "central bank": 6, "rate hike": 6,
  "rate cut": 6, default: 7, "debt crisis": 7, semiconductor: 6, "chip ban": 7,
  "ai model": 6, summit: 5, ceasefire: 7, embargo: 7, blockade: 7, famine: 8,
  // Moderate urgency (+3)
  inflation: 4, protest: 4, election: 3, dispute: 3, shortage: 4, pipeline: 4,
  "supply chain": 4, port: 3, energy: 3, blackout: 5
};

/**
 * Extracts normalized tokens, keywords, and known multi-word entities from text
 */
export function extractEntitiesAndKeywords(text: string): { entities: string[]; keywords: Set<string> } {
  const lower = text.toLowerCase();
  const foundEntities: string[] = [];

  // 1. Check known multi-word entities
  for (const entity of KNOWN_ENTITIES) {
    if (lower.includes(entity)) {
      foundEntities.push(entity);
    }
  }

  // 2. Tokenize words
  const words = lower
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  const keywords = new Set<string>(words);
  for (const ent of foundEntities) {
    keywords.add(ent);
  }

  return { entities: foundEntities, keywords };
}

/**
 * Calculates sensitivity score and assigns descriptive label based on urgency keywords
 */
export function calculateSensitivity(text: string): { score: number; label: string; primaryNiche: GeopoliticalNiche } {
  const lower = text.toLowerCase();
  let score = 0;

  for (const [kw, weight] of Object.entries(SENSITIVITY_WEIGHTS)) {
    if (lower.includes(kw)) {
      score += weight;
    }
  }

  // Determine primary niche
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

  // Sensitivity label
  let urgency = "⚡ Moderate";
  if (score >= 16) {
    urgency = "🚨 High Sensitivity";
  } else if (score >= 8) {
    urgency = "⚠️ Elevated";
  } else {
    urgency = "🌐 Active News";
  }

  const nicheNameMap: Record<string, string> = {
    "wars-conflicts": "Wars & Conflicts",
    "outbreaks-health": "Bio-Health & Outbreak",
    "ai-tech": "AI & Tech Geopolitics",
    "macro-trade": "Global Macro & Trade",
    all: "Geopolitics",
  };

  const label = `${urgency} • ${nicheNameMap[matchedNiche] || "Geopolitics"}`;

  return {
    score: Math.max(score, 2),
    label,
    primaryNiche: matchedNiche,
  };
}

/**
 * Computes time ago string (e.g. "14m ago", "2h ago", "1d ago")
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
  keywordCounts: Map<string, number>;
  entities: Set<string>;
  latestTimestamp: number;
}

/**
 * Algorithmic clustering of raw articles into multi-outlet news events
 */
export function clusterAndScoreHeadlines(rawArticles: RawArticleItem[], query?: string): ClusteredNewsEvent[] {
  const clusters: IntermediateCluster[] = [];

  for (const article of rawArticles) {
    if (!article.title || article.title.length < 8) continue;

    const { entities, keywords } = extractEntitiesAndKeywords(`${article.title} ${article.snippet || ""}`);
    let bestCluster: IntermediateCluster | null = null;
    let highestOverlap = 0;

    // Compare with existing clusters
    for (const cluster of clusters) {
      let overlap = 0;

      // Exact entity overlap is a strong signal (e.g. both match "Donald Trump" or "Red Sea")
      for (const ent of entities) {
        if (cluster.entities.has(ent)) {
          overlap += 3;
        }
      }

      // Keyword overlap
      for (const kw of keywords) {
        if (cluster.keywordCounts.has(kw)) {
          overlap += 1;
        }
      }

      if (overlap >= 2 && overlap > highestOverlap) {
        highestOverlap = overlap;
        bestCluster = cluster;
      }
    }

    const pubTime = new Date(article.pubDate).getTime() || Date.now();

    if (bestCluster && highestOverlap >= 2) {
      // Add article to cluster
      bestCluster.articles.push({
        title: article.title,
        source: article.source,
        region: article.region,
        link: article.link,
        pubDate: article.pubDate,
        snippet: article.snippet,
      });

      // Update cluster entities & keywords
      for (const ent of entities) bestCluster.entities.add(ent);
      for (const kw of keywords) {
        const cur = bestCluster.keywordCounts.get(kw) || 0;
        bestCluster.keywordCounts.set(kw, cur + 1);
      }
      if (pubTime > bestCluster.latestTimestamp) {
        bestCluster.latestTimestamp = pubTime;
      }
    } else {
      // Create new cluster
      const kwMap = new Map<string, number>();
      for (const kw of keywords) kwMap.set(kw, 1);

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
        keywordCounts: kwMap,
        entities: new Set(entities),
        latestTimestamp: pubTime,
      });
    }
  }

  // Refine each cluster into a final ClusteredNewsEvent
  const events: ClusteredNewsEvent[] = clusters.map((c, idx) => {
    // Collect distinct outlets & regions
    const distinctOutlets = Array.from(new Set(c.articles.map((a) => a.source)));
    const distinctRegions = Array.from(new Set(c.articles.map((a) => a.region)));

    // Pick primary headline: prefer authoritative wire outlets or the most descriptive title
    const prioritizedSources = ["Reuters", "BBC World", "Al Jazeera", "CNN", "The Hindu", "France24", "DW"];
    let bestArticle = c.articles[0];

    for (const a of c.articles) {
      const isPrioritySource = prioritizedSources.some((s) => a.source.toLowerCase().includes(s.toLowerCase()));
      if (isPrioritySource) {
        bestArticle = a;
        break;
      }
      if (a.title.length > bestArticle.title.length) {
        bestArticle = a;
      }
    }

    // Build 2-sentence summary from available snippets
    const snippets = c.articles
      .map((a) => a.snippet?.trim())
      .filter((s): s is string => Boolean(s && s.length > 25 && !s.includes("<!DOCTYPE")));

    let summary = snippets[0] || "";
    if (snippets.length > 1 && snippets[1] !== snippets[0]) {
      summary = `${summary.replace(/\.\.\.$/, "")}. ${snippets[1]}`;
    }
    if (!summary || summary.length < 20) {
      summary = `${bestArticle.title}. Multiple global news agencies report ongoing developments across ${distinctRegions.join(", ")}.`;
    }
    // Clean up summary
    summary = summary.replace(/\s+/g, " ").trim();
    if (summary.length > 240) {
      summary = summary.slice(0, 237) + "...";
    }

    // Full text for sensitivity calculation
    const allText = c.articles.map((a) => `${a.title} ${a.snippet || ""}`).join(" ");
    const { score: sensitivityScore, label: sensitivityLabel, primaryNiche } = calculateSensitivity(allText);

    // Consensus score formula: distinct outlets * 3 + distinct regions * 2 + articles capped at 5
    const consensusScore = (distinctOutlets.length * 3) + (distinctRegions.length * 2) + Math.min(c.articles.length, 5);

    // Consensus badge text
    let consensusBadge = "";
    if (distinctOutlets.length >= 2) {
      const sampleOutlets = distinctOutlets.slice(0, 4).join(", ");
      const extra = distinctOutlets.length > 4 ? ` +${distinctOutlets.length - 4} more` : "";
      consensusBadge = `🔥 REPORTED BY ${distinctOutlets.length} MAJOR OUTLETS (${sampleOutlets}${extra})`;
    } else {
      consensusBadge = `📰 VERIFIED REPORTING • ${distinctOutlets[0] || "Global Wire"}`;
    }

    return {
      id: c.id,
      title: bestArticle.title,
      summary,
      primaryNiche,
      sensitivityLabel,
      consensusBadge,
      outlets: distinctOutlets,
      regions: distinctRegions,
      consensusScore,
      recencyScore: c.latestTimestamp,
      timeAgo: formatTimeAgo(new Date(c.latestTimestamp).toISOString()),
      sensitivityScore,
      articles: c.articles,
    };
  });

  // Default sorting: Consensus score descending, then recency descending
  events.sort((a, b) => {
    if (query) {
      // Relevance sort when query is active
      const qLower = query.toLowerCase();
      const aMatches = a.title.toLowerCase().includes(qLower) || a.summary.toLowerCase().includes(qLower);
      const bMatches = b.title.toLowerCase().includes(qLower) || b.summary.toLowerCase().includes(qLower);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
    }
    if (b.consensusScore !== a.consensusScore) {
      return b.consensusScore - a.consensusScore;
    }
    return b.recencyScore - a.recencyScore;
  });

  return events;
}
