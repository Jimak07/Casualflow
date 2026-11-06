import { getActiveApiKey } from "./config/keys.js";

export interface AiProviderConfig {
  provider: "vyce" | "gemini" | "groq" | "openrouter" | "openai";
  providerLabel: string;
  endpoint: string;
  model: string;
  apiKey: string;
}

export interface DetectProviderOptions {
  rawKey?: string;
  model?: string;
  provider?: string;
  purpose?: "synthesize" | "script";
}

export interface ModelOption {
  id: string;
  label: string;
  tag?: string;
  isDefault?: boolean;
}

// Ordered fallback list of candidate Vyce AI models (excluding dead 503 and tier-restricted 403 models)
export const VYCE_FALLBACK_MODELS = [
  "claude-sonnet-4-6",
  "deepseek-v4.1",
];

// Curated active models for Vyce AI
export const VYCE_MODELS = [
  {
    id: "hybrid",
    label: "Auto (Smart Fallback: Gemini Flash / Claude Sonnet)",
    description: "Gemini 3.1 Flash Lite for rapid news synthesis + Claude Sonnet 4.6 for documentary voiceovers",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    description: "Ultra-fast, robust 1M context default for multi-continental radar synthesis",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    description: "Fast, highly structured causal reasoning and outline synthesis",
  },
  {
    id: "nemotron-ultra-550b",
    label: "Nemotron Ultra 550B",
    description: "Massive scale macroeconomic causality & multi-variable analysis",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Flagship cinematic documentary screenwriter & historical depth",
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    description: "Balanced, high-precision GPT reasoning fallback",
  },
  {
    id: "deepseek-v4.1",
    label: "DeepSeek V4.1",
    description: "Advanced analytical reasoning & macro-economic causality",
  },
  {
    id: "beam-1.0",
    label: "Beam 1.0 (Free 10M/day promo pool)",
    description: "High-throughput free tier promo model",
  },
  {
    id: "agnes-3.0-flash",
    label: "Agnes 3.0 Flash (Free)",
    description: "Lightweight free model for instant turnaround",
  },
];

/**
 * Fetch list of online active models dynamically from Vyce AI /v1/models
 */
