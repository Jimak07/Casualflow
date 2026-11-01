import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import Parser from "rss-parser";
import {
  detectAiProvider,
  callUniversalAi,
  getAvailableModelsForProvider,
} from "./aiProvider.js";
import {
  generateRssConsensusPitches,
  generateFallbackScript,
  generateFallbackStorylineAndScript,
} from "./fallbackSynthesis.js";
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
      process.env.VYCE_API_KEY ||
      process.env.UNIVERSAL_AI_KEY ||
      "";
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

    const rawKey = apiKey || groqKey;
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

    const rawKey = apiKey || groqKey;
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

    // If no AI key configured, use local fallback synthesis
    if (!aiConfig) {
      const fallbackResult = generateFallbackStorylineAndScript(sourceData, contextArticles);
      return res.json({
        success: true,
        notice: "Notice: No AI API key provided. Generated storyline & script via local consensus engine.",
        ...fallbackResult,
        evidencePack: {
          breakingArticles,
          contextArticles,
        },
        verifiedSources: allVerifiedSources,
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
        `[CausalFlow Backend] Storyline generation AI gateway error (${aiError.message}). Activating local fallback engine...`
      );
      isFallbackMode = true;
      fallbackNotice = "Notice: Upstream AI gateway is busy (502). Generated storyline map & script via local consensus engine.";
      parsed = generateFallbackStorylineAndScript(sourceData, contextArticles);
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
      provider: isFallbackMode ? "Autonomous Storyline Fallback Engine" : aiConfig.providerLabel,
      model: isFallbackMode ? "Local Economics Screenwriter" : (parsed._usedModel || aiConfig.model),
      isFallback: isFallbackMode,
      notice: fallbackNotice || undefined,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Storyline API error:", error);
    const fallbackResult = generateFallbackStorylineAndScript(req.body?.cluster || req.body?.pitch || {});
    res.json({
      success: true,
      notice: "Notice: Upstream AI gateway error. Generated storyline & script via local consensus engine.",
      ...fallbackResult,
      evidencePack: {
        breakingArticles: req.body?.cluster?.articles || [],
        contextArticles: [],
      },
      verifiedSources: req.body?.cluster?.articles || [],
      generatedAt: new Date().toISOString(),
    });
  }
});

