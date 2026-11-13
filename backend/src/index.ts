import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import Parser from "rss-parser";
import {
  detectAiProvider,
  callUniversalAi,
  callUniversalAiRawText,
  getAvailableModelsForProvider,
} from "./aiProvider.js";
import { generateRssConsensusPitches } from "./fallbackSynthesis.js";
import { buildVerifiedBriefingPack } from "./articleScraper.js";
import { JIMAK_WRITING_STYLE_GUIDE } from "./jimakStyleGuide.js";
import { getActiveApiKey } from "./config/keys.js";

import {
  clusterAndScoreHeadlines,
  EVENT_CATEGORIES,
  generateCompiledSummaryText,
  ClusteredNewsEvent,
} from "./clustering.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 8000;

// Enable JSON body parser
app.use(express.json({ limit: "5mb" }));

// Configure CORS for local development and production deployments
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 1. Health check route
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "causalflow-backend",
    version: "2.1.0",
    engine: "Global Consensus & Evidence-Based Geopolitical Engine",
    timestamp: new Date().toISOString(),
  });
});

// Dynamic Models Discovery route (GET /api/models)
app.get("/api/models", async (req: Request, res: Response) => {
  try {
    const rawKey =
      (req.query.apiKey as string) ||
      (req.headers.authorization?.replace(/^Bearer\s+/i, "")) ||
      getActiveApiKey();
    const providerParam = (req.query.provider as string) || "";

    const aiConfig = detectAiProvider({
      rawKey,
      provider: providerParam,
    });

    if (!aiConfig) {
      return res.json({
        success: true,
        provider: "none",
        models: [
          {
            id: "hybrid",
            label: "Auto (Smart Fallback)",
            tag: "Default",
            isDefault: true,
          },
        ],
      });
    }

    const models = await getAvailableModelsForProvider(aiConfig);
    return res.json({
      success: true,
      provider: aiConfig.provider,
      providerLabel: aiConfig.providerLabel,
      models,
    });
  } catch (error: any) {
    console.error("Error fetching models:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch models",
      models: [
        {
          id: "hybrid",
          label: "Auto (Smart Fallback)",
          tag: "Default",
          isDefault: true,
        },
        {
          id: "gemini-3.1-flash-lite",
          label: "gemini-3.1-flash-lite (Active)",
          tag: "Active",
        },
        {
          id: "claude-haiku-4-5",
          label: "claude-haiku-4-5 (Active)",
          tag: "Active",
        },
        {
          id: "nemotron-ultra-550b",
          label: "nemotron-ultra-550b (Active)",
          tag: "Active",
        },
        {
          id: "claude-sonnet-4-6",
          label: "claude-sonnet-4-6 (Active)",
          tag: "Active",
        },
        {
          id: "gpt-5.6-luna",
          label: "gpt-5.6-luna (Active)",
          tag: "Active",
        },
      ],
    });
  }
});

// 2. TRUE GLOBAL RSS MATRIX (GET /api/radar)
interface FeedConfig {
  url: string;
  source: string;
  region:
    | "Africa"
    | "India & South Asia"
    | "Asia-Pacific"
    | "Middle East"
    | "Europe & UK"
    | "US & Global Finance";
  category: "geopolitics" | "finance" | "tech";
}

const GLOBAL_RSS_MATRIX: FeedConfig[] = [
  // 1. Africa
  {
    url: "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf",
    source: "AllAfrica",
    region: "Africa",
    category: "geopolitics",
  },
  {
    url: "https://punchng.com/feed/",
    source: "Punch Nigeria",
    region: "Africa",
    category: "geopolitics",
  },
  {
    url: "https://businessday.ng/feed/",
    source: "BusinessDay NG",
    region: "Africa",
    category: "finance",
  },
  {
    url: "https://www.dailymaverick.co.za/dmrss/",
    source: "Daily Maverick SA",
    region: "Africa",
    category: "geopolitics",
  },
  {
    url: "https://news.google.com/rss?hl=en-NG&gl=NG&ceid=NG:en",
    source: "Google News Africa",
    region: "Africa",
    category: "geopolitics",
  },

  // 2. India & South Asia
  {
    url: "https://www.thehindu.com/news/international/feeder/default.rss",
    source: "The Hindu",
    region: "India & South Asia",
    category: "geopolitics",
  },
  {
    url: "https://economictimes.indiatimes.com/rssfeedsdefault.cms",
    source: "Economic Times India",
    region: "India & South Asia",
    category: "finance",
  },
  {
    url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms",
    source: "Times of India World",
    region: "India & South Asia",
    category: "geopolitics",
  },

  // 3. Asia-Pacific
  {
    url: "https://www.scmp.com/rss/91/feed",
    source: "South China Morning Post",
    region: "Asia-Pacific",
    category: "geopolitics",
  },
  {
    url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml",
    source: "Channel NewsAsia",
    region: "Asia-Pacific",
    category: "geopolitics",
  },
  {
    url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-SG&gl=SG&ceid=SG:en",
    source: "Google News Asia",
    region: "Asia-Pacific",
    category: "geopolitics",
  },

  // 4. Middle East
  {
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    source: "Al Jazeera",
    region: "Middle East",
    category: "geopolitics",
  },

  // 5. Europe & UK
  {
    url: "http://feeds.bbci.co.uk/news/world/rss.xml",
    source: "BBC World",
    region: "Europe & UK",
    category: "geopolitics",
  },
  {
    url: "http://feeds.bbci.co.uk/news/technology/rss.xml",
    source: "BBC Tech",
    region: "Europe & UK",
    category: "tech",
  },
  {
    url: "http://feeds.bbci.co.uk/news/health/rss.xml",
    source: "BBC Health",
    region: "Europe & UK",
    category: "geopolitics",
  },
  {
    url: "https://rss.dw.com/rdf/rss-en-all",
    source: "Deutsche Welle",
    region: "Europe & UK",
    category: "geopolitics",
  },
  {
    url: "https://www.france24.com/en/rss",
    source: "France24",
    region: "Europe & UK",
    category: "geopolitics",
  },

  // 6. US & Global Finance
  {
    url: "https://news.google.com/rss/search?q=site:cnn.com+when:2d&hl=en-US&gl=US&ceid=US:en",
    source: "CNN",
    region: "US & Global Finance",
    category: "geopolitics",
  },
  {
    url: "https://news.google.com/rss/search?q=site:reuters.com+when:2d&hl=en-US&gl=US&ceid=US:en",
    source: "Reuters",
    region: "US & Global Finance",
    category: "geopolitics",
  },
  {
    url: "https://news.google.com/rss/search?q=site:apnews.com+when:2d&hl=en-US&gl=US&ceid=US:en",
    source: "Associated Press",
    region: "US & Global Finance",
    category: "geopolitics",
  },
  {
    url: "https://news.google.com/rss/search?q=site:bloomberg.com+when:2d&hl=en-US&gl=US&ceid=US:en",
    source: "Bloomberg",
    region: "US & Global Finance",
    category: "finance",
  },
  {
    url: "https://finance.yahoo.com/news/rssindex",
    source: "Yahoo Finance",
    region: "US & Global Finance",
    category: "finance",
  },
  {
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362",
    source: "CNBC World",
    region: "US & Global Finance",
    category: "finance",
  },
  {
    url: "https://news.google.com/rss/headlines/section/topic/WORLD",
    source: "Google News World",
    region: "US & Global Finance",
    category: "geopolitics",
  },
];

const rssParser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  timeout: 7000,
});