export async function fetchVyceModels(apiKey: string): Promise<string[]> {
  try {
    const vyceBase = (process.env.OPENAI_BASE_URL || "https://vyceai.com/v1").replace(/\/$/, "");
    const res = await fetch(`${vyceBase}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`[Vyce AI] /v1/models returned HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const list: any[] = Array.isArray(data) ? data : data.data || data.models || [];
    return list
      .map((m: any) => (typeof m === "string" ? m : m.id))
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch (e: any) {
    console.warn("[Vyce AI] Failed to fetch active models dynamically:", e.message || e);
    return [];
  }
}

/**
 * Fetch available model options for any configured provider
 */
export async function getAvailableModelsForProvider(config: AiProviderConfig): Promise<ModelOption[]> {
  if (config.provider === "vyce") {
    const onlineIds = await fetchVyceModels(config.apiKey);
    const modelOptions: ModelOption[] = [
      {
        id: "hybrid",
        label: "Auto (Smart Fallback: Gemini Flash / Claude Sonnet)",
        tag: "Recommended",
        isDefault: true,
      },
    ];

    const curatedMap = new Map<string, { label: string; tag: string }>();
    curatedMap.set("gemini-3.1-flash-lite", { label: "gemini-3.1-flash-lite (Active / Ultra-Fast)", tag: "Active" });
    curatedMap.set("claude-haiku-4-5", { label: "claude-haiku-4-5 (Active / Structured)", tag: "Active" });
    curatedMap.set("nemotron-ultra-550b", { label: "nemotron-ultra-550b (Active / 550B Reasoning)", tag: "Active" });
    curatedMap.set("claude-sonnet-4-6", { label: "claude-sonnet-4-6 (Active / Cinematic Screenplay)", tag: "Active" });
    curatedMap.set("gpt-5.6-luna", { label: "gpt-5.6-luna (Active / Balanced)", tag: "Active" });
    curatedMap.set("deepseek-v4.1", { label: "deepseek-v4.1 (Macro Reasoning)", tag: "Active" });
    curatedMap.set("beam-1.0", { label: "beam-1.0 (Free Promo Pool)", tag: "Free" });
    curatedMap.set("agnes-3.0-flash", { label: "agnes-3.0-flash (Free)", tag: "Free" });

    const seenIds = new Set<string>(["hybrid"]);

    // If online models returned from API, add them first
    if (onlineIds.length > 0) {
      for (const id of onlineIds) {
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const curated = curatedMap.get(id);
          modelOptions.push({
            id,
            label: curated ? curated.label : `${id} (Online)`,
            tag: curated ? curated.tag : "Online",
          });
        }
      }
    }

    // Ensure all known reliable fallback models are included
    for (const [id, meta] of curatedMap.entries()) {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        modelOptions.push({
          id,
          label: meta.label,
          tag: meta.tag,
        });
      }
    }

    return modelOptions;
  }

  if (config.provider === "groq") {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: any[] = data.data || [];
        const ids = list.map((m: any) => m.id).filter(Boolean);
        return [
          { id: "auto", label: "Auto (Smart Fallback)", isDefault: true },
          ...ids.map((id: string) => ({ id, label: id })),
        ];
      }
    } catch {}
    return [
      { id: "auto", label: "Auto (Smart Fallback)", isDefault: true },
      { id: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile (Recommended)" },
      { id: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant" },
      { id: "mixtral-8x7b-32768", label: "mixtral-8x7b-32768" },
    ];
  }

  if (config.provider === "gemini") {
    return [
      { id: "auto", label: "Auto (Smart Fallback)", isDefault: true },
      { id: "gemini-2.5-flash", label: "gemini-2.5-flash (Recommended)" },
      { id: "gemini-2.0-flash", label: "gemini-2.0-flash" },
      { id: "gemini-1.5-flash", label: "gemini-1.5-flash" },
      { id: "gemini-1.5-pro", label: "gemini-1.5-pro" },
    ];
  }

  if (config.provider === "openrouter") {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: any[] = (data.data || []).slice(0, 30);
        return [
          { id: "auto", label: "Auto (Smart Fallback)", isDefault: true },
          ...list.map((m: any) => ({ id: m.id, label: m.name || m.id })),
        ];
      }
    } catch {}
    return [
      { id: "auto", label: "Auto (Smart Fallback)", isDefault: true },
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "meta-llama/llama-3.3-70b-instruct:free" },
      { id: "google/gemini-2.0-flash-lite-preview-02-05:free", label: "google/gemini-2.0-flash-lite-preview-02-05:free" },
    ];
  }

  return [
    { id: "auto", label: "Auto (Smart Fallback)", isDefault: true },
    { id: "gpt-4o-mini", label: "gpt-4o-mini (Recommended)" },
    { id: "gpt-4o", label: "gpt-4o" },
  ];
}

/**
 * Auto-detects AI Provider based on API key prefix, environment variables, or selection:
 * - Vyce AI: VYCE_API_KEY, OPENAI_BASE_URL=https://vyceai.com/v1, vyce- / vy- / sk-vyce- prefix,
 *   or any key that isn't Gemini, Groq, or OpenRouter
 * - Google Gemini: AIza... prefix or provider='gemini' (gemini-2.5-flash)
 * - Groq: gsk_... prefix or provider='groq' (llama-3.3-70b-versatile)
 * - OpenRouter: sk-or-... prefix or provider='openrouter' (meta-llama/llama-3.3-70b-instruct:free)
 * - OpenAI Direct: provider='openai' (gpt-4o-mini)
 */
