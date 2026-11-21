import * as cheerio from "cheerio";
import Parser from "rss-parser";

export interface ScrapedArticle {
  title: string;
  source: string;
  url: string;
  originalUrl?: string;
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

let decoderInstance: any = null;
const urlDecodeCache = new Map<string, string>();

/**
 * Decodes Google News redirect URLs (https://news.google.com/rss/articles/...)
 * into the real publisher URL (apnews.com, cnn.com, reuters.com, etc.)
 */
export async function decodeGoogleNewsUrl(rawUrl: string): Promise<string> {
  if (!rawUrl || !rawUrl.startsWith("http")) return rawUrl || "";

  // If already cached, return immediately
  if (urlDecodeCache.has(rawUrl)) {
    return urlDecodeCache.get(rawUrl)!;
  }

  // If already a direct publisher URL, cache & return as-is
  if (!rawUrl.includes("news.google.com")) {
    urlDecodeCache.set(rawUrl, rawUrl);
    return rawUrl;
  }

  // 1. Try google-news-url-decoder library first
  try {
    if (!decoderInstance) {
      // @ts-ignore
      const { GoogleDecoder } = await import("google-news-url-decoder");
      decoderInstance = new GoogleDecoder();
    }
    const result = await decoderInstance.decode(rawUrl);
    if (result && result.status && result.decoded_url && result.decoded_url.startsWith("http")) {
      urlDecodeCache.set(rawUrl, result.decoded_url);
      return result.decoded_url;
    }
  } catch (err) {
    // Fall back to HTML extraction
  }

  // 2. Fallback: Fetch Google News landing page HTML and extract destination URL
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(rawUrl, {
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
      // Check data-n-au attribute (Google News redirect attribute)
      const dataNauMatch = html.match(/data-n-au="(https?:\/\/[^"]+)"/i);
      if (dataNauMatch && dataNauMatch[1] && !dataNauMatch[1].includes("google.com")) {
        urlDecodeCache.set(rawUrl, dataNauMatch[1]);
        return dataNauMatch[1];
      }

      // Check c-wiz anchors
      const $ = cheerio.load(html);
      let found = "";
      $("c-wiz a[href^='http'], article a[href^='http'], a[data-n-au]").each((_, el) => {
        const href = $(el).attr("data-n-au") || $(el).attr("href");
        if (href && href.startsWith("http") && !href.includes("google.com")) {
          found = href;
          return false;
        }
      });
      if (found) {
        urlDecodeCache.set(rawUrl, found);
        return found;
      }
    }
  } catch {}

  urlDecodeCache.set(rawUrl, rawUrl);
  return rawUrl;
}

/**
 * Batch decodes an array of articles, replacing any Google News redirect URLs with clean publisher URLs
 */
export async function decodeArticleUrls<T extends { link?: string; url?: string }>(articles: T[]): Promise<T[]> {
  if (!articles || !Array.isArray(articles)) return [];
  return Promise.all(
    articles.map(async (art) => {
      const raw = art.link || art.url || "";
      const decoded = await decodeGoogleNewsUrl(raw);
      return {
        ...art,
        link: decoded,
        url: decoded,
      };
    })
  );
}

/**
 * Searches Bing News RSS & DuckDuckGo for direct, non-Google publisher URLs
 * matching the headline (e.g. apnews.com, reuters.com, bbc.com)
 */
