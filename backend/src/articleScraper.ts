import * as cheerio from "cheerio";
import Parser from "rss-parser";

export interface ScrapedArticle {
  title: string;
  source: string;
  url: string;
  region?: string;
  pubDate?: string;
  paragraphs: string[];
  fullText: string;
}

export interface VerifiedBriefingPack {
  topic: string;
  consensusBadge?: string;
  scrapedArticles: ScrapedArticle[];
  backgroundTimeline: {
    title: string;
    source: string;
    url: string;
    snippet: string;
  }[];
  briefingPackText: string;
}

const rssParser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  timeout: 7000,
});

/**
 * Cleans extracted text by stripping boilerplate, ad notices, and social links
 */
function cleanParagraphs(rawText: string): string[] {
  const boilerplateTerms = [
    "cookie",
    "privacy policy",
    "terms of service",
    "all rights reserved",
    "advertisement",
    "sign up for our newsletter",
    "subscribe now",
    "follow us on",
    "click here to",
    "read more:",
    "copyright",
    "photo by",
    "getty images",
  ];

  return rawText
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => {
      if (p.length < 40) return false;
      const lower = p.toLowerCase();
      return !boilerplateTerms.some((term) => lower.includes(term));
    });
}

/**
 * Scrapes an article body via Jina Reader (https://r.jina.ai/) with Cheerio fallback
 */
export async function scrapeArticleBody(
  url: string,
  fallbackTitle = "News Article"
): Promise<{ fullText: string; paragraphs: string[]; sourceUrl: string }> {
  if (!url || !url.startsWith("http")) {
    return { fullText: "", paragraphs: [], sourceUrl: url || "" };
  }

  // 1. Try Jina Reader API first (strict 5-second timeout per URL)
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(jinaUrl, {
      headers: {
        Accept: "text/plain",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const markdown = await res.text();
      if (markdown && markdown.length > 250) {
        // Strip out markdown image tags, link brackets, and headers
        const cleaned = markdown
          .replace(/!\[.*?\]\(.*?\)/g, "")
          .replace(/\[(.*?)\]\(.*?\)/g, "$1")
          .replace(/#{1,6}\s+/g, "");

        const paragraphs = cleanParagraphs(cleaned).slice(0, 10);
        if (paragraphs.length >= 2) {
          return {
            fullText: paragraphs.join("\n\n"),
            paragraphs,
            sourceUrl: url,
          };
        }
      }
    }
  } catch (jinaErr) {
    // Gracefully fallback to direct Cheerio scrape
  }

  // 2. Fallback: Direct HTML fetch + Cheerio <p> tag extraction (strict 5-second timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);

      // Remove script, style, nav, footer, and ads
      $("script, style, nav, footer, noscript, header, aside, .advertisement, .ad").remove();

      const extracted: string[] = [];
      // Search for article paragraphs
      $("article p, main p, div.story-body p, div.article-body p, p").each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (text.length > 40) {
          extracted.push(text);
        }
      });

      const paragraphs = cleanParagraphs(extracted.join("\n\n")).slice(0, 10);
      if (paragraphs.length > 0) {
        return {
          fullText: paragraphs.join("\n\n"),
          paragraphs,
          sourceUrl: url,
        };
      }
    }
  } catch (cheerioErr) {
    // Cheerio fallback finished
  }

  return {
    fullText: fallbackTitle,
    paragraphs: [fallbackTitle],
    sourceUrl: url,
  };
}

/**
 * Builds the VERIFIED_BRIEFING_PACK from a news cluster and background timeline searches
 */