export function detectAiProvider(
  rawKeyOrOptions?: string | DetectProviderOptions,
  legacyModel?: string
): AiProviderConfig | null {
  const options: DetectProviderOptions =
    typeof rawKeyOrOptions === "string"
      ? { rawKey: rawKeyOrOptions, model: legacyModel }
      : rawKeyOrOptions || {};

  const rawKey = options.rawKey?.trim();
  const requestedProvider = options.provider?.toLowerCase().trim();
  const requestedModel = options.model?.trim();
  const purpose = options.purpose;

  const apiKey =
    rawKey ||
    getActiveApiKey();

  if (!apiKey) return null;

  // 1. Google Gemini (Key starts with AIza or provider explicitly gemini)
  if (apiKey.startsWith("AIza") || requestedProvider === "gemini") {
    const model =
      requestedModel && requestedModel !== "auto" && requestedModel !== "hybrid"
        ? requestedModel
        : "gemini-2.5-flash";
    return {
      provider: "gemini",
      providerLabel: `Google Gemini (${model})`,
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model,
      apiKey,
    };
  }

  // 2. Groq (Key starts with gsk_ or provider explicitly groq)
  if (apiKey.startsWith("gsk_") || requestedProvider === "groq") {
    const model =
      requestedModel && requestedModel !== "auto" && requestedModel !== "hybrid"
        ? requestedModel
        : "llama-3.3-70b-versatile";
    return {
      provider: "groq",
      providerLabel: `Groq (${model})`,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model,
      apiKey,
    };
  }

  // 3. OpenRouter (Key starts with sk-or- or provider explicitly openrouter)
  if (apiKey.startsWith("sk-or-") || requestedProvider === "openrouter") {
    const model =
      requestedModel && requestedModel !== "auto" && requestedModel !== "hybrid"
        ? requestedModel
        : "meta-llama/llama-3.3-70b-instruct:free";
    return {
      provider: "openrouter",
      providerLabel: `OpenRouter (${model})`,
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model,
      apiKey,
    };
  }

  // 4. OpenAI Direct (only when provider is explicitly requested as openai)
  if (requestedProvider === "openai") {
    const model =
      requestedModel && requestedModel !== "auto" && requestedModel !== "hybrid"
        ? requestedModel
        : "gpt-4o-mini";
    return {
      provider: "openai",
      providerLabel: `OpenAI (${model})`,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model,
      apiKey,
    };
  }

  // 5. Vyce AI Gateway:
  // Pro Studio Hybrid setup:
  // - /api/synthesize -> gemini-3.1-flash-lite (Active & Fast)
  // - /api/script -> claude-sonnet-4-6 (Active & Cinematic)
  // Or explicitly selected model from settings
  const vyceBase = (process.env.OPENAI_BASE_URL || "https://vyceai.com/v1").replace(
    /\/$/,
    ""
  );
  const vyceEndpoint = vyceBase.endsWith("/chat/completions")
    ? vyceBase
    : `${vyceBase}/chat/completions`;

  const isHybridOrAuto =
    !requestedModel ||
    requestedModel === "auto" ||
    requestedModel === "hybrid";

  let vyceModel = "claude-sonnet-4-6";
  if (!isHybridOrAuto) {
    vyceModel = requestedModel;
  } else if (purpose === "synthesize") {
    // Default to gemini-3.1-flash-lite as deepseek-v4-flash is disabled upstream
    vyceModel = "gemini-3.1-flash-lite";
  } else {
    vyceModel = "claude-sonnet-4-6";
  }

  return {
    provider: "vyce",
    providerLabel: `Vyce AI (${vyceModel})`,
    endpoint: vyceEndpoint,
    model: vyceModel,
    apiKey,
  };
}

/**
 * Strips markdown code blocks (```json ... ```) if present and extracts innermost JSON
 */
export function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned.trim();
}

/**
 * Strips markdown code fences, removes unescaped control chars, and safely parses JSON
 */
