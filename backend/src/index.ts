import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import Parser from "rss-parser";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "8000", 10);
const HOST = "0.0.0.0";

// Cross-Origin Resource Sharing (CORS) Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check if origin matches allowed list or any *.vercel.app deployment
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        origin.startsWith("http://localhost:");

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback allow in dev / staging
      }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "5mb" }));

// 1. Health Check Endpoint (Render Keep-Alive)
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "causalflow-backend",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// 2. Live Multi-Niche RSS Ingestion Route (GET /api/radar)
interface FeedConfig {
  url: string;
  source: string;
  category: "geopolitics" | "finance" | "tech";
}

const FEEDS: FeedConfig[] = [
  // Geopolitics & Global
  {
    url: "https://news.google.com/rss/headlines/section/topic/WORLD",
    source: "Google News World",
    category: "geopolitics",
  },
  {
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    source: "Al Jazeera",
    category: "geopolitics",
  },
  {
    url: "http://feeds.bbci.co.uk/news/world/rss.xml",
    source: "BBC World",
    category: "geopolitics",
  },
  // Finance, Markets & Commodities
  {
    url: "https://finance.yahoo.com/news/rssindex",
    source: "Yahoo Finance",
    category: "finance",
  },
  {
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258",
    source: "CNBC Economy",
    category: "finance",
  },
  // Frontier Tech & AI
  {
    url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY",
    source: "Google News Tech",
    category: "tech",
  },
  {
    url: "https://techcrunch.com/feed/",
    source: "TechCrunch",
    category: "tech",
  },
  {
    url: "https://feeds.arstechnica.com/arstechnica/index",
    source: "Ars Technica",
    category: "tech",
  },
];

const rssParser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  timeout: 6000,
});

app.get("/api/radar", async (_req: Request, res: Response) => {
  try {
    const fetchPromises = FEEDS.map(async (feed) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(feed.url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "application/rss+xml, application/xml, text/xml, */*",
          },
        });

        clearTimeout(timeoutId);
        if (!response.ok) return [];

        const xml = await response.text();
        const parsed = await rssParser.parseString(xml);

        return (parsed.items || []).slice(0, 15).map((item) => ({
          title: (item.title || "").replace(/<[^>]*>?/gm, "").trim(),
          source: feed.source,
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          link: item.link || "",
          category: feed.category,
        }));
      } catch {
        clearTimeout(timeoutId);
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    const allHeadlines = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    // Deduplicate headlines
    const seenTitles = new Set<string>();
    const uniqueHeadlines = [];

    for (const item of allHeadlines) {
      if (!item.title || item.title.length < 10) continue;
      const normalized = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 45);

      if (!seenTitles.has(normalized)) {
        seenTitles.add(normalized);
        uniqueHeadlines.push(item);
      }
    }

    // Sort chronologically (most recent first)
    uniqueHeadlines.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime() || 0;
      const dateB = new Date(b.pubDate).getTime() || 0;
      return dateB - dateA;
    });

    const top45 = uniqueHeadlines.slice(0, 45);

    res.json({
      success: true,
      count: top45.length,
      scannedAt: new Date().toISOString(),
      headlines: top45,
    });
  } catch (error: any) {
    console.error("RSS Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to ingest live feeds",
      headlines: [],
    });
  }
});