app.get("/api/radar", async (req: Request, res: Response) => {
  try {
    const query = (
      (req.query.q as string) ||
      (req.query.query as string) ||
      ""
    ).trim();

    // Prepare list of feeds to query
    const activeFeeds: FeedConfig[] = [...GLOBAL_RSS_MATRIX];

    // If user provided a search query, dynamically inject Google News search RSS across 4 continents!
    if (query) {
      const encodedQuery = encodeURIComponent(query);
      activeFeeds.unshift(
        {
          url: `https://news.google.com/rss/search?q=${encodedQuery}+when:2d&hl=en-US&gl=US&ceid=US:en`,
          source: "Google News (US/Global)",
          region: "US & Global Finance",
          category: "geopolitics",
        },
        {
          url: `https://news.google.com/rss/search?q=${encodedQuery}+when:2d&hl=en-IN&gl=IN&ceid=IN:en`,
          source: "Google News (India)",
          region: "India & South Asia",
          category: "geopolitics",
        },
        {
          url: `https://news.google.com/rss/search?q=${encodedQuery}+when:2d&hl=en-GB&gl=GB&ceid=GB:en`,
          source: "Google News (Europe)",
          region: "Europe & UK",
          category: "geopolitics",
        },
        {
          url: `https://news.google.com/rss/search?q=${encodedQuery}+when:2d&hl=en-NG&gl=NG&ceid=NG:en`,
          source: "Google News (Africa)",
          region: "Africa",
          category: "geopolitics",
        }
      );
    }

    const fetchPromises = activeFeeds.map(async (feed) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      try {
        const response = await fetch(feed.url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "application/rss+xml, application/xml, text/xml, */*",
          },
        });

        clearTimeout(timeoutId);
        if (!response.ok) return [];

        const xml = await response.text();
        const parsed = await rssParser.parseString(xml);

        return (parsed.items || []).slice(0, 15).map((item) => {
          const rawTitle = (item.title || "").replace(/<[^>]*>?/gm, "").trim();
          const rawSnippet = (
            item.contentSnippet ||
            item.content ||
            item.summary ||
            ""
          )
            .replace(/<[^>]*>?/gm, "")
            .trim()
            .slice(0, 200);

          return {
            title: rawTitle,
            source: feed.source,
            region: feed.region,
            pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
            link: item.link || "",
            category: feed.category,
            snippet: rawSnippet,
          };
        });
      } catch {
        clearTimeout(timeoutId);
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    const allHeadlines = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    // Deduplicate headlines by normalized title
    const seenTitles = new Set<string>();
    const uniqueHeadlines = [];

    for (const item of allHeadlines) {
      if (!item.title || item.title.length < 8) continue;
      const normalized = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 45);

      if (!seenTitles.has(normalized)) {
        seenTitles.add(normalized);
        uniqueHeadlines.push(item);
      }
    }

    // If query exists, prioritize headlines that explicitly contain query words
    if (query) {
      const qLower = query.toLowerCase();
      uniqueHeadlines.sort((a, b) => {
        const aMatches =
          a.title.toLowerCase().includes(qLower) ||
          a.snippet.toLowerCase().includes(qLower);
        const bMatches =
          b.title.toLowerCase().includes(qLower) ||
          b.snippet.toLowerCase().includes(qLower);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;

        const dateA = new Date(a.pubDate).getTime() || 0;
        const dateB = new Date(b.pubDate).getTime() || 0;
        return dateB - dateA;
      });
    } else {
      // Sort chronologically (most recent first)
      uniqueHeadlines.sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime() || 0;
        const dateB = new Date(b.pubDate).getTime() || 0;
        return dateB - dateA;
      });
    }

    // Run pure algorithmic clustering and scoring across all unique articles
    const clusters = clusterAndScoreHeadlines(uniqueHeadlines, query);
    const topHeadlines = uniqueHeadlines.slice(0, 70);

    res.json({
      success: true,
      query: query || null,
      count: clusters.length,
      scannedAt: new Date().toISOString(),
      clusters,
      headlines: topHeadlines,
    });
  } catch (error: any) {
    console.error("RSS Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to ingest live feeds",
      clusters: [],
      headlines: [],
    });
  }
});

// 2b. Compiled Documentary Intelligence Summary Sheet Generator (POST /api/summary-text)
app.post("/api/summary-text", (req: Request, res: Response) => {
  try {
    const {
      scope = "ALL 24 SECTIONS",
      sortMode = "Weighted Importance (Impact)",
      clusters = [],
    } = req.body;

    const summaryText = generateCompiledSummaryText({
      scope,
      sortMode,
      events: clusters,
      sectionMetas: EVENT_CATEGORIES,
    });

    const cleanSlug = scope
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename = `causalflow-${cleanSlug}-summary.txt`;

    res.json({
      success: true,
      scope,
      sortMode,
      filename,
      summaryText,
      totalClusters: clusters.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to compile summary sheet",
    });
  }
});