export function cleanAndParseJson<T = any>(text: string): T {
  const cleaned = cleanJsonOutput(text);
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    // Attempt relaxed cleanup for trailing commas or bad whitespace
    try {
      const sanitized = cleaned
        .replace(/,\s*([\]}])/g, "$1") // Remove trailing commas
        .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ""); // Remove non-printable control chars
      return JSON.parse(sanitized);
    } catch {
      throw new Error(
        `Failed to parse JSON response: ${err.message}. Raw output snippet: ${text.slice(0, 250)}`
      );
    }
  }
}

export function isHtmlResponse(text: string, contentType?: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return (
    trimmed.startsWith("<!doctype html") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<?xml") ||
    (contentType ? contentType.toLowerCase().includes("text/html") : false)
  );
}

export function extractHtmlErrorSummary(text: string, status?: number): string {
  const trimmed = text.trim();
  const titleMatch = trimmed.match(/<title>([\s\S]*?)<\/title>/i);
  const h1Match = trimmed.match(/<h1>([\s\S]*?)<\/h1>/i);
  const title = (titleMatch ? titleMatch[1].trim() : "") || (h1Match ? h1Match[1].trim() : "");
  if (title) {
    return `Upstream gateway error (${status || 502}): ${title}`;
  }
  return `Upstream gateway returned HTML error page (${status || 502} Bad Gateway)`;
}

export function isGatewayOrDowntimeError(status: number, text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 520 ||
    status === 521 ||
    status === 522 ||
    status === 524 ||
    isHtmlResponse(text) ||
    lower.includes("502 bad gateway") ||
    lower.includes("bad gateway") ||
    lower.includes("gateway timeout") ||
    lower.includes("cloudflare") ||
    lower.includes("upstream connect error") ||
    lower.includes("service temporarily unavailable") ||
    lower.includes("rate limit")
  );
}

function isModelDisabledError(status: number, errorText: string): boolean {
  const lower = errorText.toLowerCase();
  return (
    isGatewayOrDowntimeError(status, errorText) ||
    lower.includes("model_disabled") ||
    lower.includes("model is temporarily disabled") ||
    lower.includes("model temporarily disabled") ||
    lower.includes("model_not_found") ||
    lower.includes("does not exist") ||
    lower.includes("unsupported model") ||
    lower.includes("disabled") ||
    status === 404 ||
    status === 503 ||
    (status === 500 && (lower.includes("model") || lower.includes("server_error")))
  );
}

function isFormatError(errorText: string): boolean {
  const lower = errorText.toLowerCase();
  return (
    lower.includes("response_format") ||
    lower.includes("json_object") ||
    lower.includes("json mode") ||
    lower.includes("unsupported response_format") ||
    lower.includes("schema")
  );
}

/**
 * Universal OpenAI-compatible chat completion caller with automatic fallback:
 * 1. Checks and handles response_format: { type: "json_object" } rejection gracefully
 * 2. Implements automatic model fallback chain for Vyce AI and all providers when a model is disabled or fails
 * 3. Strips markdown fences (```json ... ```) and parses JSON robustly
 */