// 3. Autonomous Dot-Connector Route (POST /api/synthesize)
app.post("/api/synthesize", async (req: Request, res: Response) => {
  try {
    const { headlines = [], preset = "all", customQuery = "", groqKey = "" } = req.body;

    const apiKey =
      (groqKey && groqKey.trim()) ||
      process.env.GROQ_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      "";

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "NO_API_KEY",
        message:
          "No Groq API key configured. Please add your free key in the 'API Keys ($0 Stack)' modal.",
      });
    }

    const isOpenRouter = apiKey.startsWith("sk-or-");
    const endpoint = isOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.groq.com/openai/v1/chat/completions";

    const modelName = isOpenRouter
      ? "meta-llama/llama-3.3-70b-instruct"
      : "llama-3.3-70b-versatile";

    const headlineSample = (headlines || [])
      .slice(0, 30)
      .map(
        (h: any, i: number) =>
          `[${i + 1}] (${h.source} | ${h.category}) ${h.title}`
      )
      .join("\n");

    const systemPrompt = `You are an elite documentary investigative producer modeled after ColdFusion and Economics Explained. Do NOT summarize individual news articles. Look across the live global headlines (and the user's selected preset or custom query) and autonomously synthesize 4 non-obvious, high-retention documentary story pitches.

For every pitch, connect the dots across 3 mandatory layers:
1. macro (Today's Trigger): Combine 2+ live headlines (e.g., an AI/tech shift + a financial market or supply chain event).
2. history (Historical Parallel): Identify a specific historical precedent from 10 to 50 years ago (e.g., the 2006 chip/telecom CapEx crunch, the 2008 fertilizer shock, the 1974 copper/stagflation cycle) that mirrors this exact structural pattern. Name the exact year and event.
3. micro (Everyday Human Scale): Trace the cause-and-effect chain all the way down to the ordinary person on the street—how this impacts grocery bills, electricity rates, hardware repair costs, or local jobs.

Return strictly valid JSON with a "pitches" array containing exactly 4 objects.
Each pitch object must have this exact structure:
{
  "id": "unique-slug-string",
  "category": "ai-finance" | "geopolitics" | "macro-crisis",
  "badge": "e.g., 96% Causal Impact",
  "title": "Compelling, cinematic documentary YouTube title",
  "subtitle": "2-sentence pitch thesis explaining the causal chain",
  "sources": ["Source 1", "Source 2"],
  "runtime": "12m 20s (~1,850 words)",
  "historyShort": "e.g., 2006 CapEx Crunch",
  "searchQueries": ["fact check current trigger query", "historical parallel year query"],
  "macro": {
    "title": "Title of macro catalyst",
    "date": "Recent date or cycle",
    "description": "2-3 sentences explaining the macro trigger combining 2+ headlines",
    "metricTag": "Key metric, e.g., +42% Capital Outflow",
    "source": "Primary source"
  },
  "history": {
    "title": "Title of historical echo",
    "period": "Exact year range (e.g. 1999-2006)",
    "description": "2-3 sentences explaining the historical mirror",
    "similarityScore": "89% Structural Match",
    "lesson": "The core economic takeaway"
  },
  "micro": {
    "title": "Everyday human scale effect",
    "affectedGroup": "Target demographic affected",
    "description": "2-3 sentences explaining grocery bill, utility, car loan, or rent impact",
    "dollarOrPriceMetric": "+$38.50/mo Average Power Surcharge",
    "actionableTakeaway": "Practical hedge or consumer action"
  },
  "script": {
    "coldOpen": {
      "title": "COLD OPEN: The Hook",
      "timestamp": "0:00 – 1:15",
      "visualCue": "[CAPCUT CUES]\\n• Fast rhythmic B-roll cuts, satellite zooms, sound effects, text overlays",
      "narration": "Compelling first-person documentary voiceover copy"
    },
    "actI": {
      "title": "ACT I: THE MACRO TRIGGER",
      "timestamp": "1:15 – 3:30",
      "visualCue": "[CAPCUT CUES]\\n• Chart breakdowns, split screens, news graphics",
      "narration": "Investigative narration breaking down the macro trigger"
    },
    "actII": {
      "title": "ACT II: THE HISTORICAL PARALLEL",
      "timestamp": "3:30 – 6:00",
      "visualCue": "[CAPCUT CUES]\\n• Archival footage grain, vintage broadcast clips",
      "narration": "Deep dive into the 10-50 year historical precedent"
    },
    "actIII": {
      "title": "ACT III: THE EVERYDAY HUMAN IMPACT",
      "timestamp": "6:00 – 8:45",
      "visualCue": "[CAPCUT CUES]\\n• Everyday scenes, grocery receipt closeups, actionable takeaways",
      "narration": "Tying the macro reality directly to the viewer's daily finances"
    }
  }
}`;

    const userPrompt = `LENS PRESET: ${preset}
CUSTOM USER QUERY: ${customQuery || "None (autonomously discover the most fascinating non-obvious dots)"}

LIVE GLOBAL HEADLINES INGESTED ACROSS WORLD NEWS, FINANCIAL MARKETS, COMMODITIES, AND AI TECH:
${headlineSample}

Synthesize 4 distinct, high-impact documentary pitches connecting these live headlines to historical echoes and everyday human impact.`;

    const groqResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      return res.status(groqResponse.status).json({
        success: false,
        error: "API_ERROR",
        message: `Inference failed: ${err.slice(0, 200)}`,
      });
    }

    const data = await groqResponse.json();
    const rawContent = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(rawContent);

    res.json({
      success: true,
      count: (parsed.pitches || []).length,
      synthesizedAt: new Date().toISOString(),
      pitches: parsed.pitches || [],
    });
  } catch (error: any) {
    console.error("Synthesize error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Synthesis route failure",
    });
  }
});