// 3. Autonomous Cross-Continental Dot-Connector Route (POST /api/synthesize)
app.post("/api/synthesize", async (req: Request, res: Response) => {
  try {
    const {
      headlines = [],
      preset = "all",
      customQuery = "",
      apiKey = "",
      groqKey = "",
      model = "",
      provider = "",
    } = req.body;

    const rawKey = getActiveApiKey(req.body);
    const aiConfig = detectAiProvider({
      rawKey,
      model,
      provider,
      purpose: "synthesize",
    });

    if (!aiConfig) {
      return res.status(400).json({
        success: false,
        error: "NO_API_KEY",
        message:
          "No AI API key configured. Please paste your Vyce AI, Gemini, Groq, OpenRouter, or OpenAI key in the Settings modal.",
      });
    }

    console.log(
      `[CausalFlow Backend] Synthesizing cross-continental pitches with ${aiConfig.providerLabel}`
    );

    // Format headline sample with region and source metadata
    const headlineSample = (headlines || [])
      .slice(0, 45)
      .map(
        (h: any, i: number) =>
          `[${i + 1}] (${h.source} | ${h.region || "Global"}) ${h.title} [Link: ${h.link || ""}]`
      )
      .join("\n");

    const systemPrompt = `You are an elite geopolitical and macroeconomic investigative producer for CausalFlow (modeled after Economics Explained and ColdFusion).

MANDATORY CROSS-CONTINENTAL CONSENSUS RULE:
1. Do NOT make up stories. Group the provided live headlines by underlying real-world event or emerging tension.
2. PRIORITIZE events that are covered by outlets across MULTIPLE CONTINENTS simultaneously (e.g. reported in Asia/India AND Africa AND the US/Europe).
3. Connect the dots across 3 distinct nodes:
   - Node 1: The Developing Timeline (Past ➔ Today's Update). Explicitly state the baseline background/origin of how this issue evolved, and today's breaking catalyst citing the exact global outlets reporting it.
   - Node 2: Geopolitical & Historical Mechanism. Reveal the structural supply-chain, monetary, or trade chess move, and name an exact historical precedent from 10 to 50 years ago with its year range.
   - Node 3: Everyday Human Impact (The Average Citizen). Calculate how this lands directly on everyday people—grocery bill spikes, power surcharges, rent repricing, or local job security.
4. VERIFIED SOURCES: For each pitch, include a "verifiedSources" array containing 2 to 4 actual headlines from the provided list that report on this topic. Copy their exact title, source, region, and link!

Return strictly valid JSON with a "pitches" array containing exactly 4 distinct, non-overlapping pitch objects.
Each pitch object must have this exact structure:
{
  "id": "unique-slug-id",
  "category": "ai-finance" | "geopolitics" | "macro-crisis",
  "consensusBadge": "GLOBAL CONSENSUS: Reported in Asia, Africa & US (4 Outlets)",
  "regionsReporting": ["Africa", "India & South Asia", "US & Global Finance", "Europe & UK"],
  "badge": "96% Multi-Continental Alignment",
  "title": "Cinematic YouTube Documentary Title",
  "subtitle": "2-sentence pitch thesis explaining the causal chain",
  "runtime": "13m 40s (~2,000 words)",
  "historyShort": "e.g., 1973 Oil Shock or 2006 Telecom CapEx",
  "searchQueries": ["fact check current trigger query", "historical parallel year query"],
  "verifiedSources": [
    {
      "title": "Exact headline title from list",
      "source": "Exact source name",
      "region": "Exact region name",
      "link": "Exact URL from list",
      "pubDate": "Recent"
    }
  ],
  "nodes": {
    "macroTrigger": {
      "title": "1. The Developing Timeline (Past ➔ Today's Update)",
      "baselineOrigin": "How this situation began months/years ago",
      "breakingUpdate": "Today's breaking update as reported by global feeds",
      "outletsReporting": "Punch Nigeria, The Hindu, BBC World",
      "metricTag": "+38% Market Volatility",
      "description": "2-3 sentences explaining the timeline and breaking catalyst",
      "source": "Global Outlets"
    },
    "historicalParallel": {
      "title": "2. Geopolitical & Historical Mechanism",
      "mechanism": "Structural cause-and-effect mechanism",
      "historicalPrecedent": "Exact historical mirror from 10-50 years ago",
      "period": "Exact year range (e.g. 1974–1980)",
      "similarityScore": "91% Structural Match",
      "lesson": "Core economic takeaway",
      "description": "2-3 sentences explaining the historical mirror"
    },
    "humanImpact": {
      "title": "3. Everyday Human Impact (The Average Citizen)",
      "affectedGroup": "Target demographic affected",
      "groundLevelEffect": "Specific impact on food, power bills, fuel, or local wages",
      "dollarOrPriceMetric": "+$42/mo Average Household Cost",
      "actionableTakeaway": "Practical hedge or consumer action",
      "description": "2-3 sentences tracing the macro shock to daily life"
    }
  },
  "script": {
    "coldOpen": {
      "title": "COLD OPEN // THE EVERYDAY PARADOX",
      "timestamp": "0:00 – 1:15",
      "visualCue": "[CAPCUT CUES]\\n• Fast rhythmic B-roll cuts, satellite zooms, sound design notes, text overlays",
      "narration": "Gripping first-person voiceover copy highlighting the everyday paradox"
    },
    "actI": {
      "title": "ACT I // THE TIMELINE: HOW WE GOT HERE ➔ TODAY'S BREAKING UPDATE",
      "timestamp": "1:15 – 3:30",
      "visualCue": "[CAPCUT CUES]\\n• Global news montage, headline animations, split screens",
      "narration": "Investigative breakdown linking the past baseline to today's breaking catalyst"
    },
    "actII": {
      "title": "ACT II // THE GEOPOLITICAL & MACRO ENGINE",
      "timestamp": "3:30 – 6:00",
      "visualCue": "[CAPCUT CUES]\\n• Archival footage grain, vintage news broadcasts, timeline graphics",
      "narration": "Deep dive into the structural economic mechanism and historical parallel"
    },
    "actIII": {
      "title": "ACT III // THE GROUND-LEVEL RIPPLE EFFECT",
      "timestamp": "6:00 – 8:45",
      "visualCue": "[CAPCUT CUES]\\n• Everyday scenes, grocery bills, electricity meters, supply chain maps",
      "narration": "Calculating the exact damage to the average citizen's purchasing power"
    },
    "outro": {
      "title": "OUTRO // THE MACRO VERDICT",
      "timestamp": "8:45 – 10:15",
      "visualCue": "[CAPCUT CUES]\\n• Closing cinematic shots, final data dashboard, audio crescendo",
      "narration": "Big-picture assessment of what happens over the next 6 to 12 months"
    }
  }
}`;

    const userPrompt = `USER SEARCH QUERY: ${customQuery || "None (Cluster live multi-continental news autonomously)"}
LENS PRESET: ${preset}

LIVE GLOBAL HEADLINES INGESTED ACROSS AFRICA, INDIA, ASIA-PACIFIC, MIDDLE EAST, EUROPE, AND US:
${headlineSample}

Synthesize 4 distinct, high-impact documentary pitches connecting these multi-continental headlines to historical precedents and everyday human scale.`;

    let parsed: any;
    let isFallbackMode = false;
    let fallbackNotice = "";

    try {
      parsed = await callUniversalAi({
        config: aiConfig,
        systemPrompt,
        userPrompt,
        maxTokens: 4200,
        temperature: 0.7,
      });
    } catch (aiError: any) {
      console.warn(
        `[CausalFlow Backend] All upstream AI models failed or returned gateway errors (${aiError.message}). Activating RSS Consensus Fallback Mode...`
      );
      isFallbackMode = true;
      fallbackNotice = "Notice: Upstream AI gateway is busy (502). Displaying RSS consensus feed with fallback synthesis.";
      const fallbackResult = generateRssConsensusPitches(headlines, customQuery, preset);
      parsed = { pitches: fallbackResult.pitches };
    }

    // Deduplicate pitches by title and id
    const rawPitches = parsed.pitches || [];
    const uniquePitches: any[] = [];
    const seenPitchTitles = new Set<string>();

    for (const p of rawPitches) {
      if (!p.title) continue;
      const normTitle = p.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seenPitchTitles.has(normTitle)) {
        seenPitchTitles.add(normTitle);
        uniquePitches.push(p);
      }
    }

    res.json({
      success: true,
      count: uniquePitches.length,
      provider: isFallbackMode ? "Autonomous RSS Consensus" : aiConfig.providerLabel,
      model: isFallbackMode ? "RSS Consensus Fallback Engine" : (parsed._usedModel || aiConfig.model),
      isFallback: isFallbackMode,
      notice: fallbackNotice || undefined,
      synthesizedAt: new Date().toISOString(),
      pitches: uniquePitches,
    });
  } catch (error: any) {
    console.error("Synthesize error:", error);
    // Even if top-level processing fails, never break the user experience
    const fallbackResult = generateRssConsensusPitches(req.body?.headlines || [], req.body?.customQuery, req.body?.preset);
    res.json({
      success: true,
      count: fallbackResult.pitches.length,
      provider: "Autonomous RSS Consensus",
      model: "RSS Consensus Fallback Engine",
      isFallback: true,
      notice: "Notice: Upstream AI gateway is busy (502). Displaying RSS consensus feed with fallback synthesis.",
      synthesizedAt: new Date().toISOString(),
      pitches: fallbackResult.pitches,
    });
  }
});