export async function callUniversalAi({
  config,
  systemPrompt,
  userPrompt,
  maxTokens = 4200,
  temperature = 0.7,
}: {
  config: AiProviderConfig;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://causalflow.app";
    headers["X-Title"] = "CausalFlow Documentary Intelligence";
  }

  // Helper to attempt calling a single model, with fallback for response_format & HTML/502 handling
  const attemptCall = async (modelToUse: string): Promise<{ data: any; usedModel: string }> => {
    const buildBody = (withJsonFormat: boolean) => {
      const body: any = {
        model: modelToUse,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      };
      if (withJsonFormat) {
        body.response_format = { type: "json_object" };
      }
      return body;
    };

    let res: Response;
    try {
      res = await fetch(config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(buildBody(true)),
      });
    } catch (netErr: any) {
      throw {
        status: 502,
        errorText: `Network connection error to ${config.endpoint}: ${netErr.message}`,
        model: modelToUse,
        isGatewayError: true,
      };
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const rawText = await res.text();
    const isHtml = isHtmlResponse(rawText, contentType);
    const is502Error =
      res.status === 502 ||
      res.status === 503 ||
      res.status === 504 ||
      res.status === 520 ||
      res.status === 521 ||
      res.status === 522 ||
      res.status === 524;

    // Check if error response or HTML gateway page received
    if (!res.ok || isHtml || is502Error) {
      // If error is strictly about response_format (and NOT an HTML/502 gateway error), retry without response_format
      if (!isHtml && !is502Error && isFormatError(rawText)) {
        console.warn(
          `[${config.providerLabel}] Model ${modelToUse} rejected response_format. Retrying without it...`
        );
        let retryRes: Response;
        try {
          retryRes = await fetch(config.endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(buildBody(false)),
          });
        } catch (retryNetErr: any) {
          throw {
            status: 502,
            errorText: `Network error on retry: ${retryNetErr.message}`,
            model: modelToUse,
            isGatewayError: true,
          };
        }

        const retryRaw = await retryRes.text();
        const retryIsHtml = isHtmlResponse(retryRaw, retryRes.headers.get("content-type") || "");

        if (retryRes.ok && !retryIsHtml) {
          let parsedJson: any = null;
          try {
            parsedJson = JSON.parse(retryRaw);
          } catch {}
          const content = parsedJson?.choices?.[0]?.message?.content || retryRaw;
          return { data: cleanAndParseJson(content), usedModel: modelToUse };
        } else {
          const summary = retryIsHtml
            ? extractHtmlErrorSummary(retryRaw, retryRes.status)
            : retryRaw.slice(0, 300);
          throw {
            status: retryRes.status || 502,
            errorText: summary,
            model: modelToUse,
            isGatewayError: retryIsHtml || retryRes.status >= 500,
          };
        }
      }

      const summary = isHtml
        ? extractHtmlErrorSummary(rawText, res.status)
        : rawText.slice(0, 300);

      throw {
        status: res.status || 502,
        errorText: summary,
        model: modelToUse,
        isGatewayError: isHtml || is502Error,
      };
    }

    // Success response: safely parse JSON
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(rawText);
    } catch {}

    const content = parsedData?.choices?.[0]?.message?.content || rawText;
    if (!content) throw new Error("Empty content returned from model.");
    return { data: cleanAndParseJson(content), usedModel: modelToUse };
  };

  // Try the primary model first
  try {
    const result = await attemptCall(config.model);
    return { ...result.data, _usedModel: result.usedModel };
  } catch (initialErr: any) {
    const { status = 500, errorText = initialErr.message || "", model = config.model } = initialErr;
    console.warn(
      `[${config.providerLabel}] Model "${model}" failed (${status}): ${errorText.slice(0, 160)}`
    );

    // Check if this is a model or gateway failure that warrants triggering fallback
    const shouldFallback =
      isGatewayOrDowntimeError(status, errorText) ||
      isModelDisabledError(status, errorText) ||
      status === 400 ||
      status === 404 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504;

    if (!shouldFallback) {
      throw new Error(`[${config.providerLabel}] Request failed (${status}): ${errorText.slice(0, 300)}`);
    }

    // Determine fallback models (pruned of confirmed dead 503/403 models to eliminate 45s latency)
    let fallbackCandidates: string[] = [];
    if (config.provider === "vyce") {
      fallbackCandidates = ["claude-sonnet-4-6", "deepseek-v4.1"].filter(
        (m) => m !== model
      );
    } else if (config.provider === "groq") {
      fallbackCandidates = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"].filter(
        (m) => m !== model
      );
    } else if (config.provider === "gemini") {
      fallbackCandidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"].filter(
        (m) => m !== model
      );
    } else if (config.provider === "openrouter") {
      fallbackCandidates = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemini-2.0-flash-lite-preview-02-05:free",
      ].filter((m) => m !== model);
    }

    let lastError = errorText;
    if (fallbackCandidates.length > 0) {
      console.log(
        `[${config.providerLabel}] Initiating automatic fallback chain across: ${fallbackCandidates.join(", ")}`
      );

      for (const candidate of fallbackCandidates) {
        try {
          console.log(`[${config.providerLabel}] Trying fallback model: ${candidate}...`);
          const fallbackRes = await attemptCall(candidate);
          console.log(`[${config.providerLabel}] ✓ Fallback successful with: ${candidate}`);
          return { ...fallbackRes.data, _usedModel: candidate };
        } catch (fbErr: any) {
          lastError = fbErr.errorText || fbErr.message || "";
          console.warn(
            `[${config.providerLabel}] Fallback candidate "${candidate}" failed: ${lastError.slice(0, 120)}`
          );
        }
      }
    }

    // Free keyless Pollinations AI JSON fallback (text.pollinations.ai)
    try {
      console.log(`[${config.providerLabel}] Attempting keyless Pollinations AI fallback (openai)...`);
      const polResult = await callPollinationsAiJson({
        systemPrompt,
        userPrompt,
        maxTokens,
        temperature,
      });
      console.log(`[${config.providerLabel}] ✓ Pollinations AI fallback succeeded!`);
      return { ...polResult.data, _usedModel: polResult.usedModel };
    } catch (polErr: any) {
      console.warn(`[${config.providerLabel}] Pollinations fallback failed: ${polErr.message}`);
    }

    throw new Error(
      `[${config.providerLabel}] All models in fallback chain failed. Primary model error: ${errorText.slice(0, 200)} | Last fallback error: ${lastError.slice(0, 200)}`
    );
  }
}