export async function searchDirectPublisherUrls(
  headline: string
): Promise<{ title: string; url: string; source: string }[]> {
  const results: { title: string; url: string; source: string }[] = [];
  const cleanHeadline = headline
    .replace(/\s*-\s*[A-Za-z0-9\s]+News$/i, "")
    .replace(/\s*-\s*(AP|Reuters|BBC|CNN|Al Jazeera|Bloomberg|The Guardian)$/i, "")
    .replace(/[^\w\s-]/g, " ")
    .trim();

  // 1. Bing News RSS search
  try {
    const bingUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(cleanHeadline)}&format=rss`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(bingUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const xml = await res.text();
      const linkRegex =
        /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?(?:<News:Source>(.*?)<\/News:Source>)?[\s\S]*?<\/item>/gi;
      let match;
      while ((match = linkRegex.exec(xml)) !== null && results.length < 5) {
        const rawTitle = match[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim() || "";
        let rawLink = match[2]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/&amp;/g, "&").trim() || "";
        const rawSource = match[3] || "News Wire";

        if (rawLink.includes("url=")) {
          try {
            const parsed = new URL(rawLink);
            const target = parsed.searchParams.get("url");
            if (target && target.startsWith("http")) {
              rawLink = target;
            }
          } catch {}
        }

        if (
          rawLink.startsWith("http") &&
          !rawLink.includes("bing.com") &&
          !rawLink.includes("google.com") &&
          !results.some((r) => r.url === rawLink)
        ) {
          let sourceName = rawSource;
          if (rawLink.includes("apnews.com")) sourceName = "AP News";
          else if (rawLink.includes("reuters.com")) sourceName = "Reuters";
          else if (rawLink.includes("bbc.com")) sourceName = "BBC News";
          else if (rawLink.includes("aljazeera.com")) sourceName = "Al Jazeera";
          else if (rawLink.includes("cnn.com")) sourceName = "CNN";
          else if (rawLink.includes("theguardian.com")) sourceName = "The Guardian";
          else if (rawLink.includes("bloomberg.com")) sourceName = "Bloomberg";

          results.push({
            title: rawTitle,
            url: rawLink,
            source: sourceName,
          });
        }
      }
    }
  } catch {}

  // 2. DuckDuckGo HTML search if needed
  if (results.length < 2) {
    try {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanHeadline + " news")}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(ddgUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        $(".result").each((_, el) => {
          if (results.length >= 5) return false;
          const aTag = $(el).find(".result__title a.result__url, .result__title a");
          const title = $(el).find(".result__title").text().trim();
          let href = aTag.attr("href") || "";

          if (href.includes("uddg=")) {
            try {
              const parsed = new URL("https://duckduckgo.com" + href);
              const target = parsed.searchParams.get("uddg");
              if (target && target.startsWith("http")) {
                href = decodeURIComponent(target);
              }
            } catch {}
          }

          if (
            href.startsWith("http") &&
            !href.includes("duckduckgo.com") &&
            !href.includes("google.com") &&
            !href.includes("youtube.com") &&
            !results.some((r) => r.url === href)
          ) {
            let source = "Verified Source";
            try {
              const host = new URL(href).hostname.replace(/^www\./, "");
              source = host.split(".")[0].toUpperCase();
            } catch {}

            results.push({ title, url: href, source });
          }
        });
      }
    } catch {}
  }

  return results;
}

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
    "image copyright",
    "newsletter sign up",
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
 * Scrapes an article body via Jina Reader (https://r.jina.ai/) with Cheerio fallback.
 * Automatically decodes Google News URLs first!
 */
export async function scrapeArticleBody(
  url: string,
  fallbackTitle = "News Article"
): Promise<{ fullText: string; paragraphs: string[]; sourceUrl: string }> {
  if (!url || !url.startsWith("http")) {
    return { fullText: "", paragraphs: [], sourceUrl: url || "" };
  }

  // Decode Google News URL to real destination URL first!
  const targetUrl = await decodeGoogleNewsUrl(url);

  // 1. Try Jina Reader API first (strict 6-second timeout)
  try {
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

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
        const cleaned = markdown
          .replace(/!\[.*?\]\(.*?\)/g, "")
          .replace(/\[(.*?)\]\(.*?\)/g, "$1")
          .replace(/#{1,6}\s+/g, "");

        const paragraphs = cleanParagraphs(cleaned).slice(0, 15);
        if (paragraphs.length >= 2) {
          return {
            fullText: paragraphs.join("\n\n"),
            paragraphs,
            sourceUrl: targetUrl,
          };
        }
      }
    }
  } catch (jinaErr) {
    // Fallback to direct Cheerio scrape
  }

  // 2. Fallback: Direct HTML fetch + Cheerio <p> tag extraction
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(targetUrl, {
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

      $("script, style, nav, footer, noscript, header, aside, .advertisement, .ad").remove();

      const extracted: string[] = [];
      $("article p, main p, div.story-body p, div.article-body p, p").each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (text.length > 40) {
          extracted.push(text);
        }
      });

      const paragraphs = cleanParagraphs(extracted.join("\n\n")).slice(0, 15);
      if (paragraphs.length > 0) {
        return {
          fullText: paragraphs.join("\n\n"),
          paragraphs,
          sourceUrl: targetUrl,
        };
      }
    }
  } catch (cheerioErr) {
    // Finished
  }

  return {
    fullText: fallbackTitle,
    paragraphs: [fallbackTitle],
    sourceUrl: targetUrl,
  };
}

/**
 * Builds the VERIFIED_BRIEFING_PACK from a news cluster, decoded articles, and background timeline
 */
export async function buildVerifiedBriefingPack(
  cluster: any,
  tavilyKey?: string
): Promise<VerifiedBriefingPack> {
  const clusterArticles = cluster.articles || cluster.verifiedSources || [];

  // Decode cluster articles and fetch direct publisher articles in parallel
  const decodedArticlesList: { title: string; source: string; url: string; region: string }[] = [];

  for (const art of clusterArticles.slice(0, 4)) {
    const rawLink = art.link || art.url || "";
    let decodedLink = rawLink;
    if (rawLink.includes("news.google.com")) {
      decodedLink = await decodeGoogleNewsUrl(rawLink);
    }
    decodedArticlesList.push({
      title: art.title,
      source: art.source || "News Wire",
      url: decodedLink,
      region: art.region || "Global",
    });
  }

  // If we have fewer than 3 decoded articles or all are Google redirect links, search direct publishers
  const needsMoreSources =
    decodedArticlesList.length < 3 ||
    decodedArticlesList.every((a) => a.url.includes("google.com"));

  if (needsMoreSources) {
    try {
      const directPublishers = await searchDirectPublisherUrls(cluster.title);
      for (const dp of directPublishers) {
        if (!decodedArticlesList.some((a) => a.url === dp.url)) {
          decodedArticlesList.push({
            title: dp.title || cluster.title,
            source: dp.source,
            url: dp.url,
            region: "Global Wire",
          });
          if (decodedArticlesList.length >= 5) break;
        }
      }
    } catch {}
  }

  // Scrape full article bodies concurrently across all decoded articles
  const scrapePromises = decodedArticlesList.map(async (art) => {
    const scraped = await scrapeArticleBody(art.url, art.title);
    return {
      title: art.title,
      source: art.source,
      url: scraped.sourceUrl || art.url,
      region: art.region,
      pubDate: "Recent Dispatches",
      paragraphs: scraped.paragraphs,
      fullText: scraped.fullText,
    };
  });

  // 2. Fetch Background / Timeline Search Queries via Google News RSS & Tavily
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
          title: decodedArticlesList[i]?.title || "Article",
          source: decodedArticlesList[i]?.source || "News Wire",
          url: decodedArticlesList[i]?.url || "",
          paragraphs: [decodedArticlesList[i]?.title || ""],
          fullText: decodedArticlesList[i]?.title || "",
        }
  );

  // Format into VERIFIED_BRIEFING_PACK text block with rich real paragraphs
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