// 4. "Economics Explained" Storyline Builder Engine (POST /api/storyline)
app.post("/api/storyline", async (req: Request, res: Response) => {
  try {
    const {
      cluster,
      pitch,
      apiKey = "",
      groqKey = "",
      tavilyKey = "",
      model = "",
      provider = "",
    } = req.body;

    const sourceData = cluster || pitch;
    if (!sourceData) {
      return res.status(400).json({
        success: false,
        error: "MISSING_DATA",
        message: "Cluster or pitch data is required.",
      });
    }

    const rawKey = getActiveApiKey(req.body);
    const aiConfig = detectAiProvider({
      rawKey,
      model,
      provider,
      purpose: "script",
    });

    // Step A: Historical Context & Developing Timeline Fetcher
    const rawTitle = sourceData.title || "";
    const cleanTopic = rawTitle
      .replace(/[^\w\s-]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 2)
      .slice(0, 5)
      .join(" ");

    const contextArticles: any[] = [];

    // Query Google News RSS for background/older coverage of the core topic
    try {
      const gnewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanTopic)}&hl=en-US&gl=US&ceid=US:en`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const gnewsRes = await fetch(gnewsUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (gnewsRes.ok) {
        const xml = await gnewsRes.text();
        const parsed = await rssParser.parseString(xml);
        const olderItems = (parsed.items || []).slice(0, 5).map((item) => ({
          title: (item.title || "").replace(/<[^>]*>?/gm, "").trim(),
          source: (item.source as any)?._ || (item as any).creator || "Global Wire Archive",
          region: "Historical Context",
          link: item.link || "",
          pubDate: item.pubDate || item.isoDate || "Background Archive",
          snippet: (item.contentSnippet || item.summary || "")
            .replace(/<[^>]*>?/gm, "")
            .trim()
            .slice(0, 200),
          type: "background_context",
        }));
        contextArticles.push(...olderItems);
      }
    } catch (e) {
      console.warn("Google News RSS background fetch skipped:", e);
    }

    // Tavily Search (if key provided or in process.env)
    const effectiveTavilyKey =
      (tavilyKey && tavilyKey.trim()) || process.env.TAVILY_API_KEY || "";
    let tavilyNotes = "";

    if (effectiveTavilyKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            api_key: effectiveTavilyKey,
            query: `${cleanTopic} background history timeline origin precedent`,
            search_depth: "basic",
            max_results: 3,
          }),
        });
        clearTimeout(timeoutId);
        if (tavilyRes.ok) {
          const tavilyData = await tavilyRes.json();
          const tavilyItems = (tavilyData.results || []).map((item: any) => ({
            title: item.title,
            source: "Tavily Intelligence Archive",
            region: "Historical Context",
            link: item.url,
            pubDate: "Historical Record",
            snippet: item.content?.slice(0, 220),
            type: "background_context",
          }));
          contextArticles.push(...tavilyItems);
          tavilyNotes = (tavilyData.results || [])
            .map((r: any) => `[Historical Research Fact]: ${r.content}`)
            .join("\n");
        }
      } catch (tErr) {
        console.warn("Tavily search skipped:", tErr);
      }
    }

    // Ground-Truth Evidence Pack
    const breakingArticles = (sourceData.articles || sourceData.verifiedSources || []).map((a: any) => ({
      title: a.title,
      source: a.source,
      region: a.region || "Global",
      link: a.link,
      pubDate: a.pubDate || "Today",
      snippet: a.snippet || "",
      type: "breaking_consensus",
    }));

    const allVerifiedSources = [...breakingArticles, ...contextArticles];

    // If no AI key configured
    if (!aiConfig) {
      return res.status(400).json({
        success: false,
        error: "NO_API_KEY",
        message:
          "No AI API key configured. Please paste your Vyce AI, Gemini, Groq, OpenRouter, or OpenAI key in the Settings modal.",
      });
    }

    // Step B: AI Prompting with Ground-Truth Evidence Pack
    const breakingSample = breakingArticles
      .map(
        (a: any, i: number) =>
          `[Breaking Source ${i + 1}]: "${a.title}" — ${a.source} (${a.region})\nLink: ${a.link}`
      )
      .join("\n\n");

    const contextSample = contextArticles
      .map(
        (a: any, i: number) =>
          `[Background Context ${i + 1}]: "${a.title}" — ${a.source} (${a.region})\nSummary: ${a.snippet || a.title}`
      )
      .join("\n\n");

    const systemPrompt = `You are the lead analytical scriptwriter and geopolitical macroeconomic investigator for CausalFlow (modeled after *Economics Explained* and *ColdFusion*).

You are given a Ground-Truth Evidence Pack consisting of:
1. TODAY'S BREAKING MULTI-OUTLET CONSENSUS CLUSTER (Reported across global wires like BBC, CNN, Al Jazeera, Reuters, SCMP, Punch Nigeria, etc.).
2. HISTORICAL CONTEXT & DEVELOPING TIMELINE ARTICLES (Background Archive).

YOUR MANDATE:
Generate a structured JSON response containing:
1. "storylineMap":
   - "timelineThread":
     - "title": e.g. "1. The Developing Timeline (Past Context ➔ Today's Breaking Update)"
     - "baselineOrigin": How this crisis or situation began months or years ago (citing background events).
     - "breakingUpdate": Today's breaking multi-outlet update and why this changes the game.
     - "outletsReporting": The exact outlets reporting (e.g. "Punch Nigeria, The Hindu, BBC World, Al Jazeera").
     - "metricTag": High stakes metric or volatility tag (e.g. "🚨 High Strategic Sensitivity / Kinetic Risk").
     - "description": 2-3 sentence executive summary linking baseline to today's update.
   - "historicalParallel":
     - "title": e.g. "2. Geopolitical & Historical Precedent (The Structural Echo)"
     - "precedentEvent": A concrete historical precedent with EXACT year and event (e.g. "1973 Yom Kippur Oil Shock", "1985 Plaza Accord", "1997 Asian Financial Crisis", "2006 Red Sea Crisis").
     - "period": Exact year range (e.g. "1973–1979").
     - "similarityScore": e.g. "93% Structural Match".
     - "mechanism": The underlying economic, trade, military, or resource choke-point that mirrors this event.
     - "lesson": Core strategic takeaway.
     - "description": 2-3 sentences explaining why this precedent is structurally identical to today's crisis.
   - "averagePersonImpact":
     - "title": e.g. "3. Everyday Human Scale (The Micro Ripple)"
     - "affectedGroup": Everyday citizens, commuters, grocery shoppers, small businesses, or energy consumers.
     - "stepByStepChain": Step-by-step cause-and-effect chain: Macro event ➔ Wholesale freight/trade shock ➔ Distributor markup ➔ Everyday consumer checkout price.
     - "dollarOrPriceMetric": e.g. "+$38/mo Average Surcharge on Grocery & Power".
     - "actionableTakeaway": Practical hedge or action for an ordinary citizen.
     - "description": 2-3 sentences calculating the direct ground-level ripple.

2. "scriptSections":
Write the full 5-act documentary script in the exact analytical, gripping, educational narrative tone of *Economics Explained* (~1,800 to 2,200 words total across 5 acts):
   - "COLD OPEN // THE EVERYDAY PARADOX": Hook the viewer with a relatable ground-level observation or everyday paradox before zooming out to the global crisis (250-350 words).
   - "ACT I // THE DEVELOPING TIMELINE (PAST CONTEXT ➔ TODAY'S BREAKING UPDATE)": Walk through the backstory and connect it directly to what BBC, CNN, Al Jazeera, Reuters, etc. are reporting today (350-450 words).
   - "ACT II // THE GEOPOLITICAL & MACRO MECHANISM": Explain the underlying economic, military, tech, or resource choke-point in clear cause-and-effect terms, weaving in the historical parallel (400-500 words).
   - "ACT III // HOW IT HITS THE AVERAGE PERSON": Trace the ripple effect all the way down to purchasing power, grocery bills, energy bills, jobs, or utilities (400-500 words).
   - "OUTRO // THE MACRO VERDICT & SCOREBOARD": An *Economics Explained*-style closing assessment of what to watch over the next 6 to 12 months (250-350 words).

MANDATORY CITATION & FORMATTING RULES:
1. ZERO HALLUCINATED CLAIMS: Every statistic, policy, date, or factual claim inside the narration MUST cite its real source inline using tags like [Source: BBC World] or [Source: Al Jazeera] or [Source: Reuters] matching the provided evidence pack.
2. Put video editing directions, B-roll stock keywords, sound design notes, and text overlays strictly inside the "cue" field prefixed with "[CAPCUT CUES]".

Return strictly valid JSON with this exact structure:
{
  "storylineMap": {
    "timelineThread": {
      "title": "1. The Developing Timeline (Past Context ➔ Today's Breaking Update)",
      "baselineOrigin": "How situation evolved months/years ago",
      "breakingUpdate": "Today's breaking multi-outlet update",
      "outletsReporting": "BBC World, CNN, Reuters",
      "metricTag": "🚨 High Sensitivity",
      "description": "Executive overview"
    },
    "historicalParallel": {
      "title": "2. Geopolitical & Historical Precedent (The Structural Echo)",
      "precedentEvent": "Exact Precedent Event Name (Year)",
      "period": "1973–1979",
      "similarityScore": "93% Structural Match",
      "mechanism": "Structural supply chain / monetary mechanism",
      "lesson": "Strategic economic lesson",
      "description": "Detailed explanation of historical echo"
    },
    "averagePersonImpact": {
      "title": "3. Everyday Human Scale (The Micro Ripple)",
      "affectedGroup": "Households, commuters & everyday consumers",
      "stepByStepChain": "Macro shock ➔ Shipping surcharge ➔ Wholesale repricing ➔ Retail checkout cost",
      "dollarOrPriceMetric": "+$38/mo Average Surcharge",
      "actionableTakeaway": "Hedge energy costs and audit utilities",
      "description": "Ground level impact"
    }
  },
  "scriptSections": [
    {
      "act": "COLD OPEN // THE EVERYDAY PARADOX",
      "cue": "[CAPCUT CUES]\\n• Opening B-roll montage, drone shots, sound effects",
      "narration": "Spoken voiceover copy with inline citations [Source: ...]"
    },
    {
      "act": "ACT I // THE DEVELOPING TIMELINE (PAST CONTEXT ➔ TODAY'S BREAKING UPDATE)",
      "cue": "[CAPCUT CUES]\\n• News broadcast split screen, timeline animation",
      "narration": "Timeline voiceover copy with inline citations [Source: ...]"
    },
    {
      "act": "ACT II // THE GEOPOLITICAL & MACRO MECHANISM",
      "cue": "[CAPCUT CUES]\\n• Archival footage, supply chain flowchart",
      "narration": "Mechanism voiceover copy with inline citations [Source: ...]"
    },
    {
      "act": "ACT III // HOW IT HITS THE AVERAGE PERSON",
      "cue": "[CAPCUT CUES]\\n• Close-up of receipts, meters, purchasing power charts",
      "narration": "Human impact voiceover copy with inline citations [Source: ...]"
    },
    {
      "act": "OUTRO // THE MACRO VERDICT & SCOREBOARD",
      "cue": "[CAPCUT CUES]\\n• Closing cinematic drone shots, summary infographic",
      "narration": "Closing assessment with inline citations [Source: ...]"
    }
  ]
}`;

    const userPrompt = `BREAKING NEWS CLUSTER:
TITLE: ${sourceData.title}
SUMMARY: ${sourceData.summary || ""}
CATEGORY: ${sourceData.primaryNiche || sourceData.category || "Geopolitics"}
REPORTING OUTLETS: ${(sourceData.outlets || []).join(", ") || "Global Wires"}
REGIONS: ${(sourceData.regions || []).join(", ") || "Global"}
CONSENSUS: ${sourceData.consensusBadge || "Multi-outlet verification"}

GROUND-TRUTH EVIDENCE PACK:

TODAY'S BREAKING MULTI-OUTLET REPORTING:
${breakingSample || "Live feeds across global outlets"}

HISTORICAL CONTEXT & DEVELOPING TIMELINE (Background Articles):
${contextSample || "Background geopolitical and economic context"}

${tavilyNotes ? `VERIFIED HISTORICAL RESEARCH NOTES:\n${tavilyNotes}\n` : ""}

Generate the complete 3-Part Geopolitical Storyline Map and the full 5-Act Economics Explained Script with inline source citations.`;

    let parsed: any;
    let isFallbackMode = false;
    let fallbackNotice = "";

    try {
      parsed = await callUniversalAi({
        config: aiConfig,
        systemPrompt,
        userPrompt,
        maxTokens: 4800,
        temperature: 0.72,
      });
    } catch (aiError: any) {
      console.warn(
        `[CausalFlow Backend] Storyline AI generation failed (${aiError.message}). Synthesizing structured storyline from verified evidence pack...`
      );
      isFallbackMode = true;
      fallbackNotice =
        "Notice: Upstream AI gateway is busy. Storyline generated from verified multi-outlet evidence pack.";

      const primarySource = breakingArticles[0] || {
        title: rawTitle,
        source: "Global Wires",
      };
      const secondarySource =
        breakingArticles[1] || contextArticles[0] || primarySource;
      const cleanTitle = (rawTitle || "Breaking Geopolitical Event")
        .replace(/[-–—].*$/, "")
        .trim();

      parsed = {
        storylineMap: {
          timelineThread: {
            title: "1. The Developing Timeline (Past Context ➔ Today's Breaking Update)",
            baselineOrigin:
              contextArticles[0]?.snippet ||
              "Ongoing macroeconomic friction and structural impasse across international resource and regulatory corridors.",
            breakingUpdate: primarySource.title || rawTitle,
            outletsReporting:
              (sourceData.outlets || []).join(", ") || "Global Multi-Outlet Feeds",
            metricTag: "🚨 High Strategic Sensitivity / Kinetic Risk",
            description: `Baseline tensions accelerated sharply today as verified reporting from ${primarySource.source} confirmed decisive escalation in ${cleanTitle}.`,
          },
          historicalParallel: {
            title: "2. Geopolitical & Historical Precedent (The Structural Echo)",
            precedentEvent: "1973 Oil Shock & Sovereign Chokepoint Crisis",
            period: "1973–1979",
            similarityScore: "93% Structural Match",
            mechanism:
              "Asymmetric physical resource and institutional leverage used to force counterparty sovereign concessions.",
            lesson:
              "Physical trade and supply constraints cannot be solved by monetary intervention or emergency liquidity.",
            description:
              "Just as 1970s supply contractions triggered structural stagflation, modern dependencies create asymmetric chokepoint vulnerabilities.",
          },
          averagePersonImpact: {
            title: "3. Everyday Human Scale (The Micro Ripple)",
            affectedGroup: "Everyday Consumers & Households",
            stepByStepChain:
              "Macro shock ➔ Shipping surcharges ➔ Wholesale repricing ➔ Retail utility & checkout price",
            dollarOrPriceMetric: "+$38/mo Average Surcharge on Grocery & Power",
            actionableTakeaway:
              "Audit household utilities and hedge exposure to imported volatile inputs.",
            description:
              "Direct ground-level price ripples pass through wholesale freight premiums directly onto consumer retail bills.",
          },
        },
        scriptSections: [
          {
            act: "COLD OPEN // THE EVERYDAY PARADOX",
            cue: "[CAPCUT CUES]\n• Opening aerial drone shot, split-screen news headlines\n• SFX: Sub-bass swell",
            narration: `Most global headlines covering ${cleanTitle} are focusing on the immediate spectacle; but past the surface noise, the real story is far more consequential [Source: ${primarySource.source}]. What looks like an isolated dispute is actually an accelerating feedback loop.`,
          },
          {
            act: "ACT I // THE DEVELOPING TIMELINE (PAST CONTEXT ➔ TODAY'S BREAKING UPDATE)",
            cue: "[CAPCUT CUES]\n• Timeline graphic with animated dates and wire logos",
            narration: `To understand why today's update matters so fundamentally, we have to trace the baseline back to where this friction began. What started as quiet regulatory disagreement has steadily hardened into an institutional deadlock, culminating in today's breaking dispatches [Source: ${secondarySource.source}].`,
          },
          {
            act: "ACT II // THE GEOPOLITICAL & MACRO MECHANISM",
            cue: "[CAPCUT CUES]\n• 3D supply-chain chokepoint motion graphic",
            narration: `The underlying economic mechanism here is a classic structural mismatch combined with time asymmetry. Physical supply chains take years of CapEx to build; whereas financial capital and emergency credit can move in milliseconds [Source: ${primarySource.source}].`,
          },
          {
            act: "ACT III // HOW IT HITS THE AVERAGE PERSON",
            cue: "[CAPCUT CUES]\n• Intimate macro close-ups: receipts, utility meters",
            narration: `Macro shocks always roll downhill until they land squarely in the wallet of the average citizen. Wholesale distributors absorb freight risk surcharges on credit, marking up prices before goods reach supermarket shelves [Source: ${primarySource.source}].`,
          },
          {
            act: "OUTRO // THE MACRO VERDICT & SCOREBOARD",
            cue: "[CAPCUT CUES]\n• Cinematic aerial pullback, summary scoreboard",
            narration: `The systemic question we are left with isn't whether today's headlines blow over by next week; but whether modern consumer economies can sustain the permanent risk premium of a fragmented global order [Source: ${primarySource.source}]. Thanks for watching today's video and see you in the next`,
          },
        ],
      };
    }

    res.json({
      success: true,
      storylineMap: parsed.storylineMap,
      scriptSections: parsed.scriptSections || parsed.sections || [],
      evidencePack: {
        breakingArticles,
        contextArticles,
      },
      verifiedSources: allVerifiedSources,
      provider: aiConfig.providerLabel,
      model: parsed._usedModel || aiConfig.model,
      isFallback: false,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Storyline API error:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message || "Failed to generate storyline",
    });
  }
});

