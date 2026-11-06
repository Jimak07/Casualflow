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
import { synthesizeJimakFallbackScript } from "./jimakFallback.js";

import { clusterAndScoreHeadlines } from "./clustering.js";

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
      console.error(
        `[CausalFlow Backend] Storyline generation AI error: ${aiError.message}`
      );
      return res.status(502).json({
        success: false,
        error: "AI_GENERATION_FAILED",
        message: `Failed to generate storyline across available AI models: ${aiError.message}`,
      });
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

function cleanVoiceoverNarration(text: string): string {
  if (!text) return "";
  return text
    .replace(/\[CAPCUT\s*CUES?[^\]]*\]/gi, "")
    .replace(/\[CapCut[^\]]*\]/gi, "")
    .replace(/\[SCENE\s*START[^\]]*\]/gi, "")
    .replace(/\[SFX:[^\]]*\]/gi, "")
    .replace(/\[B-ROLL:[^\]]*\]/gi, "")
    .replace(/^#{1,6}\s+.*$/gm, "") // Strip markdown headings
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Strip bold asterisks
    .replace(/__([^_]+)__/g, "$1") // Strip bold underscores
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
        console.warn(
          `[CausalFlow Backend] Single act regen AI error across models (${aiError.message}). Generating from briefing pack...`
        );
        const fallback = synthesizeJimakFallbackScript(sourceData, briefingPack, "long");
        const actData = fallback.sections[targetActIndex] || fallback.sections[0];
        return res.json({
          success: true,
          format,
          updatedSection: actData,
          targetActIndex,
          provider: "CausalFlow Consensus Engine",
          model: "Jimak Screenplay Engine (Evidence-Backed Fallback)",
          isFallback: true,
          regeneratedAt: new Date().toISOString(),
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
    let isFallbackMode = false;
    let fallbackNotice = "";

    try {
      rawResult = await callUniversalAiRawText({
        config: aiConfig,
        systemPrompt,
        userPrompt,
        maxTokens: format === "short" ? 2200 : 5500,
        temperature: 0.72,
      });
    } catch (aiError: any) {
      console.warn(
        `[CausalFlow Backend] All AI models failed or returned gateway errors (${aiError.message}). Compiling Jimak screenplay from verified briefing pack...`
      );
      isFallbackMode = true;
      fallbackNotice = "Notice: Upstream AI gateway is busy. Screenplay compiled from verified multi-outlet briefing pack.";
    }

    if (isFallbackMode || !rawResult) {
      const fallbackScript = synthesizeJimakFallbackScript(
        sourceData,
        briefingPack,
        format
      );

      return res.json({
        success: true,
        format,
        count: fallbackScript.sections.length,
        pitchId: sourceData.id || "documentary-script",
        sections: fallbackScript.sections,
        fullVoiceover: fallbackScript.fullVoiceover,
        meta: {
          vehicle: fallbackScript.vehicle,
          mechanism: fallbackScript.mechanism,
        },
        evidence: fallbackScript.evidence,
        briefingPack: {
          topic: briefingPack.topic,
          consensusBadge: briefingPack.consensusBadge,
          scrapedCount: briefingPack.scrapedArticles.length,
          timelineCount: briefingPack.backgroundTimeline.length,
          articles: briefingPack.scrapedArticles.map((a: any) => ({
            title: a.title,
            source: a.source,
            url: a.url,
            region: a.region,
            pubDate: a.pubDate,
            paragraphsCount: (a.paragraphs || []).length,
            snippet: a.paragraphs?.[0] || "",
          })),
          backgroundTimeline: briefingPack.backgroundTimeline,
          briefingPackText: briefingPack.briefingPackText,
        },
        verifiedSources: [
          ...briefingPack.scrapedArticles.map((a: any) => ({
            title: a.title,
            source: a.source,
            link: a.url,
            region: a.region,
          })),
          ...fallbackScript.evidence
            .filter((e) => e.url && e.source)
            .map((e) => ({
              title: e.claim.slice(0, 80),
              source: e.source,
              link: e.url,
              region: "Cited in Script",
            })),
        ],
        provider: "CausalFlow Consensus Engine",
        model: "Jimak Screenplay Engine (Evidence-Backed Fallback)",
        isFallback: true,
        notice: fallbackNotice,
        generatedAt: new Date().toISOString(),
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

    // 4. Split voiceover text into acts for the frontend ScriptStudio
    let sections: { act: string; cue: string; narration: string; timestamp: string }[] = [];

    if (format === "short") {
      const paragraphs = voiceoverText
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 20);

      if (paragraphs.length >= 3) {
        const p1 = paragraphs.slice(0, Math.max(1, Math.floor(paragraphs.length * 0.35))).join("\n\n");
        const p2 = paragraphs.slice(Math.max(1, Math.floor(paragraphs.length * 0.35)), Math.max(2, Math.floor(paragraphs.length * 0.75))).join("\n\n");
        const p3 = paragraphs.slice(Math.max(2, Math.floor(paragraphs.length * 0.75))).join("\n\n");

        sections = [
          {
            act: "HOOK & URGENCY",
            cue: "Dynamic kinetic typography, sound design hit, headline flash",
            narration: p1,
            timestamp: "0:00 – 0:15",
          },
          {
            act: "THE 3 PILLARS & MECHANISM",
            cue: "3-stage animated graphic, sound design riser, map highlight",
            narration: p2,
            timestamp: "0:15 – 0:45",
          },
          {
            act: "CLOSING QUESTION & CTA",
            cue: "Link arrow overlay pointing down, title card animation",
            narration: p3,
            timestamp: "0:45 – 1:00",
          },
        ];
      } else {
        sections = [
          {
            act: "SHORTS SCREENPLAY (~60s)",
            cue: "Dynamic kinetic typography, sound design, link arrow overlay",
            narration: voiceoverText,
            timestamp: "0:00 – 1:00",
          },
        ];
      }
    } else {
      // Long-form: split into 5 acts
      const paragraphs = voiceoverText
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 20);

      const actNames = [
        "COLD OPEN & AGENDA",
        "CHAPTER 1 // THE ORIGIN & BREAKING CATALYST",
        "CHAPTER 2 // THE GEOPOLITICAL & STRUCTURAL MECHANISM",
        "CHAPTER 3 // HOW IT HITS THE AVERAGE PERSON",
        "CHAPTER 4 // AND FINALLY: THE VERDICT",
      ];
      const actCues = [
        "Establishing drone shots, global news montage, lower-third graphics, tension riser",
        "Split-screen news broadcast montage, animated timeline map, audio typewriter SFX",
        "Archival footage grain, 3D supply-chain chokepoint motion graphic, sub-bass riser",
        "Intimate ground-level footage: grocery receipts, power meters, purchasing power charts",
        "Cinematic aerial pullback, summary scorecards, ambient synth resolution",
      ];
      const actTimestamps = [
        "0:00 – 1:45",
        "1:45 – 5:00",
        "5:00 – 9:00",
        "9:00 – 12:30",
        "12:30 – 15:00",
      ];

      if (paragraphs.length >= 5) {
        const weights = [0.16, 0.21, 0.23, 0.21, 0.19];
        const total = paragraphs.length;
        let cursor = 0;
        for (let i = 0; i < 5; i++) {
          const count =
            i === 4
              ? total - cursor
              : Math.max(1, Math.round(total * weights[i]));
          const slice = paragraphs.slice(cursor, cursor + count);
          sections.push({
            act: actNames[i],
            cue: actCues[i],
            narration: slice.join("\n\n"),
            timestamp: actTimestamps[i],
          });
          cursor += count;
        }
      } else if (paragraphs.length > 0) {
        const numActs = Math.min(paragraphs.length, 5);
        for (let i = 0; i < numActs; i++) {
          sections.push({
            act: actNames[i] || `CHAPTER ${i + 1}`,
            cue: actCues[i] || "Cinematic visuals",
            narration: paragraphs[i],
            timestamp: actTimestamps[i] || "",
          });
        }
      } else {
        sections = [
          {
            act: "FULL DOCUMENTARY VOICEOVER",
            cue: "Cinematic establishing shots and documentary narrative visual flow",
            narration: voiceoverText,
            timestamp: "0:00 – 15:00",
          },
        ];
      }
    }

    const fullVoiceover = sections
      .map((s) => s.narration)
      .filter(Boolean)
      .join("\n\n");

    return res.json({
      success: true,
      format,
      count: sections.length,
      pitchId: sourceData.id || "documentary-script",
      sections,
      fullVoiceover,
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
          region: a.region,
          pubDate: a.pubDate,
          paragraphsCount: (a.paragraphs || []).length,
          snippet: a.paragraphs?.[0] || "",
        })),
        backgroundTimeline: briefingPack.backgroundTimeline,
        briefingPackText: briefingPack.briefingPackText,
      },
      verifiedSources: [
        ...briefingPack.scrapedArticles.map((a: any) => ({
          title: a.title,
          source: a.source,
          link: a.url,
          region: a.region,
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