/**
 * Universal OpenAI-compatible chat completion caller that returns RAW TEXT
 * (no response_format, no JSON.parse). Use for long-form script generation
 * where the LLM outputs delimited plain text that we parse ourselves.
 *
 * Includes the same automatic model fallback chain as callUniversalAi.
 */
export async function callUniversalAiRawText({
  config,
  systemPrompt,
  userPrompt,
  maxTokens = 5000,
  temperature = 0.72,
}: {
  config: AiProviderConfig;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ text: string; usedModel: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://causalflow.app";
    headers["X-Title"] = "CausalFlow Documentary Intelligence";
  }

  const attemptCallRaw = async (
    modelToUse: string
  ): Promise<{ text: string; usedModel: string }> => {
    const body: any = {
      model: modelToUse,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    let res: Response;
    try {
      res = await fetch(config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (netErr: any) {
      throw {
        status: 502,
        errorText: `Network connection error to ${config.endpoint}: ${netErr.message}`,
        model: modelToUse,
        isGatewayError: true,
      };
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const rawText = await res.text();
    const isHtml = isHtmlResponse(rawText, contentType);
    const is502Error =
      res.status === 502 ||
      res.status === 503 ||
      res.status === 504 ||
      res.status === 520 ||
      res.status === 521 ||
      res.status === 522 ||
      res.status === 524;

    if (!res.ok || isHtml || is502Error) {
      const summary = isHtml
        ? extractHtmlErrorSummary(rawText, res.status)
        : rawText.slice(0, 300);

      throw {
        status: res.status || 502,
        errorText: summary,
        model: modelToUse,
        isGatewayError: isHtml || is502Error,
      };
    }

    // Extract content from the OpenAI-style response
    let content = rawText;
    try {
      const parsed = JSON.parse(rawText);
      content = parsed?.choices?.[0]?.message?.content || rawText;
    } catch {
      // rawText was not JSON — use it directly (shouldn't normally happen)
    }

    if (!content || content.trim().length === 0) {
      throw new Error("Empty content returned from model.");
    }

    return { text: content, usedModel: modelToUse };
  };

  // Try primary model
  try {
    return await attemptCallRaw(config.model);
  } catch (initialErr: any) {
    const {
      status = 500,
      errorText = initialErr.message || "",
      model = config.model,
    } = initialErr;
    console.warn(
      `[${config.providerLabel}] Model "${model}" failed (${status}): ${errorText.slice(0, 160)}`
    );

    const shouldFallback =
      isGatewayOrDowntimeError(status, errorText) ||
      isModelDisabledError(status, errorText) ||
      status === 400 ||
      status === 404 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504;

    if (!shouldFallback) {
      throw new Error(
        `[${config.providerLabel}] Request failed (${status}): ${errorText.slice(0, 300)}`
      );
    }

    // Determine fallback models (pruned of confirmed dead 503/403 models to eliminate 45s latency)
    let fallbackCandidates: string[] = [];
    if (config.provider === "vyce") {
      fallbackCandidates = ["claude-sonnet-4-6", "deepseek-v4.1"].filter(
        (m) => m !== model
      );
    } else if (config.provider === "groq") {
      fallbackCandidates = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
      ].filter((m) => m !== model);
    } else if (config.provider === "gemini") {
      fallbackCandidates = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
      ].filter((m) => m !== model);
    } else if (config.provider === "openrouter") {
      fallbackCandidates = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemini-2.0-flash-lite-preview-02-05:free",
      ].filter((m) => m !== model);
    }

    let lastError = errorText;
    if (fallbackCandidates.length > 0) {
      console.log(
        `[${config.providerLabel}] Initiating raw-text fallback chain across: ${fallbackCandidates.join(", ")}`
      );

      for (const candidate of fallbackCandidates) {
        try {
          console.log(
            `[${config.providerLabel}] Trying fallback model: ${candidate}...`
          );
          const result = await attemptCallRaw(candidate);
          console.log(
            `[${config.providerLabel}] ✓ Fallback successful with: ${candidate}`
          );
          return result;
        } catch (fbErr: any) {
          lastError = fbErr.errorText || fbErr.message || "";
          console.warn(
            `[${config.providerLabel}] Fallback candidate "${candidate}" failed: ${lastError.slice(0, 120)}`
          );
        }
      }
    }

    // Free keyless Pollinations AI raw-text fallback (text.pollinations.ai)
    try {
      console.log(`[${config.providerLabel}] Attempting keyless Pollinations AI raw-text fallback (openai)...`);
      const polResult = await callPollinationsAiRawText({
        systemPrompt,
        userPrompt,
        maxTokens,
        temperature,
      });
      console.log(`[${config.providerLabel}] ✓ Pollinations AI raw-text fallback succeeded!`);
      return polResult;
    } catch (polErr: any) {
      console.warn(`[${config.providerLabel}] Pollinations raw-text fallback failed: ${polErr.message}`);
    }

    throw new Error(
      `[${config.providerLabel}] All models in raw-text fallback chain failed. Primary: ${errorText.slice(0, 200)} | Last: ${lastError.slice(0, 200)}`
    );
  }
}

/**
 * Keyless free fallback using text.pollinations.ai OpenAI-compatible endpoint.
 * Requires no API key, highly resilient, returns OpenAI chat completion payload.
 */
export async function callPollinationsAiRawText({
  systemPrompt,
  userPrompt,
  maxTokens = 4200,
  temperature = 0.72,
}: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ text: string; usedModel: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Pollinations HTTP ${res.status}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    if (!content || content.trim().length === 0) {
      throw new Error("Pollinations returned empty content");
    }

    return { text: content, usedModel: "pollinations/openai" };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw new Error(`Pollinations API failed: ${err.message}`);
  }
}

/**
 * Keyless free fallback for structured JSON tasks using Pollinations AI.
 */
export async function callPollinationsAiJson<T = any>({
  systemPrompt,
  userPrompt,
  maxTokens = 3500,
  temperature = 0.7,
}: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ data: T; usedModel: string }> {
  const raw = await callPollinationsAiRawText({
    systemPrompt: `${systemPrompt}\n\nIMPORTANT: Return strictly valid JSON. Do NOT wrap in markdown fences or backticks.`,
    userPrompt,
    maxTokens,
    temperature,
  });

  return {
    data: cleanAndParseJson<T>(raw.text),
    usedModel: raw.usedModel,
  };
}