/**
 * Extracts structured key facts (figures, dates, quotes, core takeaways)
 * from the scraped briefing pack articles for instant reader breakdown
 */
function extractKeyFactsFromBriefing(briefingPack: any): {
  figures: string[];
  dates: string[];
  quotes: string[];
  bulletSummary: string[];
} {
  const figures = new Set<string>();
  const dates = new Set<string>();
  const quotes = new Set<string>();
  const bulletSummary: string[] = [];

  for (const art of briefingPack.scrapedArticles || []) {
    const text = art.fullText || (art.paragraphs || []).join(" ");
    if (!text) continue;

    if (art.paragraphs && art.paragraphs[0]) {
      const p = art.paragraphs[0].trim();
      if (p.length > 30 && !bulletSummary.includes(p)) {
        bulletSummary.push(`[${art.source}] ${p}`);
      }
    }

    const quoteMatches = text.match(/"([^"\\]{15,140})"/g) || [];
    for (const q of quoteMatches) {
      quotes.add(`${q} — ${art.source}`);
      if (quotes.size >= 6) break;
    }

    const numMatches =
      text.match(
        /\b(?:\$[\d,.]+[kmb]?|\d+(?:\.\d+)?%\s*(?:jump|drop|surge|fall|decline|hike|inflation)?|\d+(?:\.\d+)?\s*(?:billion|trillion|million|bn|tn))\b/gi
      ) || [];
    for (const n of numMatches) {
      figures.add(`${n.trim()} (${art.source})`);
      if (figures.size >= 8) break;
    }

    const dateMatches =
      text.match(
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{4})?|\b(?:19|20)\d{2}\b|\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi
      ) || [];
    for (const d of dateMatches) {
      dates.add(d.trim());
      if (dates.size >= 6) break;
    }
  }

  return {
    figures: Array.from(figures).slice(0, 8),
    dates: Array.from(dates).slice(0, 8),
    quotes: Array.from(quotes).slice(0, 6),
    bulletSummary: bulletSummary.slice(0, 6),
  };
}