// 4. Deep Historical Research & Full Documentary Script Generator (POST /api/script)
app.post("/api/script", async (req: Request, res: Response) => {
  try {
    const {
      pitch,
      groqKey = "",
      tavilyKey = "",
      targetActIndex = null,
      currentSections = [],
    } = req.body;

    if (!pitch) {
      return res.status(400).json({
        success: false,
        error: "MISSING_PITCH",
        message: "Pitch data is required.",
      });
    }

    const apiKey =
      (groqKey && groqKey.trim()) ||
      process.env.GROQ_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      "";

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "NO_API_KEY",
        message:
          "No Groq API key configured. Please add your free key in the 'API Keys ($0 Stack)' modal.",
      });
    }

    const isOpenRouter = apiKey.startsWith("sk-or-");
    const endpoint = isOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.groq.com/openai/v1/chat/completions";

    const modelName = isOpenRouter
      ? "meta-llama/llama-3.3-70b-instruct"
      : "llama-3.3-70b-versatile";

    // Step A: Fact & History Verification (Tavily API with Graceful Fallback)
    const effectiveTavilyKey =
      (tavilyKey && tavilyKey.trim()) || process.env.TAVILY_API_KEY || "";

    const searchQueries: string[] =
      pitch.searchQueries && pitch.searchQueries.length > 0
        ? pitch.searchQueries
        : [
            `${pitch.nodes?.macroTrigger?.title || pitch.title} news facts companies numbers`,
            `${pitch.nodes?.historicalParallel?.period || pitch.historyShort || "history"} economic crisis facts statistics`,
          ];

    let verifiedResearchNotes = "";

    if (effectiveTavilyKey) {
      try {
        const tavilyPromises = searchQueries.slice(0, 2).map(async (query) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
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

    // Step B: Production Documentary Scriptwriting (Groq Llama 3.3 70B)
    const isSingleActRegen =
      targetActIndex !== null &&
      targetActIndex !== undefined &&
      typeof targetActIndex === "number" &&
      targetActIndex >= 0 &&
      targetActIndex < 5;

    const ACT_NAMES = [
      "COLD OPEN // THE HOOK",
      "ACT I // THE PRESENT CATALYST",
      "ACT II // THE TIME MACHINE (HISTORICAL ECHO)",
      "ACT III // THE MICRO CAUSE & EFFECT",
      "OUTRO // THE BIG TAKEAWAY",
    ];

    let systemPrompt = "";
    let userPrompt = "";

    if (isSingleActRegen) {
      const targetActName = ACT_NAMES[targetActIndex];
      const surroundingContext = (currentSections || [])
        .map((s: any, idx: number) => `Act [${idx + 1}] (${s.act}):\n${s.narration.slice(0, 180)}...`)
        .join("\n\n");

      systemPrompt = `You are the lead investigative writer for an elite macroeconomic YouTube documentary channel (styled after ColdFusion and Economics Explained).
You are rewriting or expanding ONLY ONE specific act of the script: "${targetActName}".
Ensure the revised act flows seamlessly with the existing acts. Aim for 300 to 450 words of rich, high-retention narration for this act.

CRITICAL VOICEOVER RULE: Inside the "narration" field, write clean, natural, rhythmic spoken English designed for TTS and voiceover. Do NOT put stage directions, brackets, asterisks, or awkward symbols inside "narration". Put all visual editing directions, chart suggestions, and B-roll ideas strictly inside the "cue" field for manual CapCut editing.

Return strictly valid JSON:
{
  "updatedSection": {
    "act": "${targetActName}",
    "cue": "[CAPCUT CUES]\\n• Visual directions, B-roll stock ideas, sound effects, text overlays",
    "narration": "Natural, broadcast-ready voiceover narration text (300-450 words)"
  }
}`;

      userPrompt = `PITCH TITLE: ${pitch.title}
CATEGORY: ${pitch.category}
MACRO TRIGGER: ${pitch.nodes?.macroTrigger?.description}
HISTORICAL PARALLEL: ${pitch.nodes?.historicalParallel?.description}
HUMAN IMPACT: ${pitch.nodes?.humanImpact?.description}

${verifiedResearchNotes}

SURROUNDING ACTS CONTEXT:
${surroundingContext}

REGENERATE ACT [${targetActIndex + 1}]: "${targetActName}" with fresh pacing and concrete historical/economic details.`;
    } else {
      systemPrompt = `You are the lead writer for a high-retention macroeconomic and investigative documentary YouTube channel (styled after ColdFusion and Economics Explained). Write a comprehensive, production-ready documentary script (aim for 1,500 to 2,000 words of rich narration across 5 distinct acts) based on the provided 3-layer pitch and research data.

Structure the JSON output as:
{
  "sections": [
    {
      "act": "COLD OPEN // THE HOOK",
      "cue": "[CAPCUT CUES]\\n• Cinematic B-roll, drone shots, sound design notes, text overlays",
      "narration": "Clean spoken voiceover paragraph(s) designed for high viewer retention"
    },
    {
      "act": "ACT I // THE PRESENT CATALYST",
      "cue": "[CAPCUT CUES]\\n• Stock ticker splits, interactive chart animations, news headlines",
      "narration": "Investigative breakdown of what just happened in the macro news"
    },
    {
      "act": "ACT II // THE TIME MACHINE (HISTORICAL ECHO)",
      "cue": "[CAPCUT CUES]\\n• Archival footage grain, vintage news broadcasts, timeline graphics",
      "narration": "Deep dive into the 10-50 year historical parallel with exact figures and lessons"
    },
    {
      "act": "ACT III // THE MICRO CAUSE & EFFECT",
      "cue": "[CAPCUT CUES]\\n• Everyday scenes, grocery bills, electricity meters, supply chain maps",
      "narration": "Tracing the cause-and-effect chain down to the ordinary person on the street"
    },
    {
      "act": "OUTRO // THE BIG TAKEAWAY",
      "cue": "[CAPCUT CUES]\\n• Fast recap motion graphics, closing cinematic shots, audio crescendo",
      "narration": "Thought-provoking, memorable closing realization on what to watch next"
    }
  ]
}

CRITICAL VOICEOVER RULE: Inside the "narration" field, write clean, natural, rhythmic spoken English designed for TTS and voiceover. Do NOT put stage directions, brackets, asterisks, or awkward symbols inside "narration". Put all visual editing directions, chart suggestions, and B-roll ideas strictly inside the "cue" field for manual CapCut editing.`;

      userPrompt = `DOCUMENTARY PITCH DETAILS:
TITLE: ${pitch.title}
SUBTITLE / THESIS: ${pitch.subtitle}
CATEGORY: ${pitch.category}
RUNTIME ESTIMATE: ${pitch.estimatedRuntime || "12m 20s"}

NODE 1 (MACRO TRIGGER):
Title: ${pitch.nodes?.macroTrigger?.title}
Details: ${pitch.nodes?.macroTrigger?.description}
Metric: ${pitch.nodes?.macroTrigger?.metricTag}
Source: ${pitch.nodes?.macroTrigger?.source}

NODE 2 (HISTORICAL PARALLEL):
Title: ${pitch.nodes?.historicalParallel?.title}
Period: ${pitch.nodes?.historicalParallel?.period}
Details: ${pitch.nodes?.historicalParallel?.description}
Structural Match: ${pitch.nodes?.historicalParallel?.similarityScore}
Core Lesson: ${pitch.nodes?.historicalParallel?.lesson}

NODE 3 (EVERYDAY HUMAN SCALE):
Title: ${pitch.nodes?.humanImpact?.title}
Affected Demographic: ${pitch.nodes?.humanImpact?.affectedGroup}
Details: ${pitch.nodes?.humanImpact?.description}
Dollar/Price Metric: ${pitch.nodes?.humanImpact?.dollarOrPriceMetric}
Takeaway: ${pitch.nodes?.humanImpact?.actionableTakeaway}

${verifiedResearchNotes}

Generate the full 5-act production documentary screenplay (1,500 - 2,000 words total voiceover) formatted cleanly in the required JSON structure.`;
    }

    const groqResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.72,
        max_tokens: 4500,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return res.status(groqResponse.status).json({
        success: false,
        error: "API_ERROR",
        message: `Inference failed: ${errText.slice(0, 200)}`,
      });
    }

    const data = await groqResponse.json();
    const rawContent = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(rawContent);

    if (isSingleActRegen) {
      return res.json({
        success: true,
        updatedSection: parsed.updatedSection || parsed.section,
        targetActIndex,
        regeneratedAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      count: (parsed.sections || []).length,
      pitchId: pitch.id,
      sections: parsed.sections || [],
      generatedAt: new Date().toISOString(),
      hasTavilyResearch: Boolean(verifiedResearchNotes),
    });
  } catch (error: any) {
    console.error("Script generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate script",
    });
  }
});

// Bind server to 0.0.0.0 for Render
app.listen(PORT, HOST, () => {
  console.log(`[CausalFlow Backend] Server running on http://${HOST}:${PORT}`);
  console.log(`[CausalFlow Backend] Health check: http://${HOST}:${PORT}/health`);
});