// 5. "Economics Explained" Evidence-Backed Documentary Script Engine (POST /api/script)
app.post("/api/script", async (req: Request, res: Response) => {
  try {
    const {
      pitch,
      apiKey = "",
      groqKey = "",
      tavilyKey = "",
      targetActIndex = null,
      currentSections = [],
      model = "",
      provider = "",
    } = req.body;

    if (!pitch) {
      return res.status(400).json({
        success: false,
        error: "MISSING_PITCH",
        message: "Pitch data is required.",
      });
    }

    const rawKey = apiKey || groqKey;
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

    console.log(
      `[CausalFlow Backend] Generating Economics Explained script with ${aiConfig.providerLabel}`
    );

    // Step A: Fact & History Verification (Tavily API with Graceful Fallback)
    const effectiveTavilyKey =
      (tavilyKey && tavilyKey.trim()) || process.env.TAVILY_API_KEY || "";

    const searchQueries: string[] =
      pitch.searchQueries && pitch.searchQueries.length > 0
        ? pitch.searchQueries
        : [
            `${pitch.title} news facts companies statistics numbers`,
            `${pitch.historyShort || pitch.nodes?.historicalParallel?.period || "history"} economic crisis data`,
          ];

    let verifiedResearchNotes = "";

    if (effectiveTavilyKey) {
      try {
        const tavilyPromises = searchQueries.slice(0, 2).map(async (query) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          try {
            const r = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                api_key: effectiveTavilyKey,
                query,
                search_depth: "basic",
                max_results: 4,
              }),
            });
            clearTimeout(timeoutId);
            if (!r.ok) return [];
            const data = await r.json();
            return (data.results || []).map(
              (item: any) => `[Fact Source: ${item.title}] ${item.content}`
            );
          } catch {
            clearTimeout(timeoutId);
            return [];
          }
        });

        const settled = await Promise.allSettled(tavilyPromises);
        const searchSnippets = settled.flatMap((r) =>
          r.status === "fulfilled" ? r.value : []
        );

        if (searchSnippets.length > 0) {
          verifiedResearchNotes = `VERIFIED LIVE & HISTORICAL RESEARCH FACTS (via Tavily Search):\n${searchSnippets.join(
            "\n"
          )}\n`;
        }
      } catch (err) {
        console.warn("Tavily search skipped or failed gracefully:", err);
      }
    }

    // Prepare verified sources context
    const sourcesContext = (pitch.verifiedSources || [])
      .map(
        (s: any, i: number) =>
          `[Source ${i + 1}]: "${s.title}" — ${s.source} (${s.region || "Global"})\nLink: ${s.link || ""}`
      )
      .join("\n\n");

    const isSingleActRegen =
      targetActIndex !== null &&
      targetActIndex !== undefined &&
      typeof targetActIndex === "number" &&
      targetActIndex >= 0 &&
      targetActIndex < 5;

    const ACT_NAMES = [
      "COLD OPEN // THE EVERYDAY PARADOX",
      "ACT I // THE TIMELINE: HOW WE GOT HERE ➔ TODAY'S BREAKING UPDATE",
      "ACT II // THE GEOPOLITICAL & MACRO ENGINE",
      "ACT III // THE GROUND-LEVEL RIPPLE EFFECT",
      "OUTRO // THE MACRO VERDICT",
    ];

    let systemPrompt = "";
    let userPrompt = "";

    if (isSingleActRegen) {
      const targetActName = ACT_NAMES[targetActIndex];
      const surroundingContext = (currentSections || [])
        .map(
          (s: any, idx: number) =>
            `Act [${idx + 1}] (${s.act}):\n${s.narration.slice(0, 200)}...`
        )
        .join("\n\n");

      systemPrompt = `You are the lead analytical scriptwriter for an elite documentary YouTube channel styled after *Economics Explained* and *ColdFusion*.
You are rewriting or expanding ONLY ONE specific act of the script: "${targetActName}".
Ensure the revised act flows seamlessly with the existing acts. Aim for 350 to 500 words of rich, evidence-based narration for this act.

INLINE CITATION RULE:
Every time you state a statistic, policy decision, or factual claim, insert an inline source tag like "[Source: Outlet Name, Region]".
Put visual editing notes and B-roll ideas strictly inside the "cue" field.

Return strictly valid JSON:
{
  "updatedSection": {
    "act": "${targetActName}",
    "cue": "[CAPCUT CUES]\\n• Visual directions, split-screen charts, sound effects, text overlays",
    "narration": "Analytical, engaging spoken voiceover with inline citations (350-500 words)"
  }
}`;

      userPrompt = `PITCH TITLE: ${pitch.title}
CATEGORY: ${pitch.category}
CONSENSUS: ${pitch.consensusBadge || "Multi-Continental Reporting"}
TIMELINE: ${pitch.nodes?.macroTrigger?.baselineOrigin || ""} ➔ ${pitch.nodes?.macroTrigger?.breakingUpdate || pitch.nodes?.macroTrigger?.description}
GEOPOLITICAL MECHANISM & HISTORY: ${pitch.nodes?.historicalParallel?.description}
HUMAN SCALE: ${pitch.nodes?.humanImpact?.description}

VERIFIED OUTLET SOURCES REPORTING THIS EVENT:
${sourcesContext || "Global News Outlets"}

${verifiedResearchNotes}

SURROUNDING ACTS CONTEXT:
${surroundingContext}

REGENERATE ACT [${targetActIndex + 1}]: "${targetActName}" in Economics Explained analytical voiceover style.`;
    } else {
      systemPrompt = `You are the lead scriptwriter for a high-retention macroeconomic and investigative YouTube documentary channel styled after *Economics Explained* and *ColdFusion*.

Write a comprehensive, production-ready documentary script (aim for 1,600 to 2,200 words of rich narration across 5 distinct acts) based on the provided multi-continental pitch and verified evidence.

ADOPT THE EXACT "ECONOMICS EXPLAINED" NARRATIVE STYLE:
1. COLD OPEN // THE EVERYDAY PARADOX: Hook the viewer with a sharp observation of how a massive global event is quietly showing up in everyday life.
2. ACT I // THE TIMELINE: HOW WE GOT HERE ➔ TODAY'S BREAKING UPDATE: Explicitly link the baseline history/origin to today's breaking update, citing global coverage across Asia, Africa, Europe, and the US.
3. ACT II // THE GEOPOLITICAL & MACRO ENGINE: Break down the hidden supply chain, monetary policy, or resource leverage in plain, gripping English, plus the 10-50 year historical mirror.
4. ACT III // THE GROUND-LEVEL RIPPLE EFFECT: Trace the exact math of how this macro shock travels down to the average citizen's purchasing power, grocery basket, energy bill, or local wages.
5. OUTRO // THE MACRO VERDICT: Deliver an analytical big-picture assessment of what happens over the next 6 to 12 months.

MANDATORY INLINE CITATIONS RULE:
Whenever you cite a statistic, percentage, policy, or headline claim in the narration, append an inline source tag like "[Source: Outlet Name, Region]".
Put visual B-roll and CapCut editing directions strictly inside the "cue" field.

Structure the JSON output as:
{
  "sections": [
    {
      "act": "COLD OPEN // THE EVERYDAY PARADOX",
      "cue": "[CAPCUT CUES]\\n• Opening B-roll montage, drone footage, metallic drop SFX, lower-third titles",
      "narration": "Engaging voiceover with inline citations (250-350 words)"
    },
    {
      "act": "ACT I // THE TIMELINE: HOW WE GOT HERE ➔ TODAY'S BREAKING UPDATE",
      "cue": "[CAPCUT CUES]\\n• Split-screen global news broadcasts, animated timeline map, headline overlays",
      "narration": "Investigative breakdown linking the past baseline to today's breaking catalyst (350-450 words)"
    },
    {
      "act": "ACT II // THE GEOPOLITICAL & MACRO ENGINE",
      "cue": "[CAPCUT CUES]\\n• Archival footage grain, vintage news broadcasts, interactive supply-chain flowcharts",
      "narration": "Deep dive into the structural mechanism and historical parallel (400-500 words)"
    },
    {
      "act": "ACT III // THE GROUND-LEVEL RIPPLE EFFECT",
      "cue": "[CAPCUT CUES]\\n• Grocery receipts, utility meters, industrial towns, purchasing power charts",
      "narration": "Calculating the exact damage to the average citizen's daily finances (400-500 words)"
    },
    {
      "act": "OUTRO // THE MACRO VERDICT",
      "cue": "[CAPCUT CUES]\\n• Closing cinematic shots, summary infographics, audio crescendo",
      "narration": "Thought-provoking, memorable closing realization on what to watch next (250-350 words)"
    }
  ]
}`;

      userPrompt = `DOCUMENTARY PITCH DETAILS:
TITLE: ${pitch.title}
SUBTITLE / THESIS: ${pitch.subtitle}
CATEGORY: ${pitch.category}
CONSENSUS: ${pitch.consensusBadge || "Reported across multiple continents"}
REGIONS REPORTING: ${(pitch.regionsReporting || []).join(", ") || "Global"}
RUNTIME ESTIMATE: ${pitch.estimatedRuntime || "14m 20s"}

NODE 1 — THE DEVELOPING TIMELINE (PAST ➔ TODAY'S UPDATE):
Baseline Origin: ${pitch.nodes?.macroTrigger?.baselineOrigin || "Ongoing macroeconomic situation"}
Today's Breaking Update: ${pitch.nodes?.macroTrigger?.breakingUpdate || pitch.nodes?.macroTrigger?.description}
Outlets Reporting: ${pitch.nodes?.macroTrigger?.outletsReporting || pitch.nodes?.macroTrigger?.source}
Metric: ${pitch.nodes?.macroTrigger?.metricTag}

NODE 2 — GEOPOLITICAL & HISTORICAL MECHANISM:
Mechanism: ${pitch.nodes?.historicalParallel?.mechanism || pitch.nodes?.historicalParallel?.description}
Historical Parallel: ${pitch.nodes?.historicalParallel?.historicalPrecedent || pitch.nodes?.historicalParallel?.title} (${pitch.nodes?.historicalParallel?.period})
Structural Match: ${pitch.nodes?.historicalParallel?.similarityScore}
Core Lesson: ${pitch.nodes?.historicalParallel?.lesson}

NODE 3 — EVERYDAY HUMAN IMPACT (THE AVERAGE CITIZEN):
Affected Demographic: ${pitch.nodes?.humanImpact?.affectedGroup}
Ground-Level Effect: ${pitch.nodes?.humanImpact?.groundLevelEffect || pitch.nodes?.humanImpact?.description}
Dollar/Price Metric: ${pitch.nodes?.humanImpact?.dollarOrPriceMetric}
Actionable Takeaway: ${pitch.nodes?.humanImpact?.actionableTakeaway}

VERIFIED OUTLET SOURCES REPORTING THIS STORY:
${sourcesContext || "Live Multi-Continental RSS feeds"}

${verifiedResearchNotes}

Write the full 5-act production documentary screenplay (1,600 - 2,200 words total voiceover) with inline source citations formatted in the required JSON structure.`;
    }

    let parsed: any;
    let isFallbackMode = false;
    let fallbackNotice = "";

    try {
      parsed = await callUniversalAi({
        config: aiConfig,
        systemPrompt,
        userPrompt,
        maxTokens: 4500,
        temperature: 0.72,
      });
    } catch (aiError: any) {
      console.warn(
        `[CausalFlow Backend] Script generation AI gateway error (${aiError.message}). Activating local documentary script fallback...`
      );
      isFallbackMode = true;
      fallbackNotice = "Notice: Upstream AI gateway is busy (502). Generated screenplay via local synthesis engine.";
      parsed = generateFallbackScript(pitch, targetActIndex);
    }

    if (isSingleActRegen) {
      return res.json({
        success: true,
        updatedSection: parsed.updatedSection || parsed.section,
        targetActIndex,
        provider: isFallbackMode ? "Autonomous Script Fallback Engine" : aiConfig.providerLabel,
        model: isFallbackMode ? "Local Documentary Screenwriter" : (parsed._usedModel || aiConfig.model),
        isFallback: isFallbackMode,
        notice: fallbackNotice || undefined,
        regeneratedAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      count: (parsed.sections || []).length,
      pitchId: pitch.id,
      sections: parsed.sections || [],
      verifiedSources: pitch.verifiedSources || [],
      provider: isFallbackMode ? "Autonomous Script Fallback Engine" : aiConfig.providerLabel,
      model: isFallbackMode ? "Local Documentary Screenwriter" : (parsed._usedModel || aiConfig.model),
      isFallback: isFallbackMode,
      notice: fallbackNotice || undefined,
      generatedAt: new Date().toISOString(),
      hasTavilyResearch: Boolean(verifiedResearchNotes),
    });
  } catch (error: any) {
    console.error("Script generation error:", error);
    // Graceful fallback even if top-level processing fails
    const fallback = generateFallbackScript(req.body?.pitch || {}, req.body?.targetActIndex);
    res.json({
      success: true,
      count: (fallback.sections || []).length,
      pitchId: req.body?.pitch?.id || "fallback-pitch",
      sections: fallback.sections || [],
      verifiedSources: req.body?.pitch?.verifiedSources || [],
      provider: "Autonomous Script Fallback Engine",
      model: "Local Documentary Screenwriter",
      isFallback: true,
      notice: "Notice: Upstream AI gateway is busy (502). Generated screenplay via local synthesis engine.",
      generatedAt: new Date().toISOString(),
      hasTavilyResearch: false,
    });
  }
});

app.listen(PORT, "0.0.0.0" as any, () => {
  console.log(`[CausalFlow Backend] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[CausalFlow Backend] Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`[CausalFlow Backend] Radar Matrix: http://0.0.0.0:${PORT}/api/radar`);
});