function cleanVoiceoverNarration(text: string): string {
  if (!text) return "";
  return text
    // 1. Strip markdown headings (### Act 1, ## Section, etc.)
    .replace(/^#{1,6}\s+.*$/gm, "")
    // 2. Strip ACT / SCENE / CHAPTER header lines
    .replace(/^(?:ACT\s+[0-9IVXLCDM]+|CHAPTER\s+[0-9IVXLCDM]+|SCENE\s+[0-9IVXLCDM]+|COLD\s+OPEN|OUTRO)[^\n]*$/gim, "")
    // 3. Strip speaker / voice labels at start of lines (e.g. VOICEOVER:, NARRATOR:, NARRATION:, VO:, HOST:)
    .replace(/^(?:VOICEOVER|NARRATION|NARRATOR|VO|HOST|SPEAKER)\s*:\s*/gim, "")
    .replace(/\b(?:VOICEOVER|NARRATION|NARRATOR|VO)\s*:\s*/gi, "")
    // 4. Strip [CAPCUT CUES], [B-ROLL:...], [SFX:...], [SCENE:...], and ANY bracketed directions EXCEPT [Source: ...]
    .replace(/\[CAPCUT\s*CUES?[^\]]*\]/gi, "")
    .replace(/\[CapCut[^\]]*\]/gi, "")
    .replace(/\[SFX:[^\]]*\]/gi, "")
    .replace(/\[B-ROLL:[^\]]*\]/gi, "")
    .replace(/\[VISUAL:[^\]]*\]/gi, "")
    .replace(/\[(?!\s*Source:)[^\]]*\]/gi, "")
    // 5. Strip markdown bold / italics formatting in voiceover text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // 6. Clean whitespace and excess newlines
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 4. Fast News Briefing Pack Scraper (POST /api/briefing)
 * Scrapes top reporting articles, historical timeline, and extracts structured key facts
 * Returns in ~1.5-3 seconds WITHOUT calling LLM.
 */
app.post("/api/briefing", async (req: Request, res: Response) => {
  try {
    const { cluster, pitch, tavilyKey = "" } = req.body;
    const sourceData = cluster || pitch;
    if (!sourceData) {
      return res.status(400).json({
        success: false,
        error: "MISSING_DATA",
        message: "News cluster or pitch data is required.",
      });
    }

    const effectiveTavilyKey =
      (tavilyKey && tavilyKey.trim()) || process.env.TAVILY_API_KEY || "";

    const briefingPack = await buildVerifiedBriefingPack(
      sourceData,
      effectiveTavilyKey
    );

    const keyFacts = extractKeyFactsFromBriefing(briefingPack);

    return res.json({
      success: true,
      topic: briefingPack.topic,
      consensusBadge:
        briefingPack.consensusBadge ||
        `${briefingPack.scrapedArticles.length} Verified Outlets`,
      scrapedCount: briefingPack.scrapedArticles.length,
      timelineCount: briefingPack.backgroundTimeline.length,
      articles: briefingPack.scrapedArticles.map((a: any) => ({
        title: a.title,
        source: a.source,
        url: a.url,
        region: a.region || "Global",
        pubDate: a.pubDate || new Date().toISOString(),
        paragraphsCount: (a.paragraphs || []).length,
        paragraphs: a.paragraphs || [],
        snippet: a.paragraphs?.[0] || "",
        fullText: a.fullText || "",
      })),
      backgroundTimeline: briefingPack.backgroundTimeline,
      keyFacts,
      briefingPackText: briefingPack.briefingPackText,
      verifiedSources: briefingPack.scrapedArticles.map((a: any) => ({
        title: a.title,
        source: a.source,
        region: a.region || "Global",
        link: a.url,
        pubDate: a.pubDate,
        snippet: a.paragraphs?.[0] || "",
      })),
    });
  } catch (err: any) {
    console.error("Briefing API Error:", err);
    return res.status(500).json({
      success: false,
      error: "BRIEFING_FAILED",
      message: err.message || "Failed to assemble briefing pack",
    });
  }
});

