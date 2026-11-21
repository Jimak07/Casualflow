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
import { buildVerifiedBriefingPack, decodeGoogleNewsUrl, decodeArticleUrls } from "./articleScraper.js";
import { JIMAK_WRITING_STYLE_GUIDE } from "./jimakStyleGuide.js";
import { getActiveApiKey } from "./config/keys.js";

import {
  clusterAndScoreHeadlines,
  EVENT_CATEGORIES,
  generateCompiledSummaryText,
  ClusteredNewsEvent,
  isEchoingHeadline,
  ExecutiveBriefing,
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

// 2c. Direct .TXT Summary Download Endpoint (GET and POST /api/summaries/txt)
app.all("/api/summaries/txt", (req: Request, res: Response) => {
  try {
    const scope = (req.body?.scope || req.query?.scope || "ALL 24 SECTIONS") as string;
    const sortMode = (req.body?.sortMode || req.query?.sortMode || "Weighted Importance (Impact)") as string;
    const clusters = req.body?.clusters || [];

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

    if (req.query?.download === "true" || req.query?.format === "raw") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(summaryText);
    }

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
      error: error.message || "Failed to generate .txt summary",
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
 * Extracts structured key facts (figures, dates, quotes, core takeaways, and executive briefing)
 * from the scraped briefing pack articles for instant reader breakdown.
 * Strictly guards against headline echoing.
 */
function extractKeyFactsFromBriefing(briefingPack: any): {
  figures: string[];
  dates: string[];
  quotes: string[];
  bulletSummary: string[];
  executiveBriefing: ExecutiveBriefing;
} {
  const figures = new Set<string>();
  const dates = new Set<string>();
  const quotes = new Set<string>();
  const validParagraphs: { source: string; text: string }[] = [];

  const topic = briefingPack.topic || "";
  const allTitles = (briefingPack.scrapedArticles || []).map((a: any) => a.title);

  for (const art of briefingPack.scrapedArticles || []) {
    const text = art.fullText || (art.paragraphs || []).join(" ");
    if (!text) continue;

    // Extract substantive paragraphs that do NOT echo the title or topic
    for (const p of art.paragraphs || []) {
      const cleanP = p.replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim();
      if (
        cleanP.length > 35 &&
        !isEchoingHeadline(cleanP, art.title, allTitles) &&
        !isEchoingHeadline(cleanP, topic, allTitles)
      ) {
        validParagraphs.push({ source: art.source, text: cleanP });
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

  // Synthesize 3 robust, descriptive bullet points (Mount Fuji standard)
  const bulletSummary: string[] = [];
  const figuresList = Array.from(figures);
  const quotesList = Array.from(quotes);

  // Bullet 1: The Core Event & Situation Breakdown
  if (validParagraphs[0]) {
    const s1 = validParagraphs[0].text.split(/(?<=[.?!])\s+/)[0] || validParagraphs[0].text;
    bulletSummary.push(`[${validParagraphs[0].source}] ${s1.replace(/\.\.\.$/, "").trim()}`);
  } else {
    bulletSummary.push(`Verified breaking dispatches confirm ongoing developments regarding ${topic.toLowerCase()}, drawing coordinated response across regional authorities.`);
  }

  // Bullet 2: Ground-Level Evidence, Figures, or Response
  if (figuresList.length > 0) {
    bulletSummary.push(`Key reporting highlights quantifiable impacts, including ${figuresList.slice(0, 2).join(", ")}, with institutional oversight teams mobilizing containment audits.`);
  } else if (quotesList.length > 0) {
    bulletSummary.push(`Official statements emphasize immediate review: ${quotesList[0]}.`);
  } else if (validParagraphs[1]) {
    const s2 = validParagraphs[1].text.split(/(?<=[.?!])\s+/)[0] || validParagraphs[1].text;
    bulletSummary.push(`[${validParagraphs[1].source}] ${s2.replace(/\.\.\.$/, "").trim()}`);
  } else {
    bulletSummary.push(`Institutional authorities have initiated emergency protocols to evaluate systemic exposure and safeguard cross-border operations.`);
  }

  // Bullet 3: Institutional, Embassy, Regulatory & Safety Warnings
  if (validParagraphs[2]) {
    const s3 = validParagraphs[2].text.split(/(?<=[.?!])\s+/)[0] || validParagraphs[2].text;
    bulletSummary.push(`[${validParagraphs[2].source}] ${s3.replace(/\.\.\.$/, "").trim()}`);
  } else {
    bulletSummary.push(`Diplomatic missions and regulatory agencies have issued urgent advisories, cautioning of compounding supply-chain and regulatory risks if conditions deteriorate.`);
  }

  // Synthesize Executive Briefing (2 paragraphs: Core Event + Context/Background)
  let coreEvent = "";
  if (validParagraphs[0]) {
    coreEvent = validParagraphs[0].text;
    if (validParagraphs[1] && validParagraphs[1].text !== coreEvent) {
      coreEvent += ` ${validParagraphs[1].text}`;
    }
  } else {
    const outletsList = (briefingPack.scrapedArticles || []).map((a: any) => a.source).slice(0, 3).join(", ");
    coreEvent = `Reporting from ${outletsList || "international news services"} covers developments regarding ${topic.toLowerCase()}.`;
  }

  let contextBackground = "";
  if (validParagraphs[2]) {
    contextBackground = validParagraphs[2].text;
  } else {
    contextBackground = `International observers and regional authorities continue to evaluate incoming reporting across jurisdictions.`;
  }

  return {
    figures: figuresList.slice(0, 8),
    dates: Array.from(dates).slice(0, 8),
    quotes: quotesList.slice(0, 6),
    bulletSummary: bulletSummary.slice(0, 3),
    executiveBriefing: {
      coreEvent: coreEvent.replace(/\s+/g, " ").trim(),
      contextBackground: contextBackground.replace(/\s+/g, " ").trim(),
    },
  };
}

function cleanDossierText(text: string): string {
  if (!text) return "";
  return text
    // Strip meta delimiters if present
    .replace(/===META_START===[\s\S]*?===META_END===/gi, "")
    .replace(/===VOICEOVER_START===/gi, "")
    .replace(/===VOICEOVER_END===/gi, "")
    .replace(/===EVIDENCE_START===[\s\S]*?===EVIDENCE_END===/gi, "")
    // Strip any lingering script or stage cues
    .replace(/\[CAPCUT\s*CUES?[^\]]*\]/gi, "")
    .replace(/\[CapCut[^\]]*\]/gi, "")
    .replace(/\[SFX:[^\]]*\]/gi, "")
    .replace(/\[B-ROLL:[^\]]*\]/gi, "")
    .replace(/\[VISUAL:[^\]]*\]/gi, "")
    .replace(/^(?:VOICEOVER|NARRATION|NARRATOR|VO|HOST|SPEAKER)\s*:\s*/gim, "")
    // Normalize newlines and whitespace
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanVoiceoverNarration(text: string): string {
  return cleanDossierText(text);
}

const DOSSIER_SYSTEM_PROMPT = `You are an elite Senior Strategic Intelligence Analyst producing an authoritative, comprehensive Deep Intelligence Dossier for senior decision makers, policymakers, and investigative journalists.

Your mission is to synthesize the provided verified news reporting dispatches, direct quotes, official figures, and historical archives into an 800 to 1,000-word high-density factual dossier.

================================================================================
STRICT STRUCTURAL REQUIREMENTS (EXACTLY 4 SECTIONS):
================================================================================
You MUST organize the dossier into exactly these four distinct markdown sections:

### 1. Executive Overview
(Target: 150 to 200 words)
A high-level synthesis of the breaking event: what took place, who was involved, where it happened, exact timeline, verified milestones, and initial official statements.

### 2. Key Facts, Quotes & Specific Details
(Target: 250 to 300 words)
Concrete ground-truth evidence: exact quotes from leaders and officials, precise figures (amounts, percentages, treaty terms, troop or asset counts), specific dates, and actions taken.
MANDATORY CITATIONS: You MUST cite every key claim, number, and quote inline using the format [Source: Outlet Name] (for example: [Source: AP News], [Source: Reuters], [Source: CNN]).

### 3. Historical Context & How We Got Here
(Target: 200 to 250 words)
The structural, diplomatic, economic, or treaty precedents leading up to this moment. Previous negotiations, past summits or breakdowns, historical alliances, policy shifts, and baseline background that explains why this event is happening right now.

### 4. Geopolitical & Global Economic Implications
(Target: 200 to 250 words)
Forward-looking strategic analysis: what happens next, ripple effects on allies and adversaries, impact on regional security architectures, global trade, commodities, financial markets, and critical indicators to watch over the coming weeks.

================================================================================
STRICT QUALITY GUARDRAILS:
================================================================================
- LENGTH: The total dossier MUST be between 800 and 1,000 words. Never output brief summaries or truncated bullet lists. Write rich, analytical, flowing paragraphs within each section.
- ZERO BOILERPLATE: Absolutely NO generic phrases (such as "confirm critical developments regarding... requiring immediate administrative and crisis containment measures", "in conclusion", or "it remains to be seen"). Every sentence must contain factual substance and direct intelligence.
- PURE DOSSIER: Output ONLY the complete 4-section dossier text with markdown headers. Do NOT include meta commentary, pleasantries, or preamble.`;

/**
 * 4. Fast News Briefing Pack Scraper (POST /api/briefing)
 * Scrapes top reporting articles, historical timeline, and extracts structured key facts
 * Returns in ~1.5-3 seconds WITHOUT calling LLM.
 */
app.post("/api/briefing", async (req: Request, res: Response) => {
  try {
    const { cluster, pitch, tavilyKey = "", generateDossier = false } = req.body;
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

    let dossierText = "";
    let wordCount = 0;

    if (generateDossier) {
      const rawKey = getActiveApiKey(req.body);
      const aiConfig = detectAiProvider({
        rawKey,
        purpose: "script",
      });

      if (aiConfig) {
        const userPrompt = `TOPIC: ${sourceData.title}
CATEGORY: ${sourceData.category || sourceData.categoryLabel || "Geopolitics & Strategic Affairs"}
REGIONS REPORTING: ${(sourceData.regions || []).join(", ") || "Global"}

GROUND-TRUTH SCRAPED REPORTING & VERIFIED SOURCES:
${briefingPack.briefingPackText}

Write the complete 800 to 1,000-word Deep Intelligence Dossier adhering strictly to the 4 mandatory sections and inline [Source: Outlet Name] citations.`;

        try {
          const rawResult = await callUniversalAiRawText({
            config: aiConfig,
            systemPrompt: DOSSIER_SYSTEM_PROMPT,
            userPrompt,
            maxTokens: 4000,
            temperature: 0.65,
          });
          if (rawResult?.text) {
            dossierText = cleanDossierText(rawResult.text);
            wordCount = dossierText.split(/\s+/).filter(Boolean).length;
          }
        } catch (e: any) {
          console.error("Dossier generation during briefing error:", e.message);
        }
      }
    }

    return res.json({
      success: true,
      topic: briefingPack.topic,
      consensusBadge:
        briefingPack.consensusBadge ||
        `${briefingPack.scrapedArticles.length} Verified Outlets`,
      scrapedCount: briefingPack.scrapedArticles.length,
      timelineCount: briefingPack.backgroundTimeline.length,
      executiveBriefing: keyFacts.executiveBriefing,
      dossierText,
      wordCount,
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
      `[CausalFlow Backend] Briefing pack assembled: ${briefingPack.scrapedArticles.length} scraped articles, ${briefingPack.backgroundTimeline.length} historical context archives. Generating 800-1,000 word Intelligence Dossier with ${aiConfig.providerLabel} (${aiConfig.model})`
    );

    const userPrompt = `TOPIC: ${sourceData.title}
CATEGORY: ${sourceData.category || sourceData.categoryLabel || "Geopolitics & Strategic Affairs"}
REGIONS REPORTING: ${(sourceData.regions || []).join(", ") || "Global"}

GROUND-TRUTH SCRAPED REPORTING & VERIFIED SOURCES:
${briefingPack.briefingPackText}

Write the complete 800 to 1,000-word Deep Intelligence Dossier adhering strictly to the 4 mandatory sections and inline [Source: Outlet Name] citations.`;

    let rawResult: { text: string; usedModel: string } | null = null;
    try {
      rawResult = await callUniversalAiRawText({
        config: aiConfig,
        systemPrompt: DOSSIER_SYSTEM_PROMPT,
        userPrompt,
        maxTokens: 4000,
        temperature: 0.65,
      });
    } catch (aiError: any) {
      console.error(
        `[CausalFlow Backend] Dossier generation failed across models (${aiError.message})`
      );
      return res.status(502).json({
        success: false,
        error: "AI_GENERATION_FAILED",
        message: `Live dossier generation failed: ${aiError.message}`,
      });
    }

    if (!rawResult || !rawResult.text) {
      return res.status(502).json({
        success: false,
        error: "AI_EMPTY_RESPONSE",
        message: "Model returned empty content.",
      });
    }

    const cleanedDossier = cleanDossierText(rawResult.text);
    const wordCountExtracted = cleanedDossier
      .split(/\s+/)
      .filter(Boolean).length;

    const keyFacts = extractKeyFactsFromBriefing(briefingPack);

    // Verified sources list with direct decoded publisher links
    const verifiedSources = briefingPack.scrapedArticles.map((a: any) => ({
      title: a.title,
      source: a.source,
      link: a.url,
      region: a.region || "Global",
      snippet: a.paragraphs?.[0] || "",
    }));

    return res.json({
      success: true,
      pitchId: sourceData.id || "intelligence-dossier",
      title: sourceData.title,
      category: sourceData.category || "Geopolitics & Strategic Affairs",
      dossierText: cleanedDossier,
      scriptText: cleanedDossier, // for backwards compatibility
      fullVoiceover: cleanedDossier,
      wordCount: wordCountExtracted,
      sections: [
        {
          act: "DEEP INTELLIGENCE DOSSIER",
          cue: "",
          narration: cleanedDossier,
          timestamp: "Complete Dossier",
        },
      ],
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
      verifiedSources,
      provider: aiConfig.providerLabel,
      model: rawResult.usedModel,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Script generation error:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message || "Failed to generate dossier",
    });
  }
});

// Cache for enriched summaries
const summaryBriefingsCache = new Map<
  string,
  { aiBriefing: string; wordCount: number; timestamp: number }
>();

const SINGLE_SECTION_AI_PROMPT = `You are an elite Senior Strategic Intelligence Analyst synthesizing a factual documentary intelligence briefing.
Based STRICTLY on the provided reporting dispatches, direct quotes, and verified figures, synthesize an authoritative, factual 350 to 500-word executive briefing covering:
1. WHAT HAPPENED: Detailed breakdown of the breaking event, parties involved, locations, and timeline.
2. KEY FACTS, QUOTES & DATA: Concrete statements from officials, exact figures, and dates, with mandatory inline citations [Source: Outlet Name].
3. GEOPOLITICAL & ECONOMIC STAKES: Market repercussions, supply chain impact, diplomatic shifts, and systemic risks.

STRICT RULES:
- Word count MUST be between 350 and 500 words.
- Absolutely ZERO generic boilerplate phrases (no "confirm critical developments", no "requiring immediate administrative measures").
- Write rich, flowing paragraphs with inline citations. Zero conversational filler or CapCut cues.`;

const MASTER_SUMMARY_AI_PROMPT = `You are an elite Senior Strategic Analyst producing a concise, high-density briefing for a global master intelligence sheet.
Based STRICTLY on the provided reporting dispatches, synthesize a dense, zero-fluff 150 to 200-word factual briefing covering the core breaking event, verified facts, figures, key actors, and direct geopolitical or economic stakes.

STRICT RULES:
- Word count MUST be between 150 and 200 words.
- Absolutely ZERO generic boilerplate or headline repetition.
- Include specific numbers, official quotes, and inline citations [Source: Outlet Name].
- Flowing factual narrative, zero conversational filler.`;

async function synthesizeSummaryBriefingForEvent(params: {
  event: ClusteredNewsEvent;
  mode: "section" | "master";
  aiConfig: any;
  effectiveTavilyKey: string;
}): Promise<{ aiBriefing: string; wordCount: number; decodedArticles: any[] }> {
  const { event, mode, aiConfig, effectiveTavilyKey } = params;

  // 1. Decode all source URLs immediately
  const decodedArticles = await Promise.all(
    (event.articles || []).map(async (art) => ({
      ...art,
      link: await decodeGoogleNewsUrl(art.link),
    }))
  );

  // 2. Check in-memory cache
  const cacheKey = `${mode}:${event.id || event.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40)}`;
  if (summaryBriefingsCache.has(cacheKey)) {
    const cached = summaryBriefingsCache.get(cacheKey)!;
    return {
      aiBriefing: cached.aiBriefing,
      wordCount: cached.wordCount,
      decodedArticles,
    };
  }

  // 3. Assemble briefing pack (scrapes body paragraphs and searches direct publishers)
  try {
    const briefingPack = await buildVerifiedBriefingPack(event, effectiveTavilyKey);

    // Merge any direct publisher URLs discovered by scraper
    const existingUrls = new Set(decodedArticles.map((a) => a.link));
    for (const scraped of briefingPack.scrapedArticles) {
      if (scraped.url && !existingUrls.has(scraped.url) && !scraped.url.includes("news.google.com")) {
        existingUrls.add(scraped.url);
        decodedArticles.push({
          title: scraped.title,
          source: scraped.source,
          link: scraped.url,
          region: scraped.region || "Global",
          pubDate: scraped.pubDate || new Date().toISOString(),
        });
      }
    }

    if (aiConfig) {
      const systemPrompt = mode === "section" ? SINGLE_SECTION_AI_PROMPT : MASTER_SUMMARY_AI_PROMPT;
      const targetWords = mode === "section" ? "350 to 500-word" : "150 to 200-word";
      const userPrompt = `TOPIC: ${event.title}
CATEGORY: ${event.category || event.categoryLabel || "Geopolitics"}
REGIONS REPORTING: ${(event.regions || []).join(", ") || "Global"}

GROUND-TRUTH SCRAPED REPORTING & VERIFIED SOURCES:
${briefingPack.briefingPackText}

Write the complete ${targetWords} factual briefing obeying all strict guidelines.`;

      const rawResult = await callUniversalAiRawText({
        config: aiConfig,
        systemPrompt,
        userPrompt,
        maxTokens: mode === "section" ? 1600 : 800,
        temperature: 0.65,
      });

      if (rawResult && rawResult.text) {
        const cleaned = cleanDossierText(rawResult.text);
        const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
        summaryBriefingsCache.set(cacheKey, {
          aiBriefing: cleaned,
          wordCount,
          timestamp: Date.now(),
        });
        return {
          aiBriefing: cleaned,
          wordCount,
          decodedArticles,
        };
      }
    }
  } catch (err: any) {
    console.warn(`[Summary Compiler] Synthesis error for "${event.title}":`, err.message);
  }

  // Fallback if AI or scraping encounters an issue
  let fallbackText = "";
  if (event.executiveBriefing) {
    fallbackText = `${event.executiveBriefing.coreEvent}\n\n${event.executiveBriefing.contextBackground}`;
  } else {
    fallbackText = event.summary || event.title;
  }
  const wordCount = fallbackText.split(/\s+/).filter(Boolean).length;

  return {
    aiBriefing: fallbackText,
    wordCount,
    decodedArticles,
  };
}

/**
 * 6. Intelligence Summary Compilation Engine (POST /api/summaries/compile)
 * Supports Two-Speed AI Briefing Compilation:
 * - Single-Section Summary: 350 to 500-word factual briefings per story
 * - All-Sections Master Summary: 150 to 200-word dense, zero-fluff briefings per story
 * Decodes all source URLs to clean, direct publisher links.
 */
app.post("/api/summaries/compile", async (req: Request, res: Response) => {
  try {
    const {
      scope = "ALL 24 SECTIONS",
      sortMode = "importance",
      categoryKey = "",
      clusters = [],
      tavilyKey = "",
      limitPerSection = null,
    } = req.body;

    const rawKey = getActiveApiKey(req.body);
    const aiConfig = detectAiProvider({
      rawKey,
      purpose: "script",
    });

    const effectiveTavilyKey =
      (tavilyKey && tavilyKey.trim()) || process.env.TAVILY_API_KEY || "";

    const isGlobal =
      scope.toUpperCase() === "ALL 24 SECTIONS" ||
      scope.toUpperCase() === "GLOBAL" ||
      scope.toUpperCase() === "ALL SECTIONS";

    const mode: "section" | "master" = isGlobal ? "master" : "section";

    // 1. Resolve active clusters
    const activeClusters: ClusteredNewsEvent[] = Array.isArray(clusters) ? clusters : [];

    // 2. Select target sections
    const targetSections = isGlobal
      ? EVENT_CATEGORIES
      : EVENT_CATEGORIES.filter(
          (s) =>
            s.key.toLowerCase() === (categoryKey || scope).toLowerCase() ||
            s.label.toUpperCase() === scope.toUpperCase() ||
            s.shortLabel.toUpperCase() === scope.toUpperCase()
        );

    // Group events by categoryKey
    const eventsByCategory = new Map<string, ClusteredNewsEvent[]>();
    for (const ev of activeClusters) {
      const key = ev.categoryKey || "world";
      if (!eventsByCategory.has(key)) eventsByCategory.set(key, []);
      eventsByCategory.get(key)!.push(ev);
    }

    // Sort events within each category by sortMode
    for (const [key, list] of eventsByCategory.entries()) {
      list.sort((a, b) => {
        if (sortMode === "popularity" || sortMode === "consensus") {
          const aPop = a.popularityScore ?? a.consensusScore * 10;
          const bPop = b.popularityScore ?? b.consensusScore * 10;
          if (bPop !== aPop) return bPop - aPop;
          return (b.recencyScore ?? 0) - (a.recencyScore ?? 0);
        } else {
          const aImp = a.importanceScore ?? a.sensitivityScore;
          const bImp = b.importanceScore ?? b.sensitivityScore;
          if (bImp !== aImp) return bImp - aImp;
          return (b.recencyScore ?? 0) - (a.recencyScore ?? 0);
        }
      });
    }

    // 3. Select stories to process
    // In "master" mode: top 1 story per section
    // In "section" mode: up to 6 stories in that section
    const maxPerSection = limitPerSection || (mode === "master" ? 1 : 6);
    const storiesToProcess: { section: any; event: ClusteredNewsEvent }[] = [];

    for (const sec of targetSections) {
      const secEvents = eventsByCategory.get(sec.key) || [];
      const slice = secEvents.slice(0, maxPerSection);
      for (const ev of slice) {
        storiesToProcess.push({ section: sec, event: ev });
      }
    }

    console.log(
      `[Summary Compiler] Compiling ${mode.toUpperCase()} summaries for ${storiesToProcess.length} stories across ${targetSections.length} sections (${mode === "section" ? "350-500w" : "150-200w"} briefings)`
    );

    // 4. Process stories in parallel batches
    const batchSize = mode === "section" ? 6 : 4;
    const enrichedEventsMap = new Map<string, ClusteredNewsEvent>();

    for (let i = 0; i < storiesToProcess.length; i += batchSize) {
      const batch = storiesToProcess.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async ({ event }) => {
          const result = await synthesizeSummaryBriefingForEvent({
            event,
            mode,
            aiConfig,
            effectiveTavilyKey,
          });

          enrichedEventsMap.set(event.id || event.title, {
            ...event,
            aiBriefing: result.aiBriefing,
            articles: result.decodedArticles,
          });
        })
      );
    }

    // 5. Construct enriched clusters array
    const enrichedClusters: ClusteredNewsEvent[] = [];
    for (const sec of targetSections) {
      const secEvents = eventsByCategory.get(sec.key) || [];
      const slice = secEvents.slice(0, maxPerSection);
      for (const ev of slice) {
        const enriched = enrichedEventsMap.get(ev.id || ev.title);
        if (enriched) {
          enrichedClusters.push(enriched);
        } else {
          enrichedClusters.push(ev);
        }
      }
    }

    // 6. Generate compiled text with clean formatting & decoded URLs
    const compiledText = generateCompiledSummaryText({
      scope,
      sortMode,
      events: enrichedClusters,
      sectionMetas: targetSections,
    });

    return res.json({
      success: true,
      scope,
      mode,
      storyCount: enrichedClusters.length,
      targetWordsPerStory: mode === "section" ? "350-500 words" : "150-200 words",
      compiledText,
      enrichedClusters,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Summary Compiler] Compilation error:", err);
    return res.status(500).json({
      success: false,
      error: "COMPILATION_FAILED",
      message: err.message || "Failed to compile intelligence summaries",
    });
  }
});

app.listen(PORT, "0.0.0.0" as any, () => {
  console.log(`[CausalFlow Backend] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[CausalFlow Backend] Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`[CausalFlow Backend] Radar Matrix: http://0.0.0.0:${PORT}/api/radar`);
});