export async function buildVerifiedBriefingPack(
  cluster: any,
  tavilyKey?: string
): Promise<VerifiedBriefingPack> {
  const articles = cluster.articles || cluster.verifiedSources || [];
  const topArticles = articles.slice(0, 4);

  // 1. Scrape full article bodies concurrently across top 4 articles (with 8s timeout each)
  const scrapePromises = topArticles.map(async (art: any) => {
    const scraped = await scrapeArticleBody(art.link, art.title);
    return {
      title: art.title,
      source: art.source || "News Wire",
      url: art.link || "",
      region: art.region || "Global",
      pubDate: art.pubDate || "Recent",
      paragraphs: scraped.paragraphs,
      fullText: scraped.fullText,
    };
  });

  // 2. Fetch 2 Background / Timeline Search Queries via Google News RSS & Tavily
  const rawTopic = cluster.title || "";
  const coreTopic = rawTopic
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter((w: string) => w.length > 2)
    .slice(0, 5)
    .join(" ");

  const backgroundTimeline: {
    title: string;
    source: string;
    url: string;
    snippet: string;
  }[] = [];

  // Query 1: Google News RSS for background origins
  try {
    const gnewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(coreTopic)}+timeline+when:14d&hl=en-US&gl=US&ceid=US:en`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const gnewsRes = await fetch(gnewsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (gnewsRes.ok) {
      const xml = await gnewsRes.text();
      const parsed = await rssParser.parseString(xml);
      (parsed.items || []).slice(0, 3).forEach((item) => {
        backgroundTimeline.push({
          title: (item.title || "").replace(/<[^>]*>?/gm, "").trim(),
          source: (item.source as any)?._ || (item as any).creator || "Google News Archive",
          url: item.link || "",
          snippet: (item.contentSnippet || item.summary || "")
            .replace(/<[^>]*>?/gm, "")
            .trim()
            .slice(0, 200),
        });
      });
    }
  } catch {}

  // Query 2: Tavily Search for historical context (if key present)
  const effectiveTavilyKey =
    (tavilyKey && tavilyKey.trim()) || process.env.TAVILY_API_KEY || "";

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
          query: `${coreTopic} background timeline origin historical precedent`,
          search_depth: "basic",
          max_results: 3,
        }),
      });
      clearTimeout(timeoutId);

      if (tavilyRes.ok) {
        const data = await tavilyRes.json();
        (data.results || []).forEach((item: any) => {
          backgroundTimeline.push({
            title: item.title,
            source: "Tavily Historical Archive",
            url: item.url,
            snippet: item.content?.slice(0, 250) || "",
          });
        });
      }
    } catch {}
  }

  // Await the scraped articles
  const scrapedResults = await Promise.allSettled(scrapePromises);
  const scrapedArticles: ScrapedArticle[] = scrapedResults.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          title: topArticles[i]?.title || "Article",
          source: topArticles[i]?.source || "News Wire",
          url: topArticles[i]?.link || "",
          paragraphs: [topArticles[i]?.snippet || topArticles[i]?.title || ""],
          fullText: topArticles[i]?.snippet || topArticles[i]?.title || "",
        }
  );

  // Format into VERIFIED_BRIEFING_PACK text block
  let briefingPackText = `================================================================================
VERIFIED BRIEFING PACK (GROUND-TRUTH EVIDENCE)
================================================================================
TOPIC: ${cluster.title}
CONSENSUS: ${cluster.consensusBadge || `${scrapedArticles.length} Verified Outlets`}
REGIONS REPORTING: ${(cluster.regions || []).join(", ") || "Global"}

--------------------------------------------------------------------------------
PART A: FULL-TEXT REPORTING FROM BREAKING OUTLETS (${scrapedArticles.length} ARTICLES)
--------------------------------------------------------------------------------
`;

  scrapedArticles.forEach((art, idx) => {
    briefingPackText += `
[ARTICLE ${idx + 1}]
SOURCE: ${art.source} (${art.region || "Global"})
HEADLINE: ${art.title}
URL: ${art.url}
BODY PARAGRAPHS:
${art.paragraphs.map((p, pIdx) => `(${pIdx + 1}) ${p}`).join("\n\n")}
`;
  });

  if (backgroundTimeline.length > 0) {
    briefingPackText += `
--------------------------------------------------------------------------------
PART B: HISTORICAL CONTEXT & DEVELOPING TIMELINE (${backgroundTimeline.length} ARCHIVES)
--------------------------------------------------------------------------------
`;
    backgroundTimeline.forEach((bg, idx) => {
      briefingPackText += `
[TIMELINE ARCHIVE ${idx + 1}]
SOURCE: ${bg.source}
HEADLINE: ${bg.title}
URL: ${bg.url}
FACTS / SNIPPET: ${bg.snippet}
`;
    });
  }

  briefingPackText += `
================================================================================
END OF VERIFIED BRIEFING PACK
================================================================================`;

  return {
    topic: cluster.title,
    consensusBadge: cluster.consensusBadge,
    scrapedArticles,
    backgroundTimeline,
    briefingPackText,
  };
}