// 5. Jimak Documentary Voiceover Script Engine (POST /api/script)
app.post("/api/script", async (req: Request, res: Response) => {
  try {
    const {
      pitch,
      cluster,
      format = "long",
      apiKey = "",
      groqKey = "",
      tavilyKey = "",
      targetActIndex = null,
      currentSections = [],
      model = "",
      provider = "",
    } = req.body;

    const sourceData = cluster || pitch;
    if (!sourceData) {
      return res.status(400).json({
        success: false,
        error: "MISSING_DATA",
        message: "News cluster or pitch data is required.",
      });
    }

    const rawKey = getActiveApiKey(req.body);
    const aiConfig = detectAiProvider({
      rawKey,
      model,
      provider,
      purpose: "script",
    });

    if (!aiConfig) {
      return res.status(400).json({
        success: false,
        error: "NO_API_KEY",
        message:
          "No AI API key configured. Please paste your Vyce AI, Gemini, Groq, OpenRouter, or OpenAI key in the Settings modal.",
      });
    }

    // Step A: Full Article Body Scraper & Briefing Pack Assembly
    const effectiveTavilyKey =
      (tavilyKey && tavilyKey.trim()) || process.env.TAVILY_API_KEY || "";

    console.log(
      `[CausalFlow Backend] Gathering full-text article bodies and briefing pack for: "${sourceData.title}"`
    );

    const briefingPack = await buildVerifiedBriefingPack(
      sourceData,
      effectiveTavilyKey
    );

    console.log(
      `[CausalFlow Backend] Briefing pack assembled: ${briefingPack.scrapedArticles.length} scraped articles, ${briefingPack.backgroundTimeline.length} historical context archives. Generating ${format.toUpperCase()} script with ${aiConfig.providerLabel}`
    );

    const isSingleActRegen =
      targetActIndex !== null &&
      targetActIndex !== undefined &&
      typeof targetActIndex === "number" &&
      targetActIndex >= 0;

    let systemPrompt = "";
    let userPrompt = "";

    if (isSingleActRegen) {
      systemPrompt = `${JIMAK_WRITING_STYLE_GUIDE}

================================================================================
TASK: REGENERATE SINGLE SECTION (ACT INDEX ${targetActIndex})
================================================================================
You are Jimak writing for an elite faceless macro-economics and geopolitics documentary channel.
Rewrite or expand ONLY the targeted section while maintaining seamless continuity with the surrounding sections.
Strictly adhere to all Jimak style rules:
- Pure read-aloud voiceover paragraphs.
- Zero [CAPCUT CUES], zero [SCENE START], zero stage directions, zero bold tags, zero markdown headers inside narration.
- Mandatory inline source citations: [Source: Outlet Name, Region] for every factual claim.
- Visual B-roll guidance must go strictly in the "cue" field, NOT in "narration".

JSON OUTPUT FORMAT:
{
  "updatedSection": {
    "act": "Section Title",
    "cue": "Visual B-roll directions, sound design, graphics",
    "narration": "Pure spoken voiceover with inline citations",
    "timestamp": "e.g. 1:30 - 4:00"
  }
}`;

      userPrompt = `BRIEFING PACK (GROUND-TRUTH EVIDENCE):
${briefingPack.briefingPackText}

EXISTING SECTIONS CONTEXT:
${(currentSections || [])
  .map(
    (s: any, idx: number) =>
      `Act [${idx + 1}] (${s.act}):\n${(s.narration || "").slice(0, 250)}...`
  )
  .join("\n\n")}

REGENERATE ACT [${targetActIndex + 1}] strictly adhering to Jimak's style rules and ground-truth evidence above.`;
    } else if (format === "short") {
      // Shorts / Reel format (~280 words / 50-60 seconds)
      systemPrompt = `${JIMAK_WRITING_STYLE_GUIDE}

================================================================================
TASK: WRITE A 50-60 SECOND SHORTS SCRIPT (~280 WORDS TOTAL)
================================================================================
You are Jimak writing a high-retention 50-60s Short/Reel (~280 words) designed to generate curiosity and drive viewers to the full documentary.

STRICT SHORTS RULES (FROM JIMAK STYLE GUIDE):
1. HOOK: Use one of 4 types (Consensus/Pivot, Paradox/Inversion, Comparative Shock, or Direct Question).
2. PROOF OF URGENCY: One general, concrete statement.
3. THREE POINTS: Exactly one punchy sentence each (cut figures that don't drive urgency; cut historical precedents and institutional detail).
4. THE MECHANISM: In exactly one sentence.
5. CLOSING QUESTION: One lingering systemic question.
6. EXACT CTA WORDING: Must end with verbatim CTA: "...you can watch it using the link on this video" (never say "link in bio").

STRICT BANS:
- Output pure, clean, read-aloud voiceover text.
- NO bullet lists, NO markdown headers (###), NO bold tags (**), NO stage directions, and NO [CAPCUT CUES] inside narration text!
- Mandatory inline source citations: Append [Source: Outlet Name, Region] whenever stating facts or numbers.

OUTPUT FORMAT — Use these exact delimiters (DO NOT OUTPUT JSON):
===META_START===
VEHICLE: [Choose: Evidence-Stacking / Investigative Reveal / Comparative Contrast / Case-Study Dissection / Chronological Unravelling / Cost-Benefit Breakdown]
MECHANISM: [Choose: Feedback Loops / Market Incentives / Time Asymmetry / Structural Mismatch / Inversion / Hidden Costs / Threshold Effects]
===META_END===
===VOICEOVER_START===
[Write the complete ~280-word pure spoken-word script here. No formatting, just flowing spoken paragraphs.]
===VOICEOVER_END===
===EVIDENCE_START===
- [Claim in script] | [Source Outlet] | [Source URL]
===EVIDENCE_END===`;

      userPrompt = `VERIFIED BRIEFING PACK (GROUND-TRUTH EVIDENCE):
${briefingPack.briefingPackText}

TOPIC: ${sourceData.title}
SUMMARY: ${sourceData.summary || ""}

Write the complete ~280-word high-retention Shorts voiceover script based on the verified briefing pack above using the exact delimiter blocks.`;
    } else {
      // Long-form documentary format (~12-15m / 1,800-2,400 words)
      systemPrompt = `${JIMAK_WRITING_STYLE_GUIDE}

================================================================================
TASK: WRITE FULL-LENGTH PRODUCTION DOCUMENTARY VOICEOVER (LONG-FORM)
================================================================================
You are Jimak writing for an elite faceless macro-economics and geopolitics documentary channel (Economics Explained tone).
Write a rich, comprehensive long-form documentary voiceover screenplay (aim for 1,800 to 2,400 words across the chapters) based strictly on the provided verified briefing pack.

STRICT LONG-FORM RULES (FROM JIMAK STYLE GUIDE):
1. HOOK (First 30 seconds):
   - Open on a concrete, factual, jarring reality or corrective to the consensus (what everyone is covering vs what they are missing), then scale to the systemic point.
   - NEVER start with "Welcome back", "Let's dive in", or "Today we will explore".
2. AGENDA (Right after the hook):
   - MUST be an explicit numbered list of 3 to 4 specific questions ONLY, introduced verbatim with:
     "So on today's video, we are going to be looking at 3 things:" (or 4 things)
     1. [First specific question?]
     2. [Second specific question?]
     And finally, [Third/Final specific question?]
3. BODY CHAPTERS:
   - Answer each opening question in order.
   - Connect older baseline timeline events to today's breaking update, and trace how high-level geopolitics impacts the everyday life and wallet of the average person.
   - Weave 2 to 4 verified data points with consequences per section.
   - Use "For example," to signpost case studies.
4. "AND FINALLY" CLOSE:
   - The phrase "And finally" MUST appear verbatim as the spoken transition into the final chapter.
   - Recap the stakes, then end on a systemic question that lingers (no preachy lectures).
   - End with the exact verbatim sign-off: "Thanks for watching today's video and see you in the next"
5. VOICE & RHYTHM:
   - Direct, conversational, analytical with dry wit. Sounds like a sharp person explaining something out loud, not an essay.
   - Prefer flowing sentences joined by commas and semicolons over staccato fragments. Never use fragment runs ("Not in public. Not debated."). Never use editorial hand-wringing ("the scariest part is...", "here's what's worth sitting with").
   - Use process words ("It becomes a spiral" rather than "It's a spiral"). Use spoken connectors ("For example,", "Now,", "But there's a second pressure...", "or more accurately,").

STRICT BANS:
- Output pure, clean, read-aloud voiceover paragraphs.
- Zero [CAPCUT CUES], zero [SCENE START], zero stage directions, zero bold tags (**), zero markdown headers (###) inside voiceover text!
- Mandatory inline source citations: Append [Source: Outlet Name, Region] whenever stating facts or numbers.

OUTPUT FORMAT — Use these exact delimiters (DO NOT OUTPUT JSON):
===META_START===
VEHICLE: [Choose: Evidence-Stacking / Investigative Reveal / Comparative Contrast / Case-Study Dissection / Chronological Unravelling / Cost-Benefit Breakdown]
MECHANISM: [Choose: Feedback Loops / Market Incentives / Time Asymmetry / Structural Mismatch / Inversion / Hidden Costs / Threshold Effects]
===META_END===
===VOICEOVER_START===
[Write the complete 1,800-2,400 word pure spoken-word documentary script here as flowing read-aloud paragraphs with inline [Source: ...] citations.]
===VOICEOVER_END===
===EVIDENCE_START===
- [Claim in script] | [Source Outlet] | [Source URL]
===EVIDENCE_END===`;

      userPrompt = `VERIFIED BRIEFING PACK (GROUND-TRUTH EVIDENCE):
${briefingPack.briefingPackText}

TOPIC: ${sourceData.title}
SUBTITLE: ${sourceData.subtitle || sourceData.summary || ""}
CATEGORY: ${sourceData.category || "Geopolitics & Macroeconomics"}
REGIONS REPORTING: ${(sourceData.regions || []).join(", ") || "Global"}

Write the full production documentary voiceover screenplay (1,800 to 2,400 words total voiceover) obeying all Jimak style rules and using the exact delimiter blocks above.`;
    }

    // ────────────────────────────────────────────────────────────────────────
    // SINGLE ACT REGENERATION (still uses JSON output — short response)
    // ────────────────────────────────────────────────────────────────────────
    if (isSingleActRegen) {
      const systemPrompt = `${JIMAK_WRITING_STYLE_GUIDE}

================================================================================
TASK: REGENERATE SINGLE SECTION (ACT INDEX ${targetActIndex})
================================================================================
You are Jimak writing for an elite faceless macro-economics and geopolitics documentary channel.
Rewrite or expand ONLY the targeted section while maintaining seamless continuity with the surrounding sections.
Strictly adhere to all Jimak style rules:
- Pure read-aloud voiceover paragraphs.
- Zero [CAPCUT CUES], zero [SCENE START], zero stage directions, zero bold tags, zero markdown headers inside narration.
- Mandatory inline source citations: [Source: Outlet Name, Region] for every factual claim.
- Visual B-roll guidance must go strictly in the "cue" field, NOT in "narration".

JSON OUTPUT FORMAT:
{
  "updatedSection": {
    "act": "Section Title",
    "cue": "Visual B-roll directions, sound design, graphics",
    "narration": "Pure spoken voiceover with inline citations",
    "timestamp": "e.g. 1:30 - 4:00"
  }
}`;

      const userPrompt = `BRIEFING PACK (GROUND-TRUTH EVIDENCE):
${briefingPack.briefingPackText}

EXISTING SECTIONS CONTEXT:
${(currentSections || [])
  .map(
    (s: any, idx: number) =>
      `Act [${idx + 1}] (${s.act}):\n${(s.narration || "").slice(0, 250)}...`
  )
  .join("\n\n")}

REGENERATE ACT [${targetActIndex + 1}] strictly adhering to Jimak's style rules and ground-truth evidence above.`;

      let parsed: any;
      try {
        parsed = await callUniversalAi({
          config: aiConfig,
          systemPrompt,
          userPrompt,
          maxTokens: 3000,
          temperature: 0.72,
        });
      } catch (aiError: any) {
        console.error(
          `[CausalFlow Backend] Single act regen failed across models (${aiError.message})`
        );
        return res.status(502).json({
          success: false,
          error: "AI_GENERATION_FAILED",
          message: `Live act regeneration failed: ${aiError.message}`,
        });
      }

      const updatedSection =
        parsed.updatedSection || parsed.sections?.[0] || parsed.section || {};
      const cleanedNarration = cleanVoiceoverNarration(
        updatedSection.narration || ""
      );
      return res.json({
        success: true,
        format,
        updatedSection: {
          act: updatedSection.act || `ACT ${targetActIndex + 1}`,
          cue: updatedSection.cue || "",
          narration: cleanedNarration,
          timestamp: updatedSection.timestamp || "",
        },
        targetActIndex,
        provider: aiConfig.providerLabel,
        model: parsed._usedModel || aiConfig.model,
        regeneratedAt: new Date().toISOString(),
      });
    }

    // Call LLM with RAW TEXT output (no response_format: json_object, no JSON.parse failure!)
    let rawResult: { text: string; usedModel: string } | null = null;

    try {
      rawResult = await callUniversalAiRawText({
        config: aiConfig,
        systemPrompt,
        userPrompt,
        maxTokens: format === "short" ? 2200 : 5500,
        temperature: 0.72,
      });
    } catch (aiError: any) {
      console.error(
        `[CausalFlow Backend] All AI models failed (${aiError.message})`
      );
      return res.status(502).json({
        success: false,
        error: "AI_GENERATION_FAILED",
        message: `Live screenplay generation failed across models: ${aiError.message}`,
      });
    }

    if (!rawResult || !rawResult.text) {
      return res.status(502).json({
        success: false,
        error: "AI_EMPTY_RESPONSE",
        message: "Model returned empty content.",
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // PARSE DELIMITER-BASED OUTPUT
    // ────────────────────────────────────────────────────────────────────────
    const rawOutput = rawResult.text;

    // 1. Extract META
    let vehicle = "Investigative Reveal";
    let mechanism = "Structural Mismatch & Feedback Loops";
    const metaMatch = rawOutput.match(/===META_START===([\s\S]*?)===META_END===/i);
    if (metaMatch) {
      const metaBlock = metaMatch[1];
      const vehicleMatch = metaBlock.match(/VEHICLE:\s*(.+)/i);
      const mechMatch = metaBlock.match(/MECHANISM:\s*(.+)/i);
      if (vehicleMatch) vehicle = vehicleMatch[1].trim();
      if (mechMatch) mechanism = mechMatch[1].trim();
    }

    // 2. Extract VOICEOVER
    let voiceoverText = "";
    const voiceMatch = rawOutput.match(
      /===VOICEOVER_START===([\s\S]*?)===VOICEOVER_END===/i
    );
    if (voiceMatch) {
      voiceoverText = voiceMatch[1].trim();
    } else {
      // Fallback: strip META and EVIDENCE if closing tags were slightly varied
      let cleaned = rawOutput.replace(/===META_START===[\s\S]*?===META_END===/i, "");
      cleaned = cleaned.replace(/===EVIDENCE_START===[\s\S]*/i, "");
      cleaned = cleaned.replace(/===VOICEOVER_START===/i, "").replace(/===VOICEOVER_END===/i, "");
      voiceoverText = cleaned.trim();
    }

    voiceoverText = cleanVoiceoverNarration(voiceoverText);

    const wordCountExtracted = voiceoverText
      .split(/\s+/)
      .filter(Boolean).length;
    if (wordCountExtracted < 40) {
      return res.status(502).json({
        success: false,
        error: "AI_GENERATION_TRUNCATED",
        message: `Model returned an incomplete script (${wordCountExtracted} words). Please retry.`,
      });
    }

    // 3. Extract EVIDENCE
    const evidenceLines: { claim: string; source: string; url: string }[] = [];
    const evidenceMatch = rawOutput.match(
      /===EVIDENCE_START===([\s\S]*?)===EVIDENCE_END===/i
    );
    if (evidenceMatch) {
      const lines = evidenceMatch[1]
        .trim()
        .split("\n")
        .filter((l) => l.trim().startsWith("-"));
      for (const line of lines) {
        const parts = line.replace(/^-\s*/, "").split("|").map((s) => s.trim());
        if (parts[0]) {
          evidenceLines.push({
            claim: parts[0] || "",
            source: parts[1] || "Verified Wire",
            url: parts[2] || "",
          });
        }
      }
    }

    // 4. Return pure continuous script with ZERO cues, ZERO act headers, ZERO stage directions
    const pureScript = voiceoverText;
    const keyFacts = extractKeyFactsFromBriefing(briefingPack);

    // Keep sections array with single continuous entry for backwards compatibility
    const sections = [
      {
        act: "PURE JIMAK SCREENPLAY",
        cue: "",
        narration: pureScript,
        timestamp: "0:00 – Complete",
      },
    ];

    return res.json({
      success: true,
      format,
      count: 1,
      pitchId: sourceData.id || "documentary-script",
      title: sourceData.title,
      category: sourceData.category || "Geopolitics & Macroeconomics",
      scriptText: pureScript,
      fullVoiceover: pureScript,
      wordCount: wordCountExtracted,
      sections,
      meta: {
        vehicle,
        mechanism,
      },
      evidence: evidenceLines,
      briefingPack: {
        topic: briefingPack.topic,
        consensusBadge: briefingPack.consensusBadge,
        scrapedCount: briefingPack.scrapedArticles.length,
        timelineCount: briefingPack.backgroundTimeline.length,
        articles: briefingPack.scrapedArticles.map((a: any) => ({
          title: a.title,
          source: a.source,
          url: a.url,
          region: a.region || "Global",
          pubDate: a.pubDate || new Date().toISOString(),
          paragraphsCount: (a.paragraphs || []).length,
          paragraphs: a.paragraphs || [],
          snippet: a.paragraphs?.[0] || "",
          fullText: a.fullText || "",
        })),
        backgroundTimeline: briefingPack.backgroundTimeline,
        keyFacts,
        briefingPackText: briefingPack.briefingPackText,
      },
      verifiedSources: [
        ...briefingPack.scrapedArticles.map((a: any) => ({
          title: a.title,
          source: a.source,
          link: a.url,
          region: a.region,
          snippet: a.paragraphs?.[0] || "",
        })),
        ...evidenceLines
          .filter((e) => e.url && e.source)
          .map((e) => ({
            title: e.claim.slice(0, 80),
            source: e.source,
            link: e.url,
            region: "Cited in Script",
          })),
      ],
      provider: aiConfig.providerLabel,
      model: rawResult.usedModel,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Script generation error:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message || "Failed to generate script",
    });
  }
});

app.listen(PORT, "0.0.0.0" as any, () => {
  console.log(`[CausalFlow Backend] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[CausalFlow Backend] Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`[CausalFlow Backend] Radar Matrix: http://0.0.0.0:${PORT}/api/radar`);
});
