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

export const VYCE_MODELS = [
  {
    id: "hybrid",
    label: "Pro Studio Hybrid (deepseek-v4-flash + claude-sonnet-4-6)",
    description: "DeepSeek V4 Flash for radar news synthesis + Claude Sonnet 4.6 for documentary voiceovers",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Flagship cinematic documentary screenwriter & historical depth",
  },
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    description: "Default for live headline scanning, 1M context, high speed",
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
    process.env.VYCE_API_KEY ||
    process.env.UNIVERSAL_AI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

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
  // - /api/synthesize -> deepseek-v4-flash
  // - /api/script -> claude-sonnet-4-6
  // Or explicitly selected model: deepseek-v4-flash, deepseek-v4.1, beam-1.0, agnes-3.0-flash, claude-sonnet-4-6
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
    vyceModel = "deepseek-v4-flash";
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
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
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
 * Universal OpenAI-compatible chat completion caller with automatic fallback
 * if response_format: { type: "json_object" } is not supported by the model/gateway.
 */
export async function callUniversalAi({
  config,
  systemPrompt,
  userPrompt,
  maxTokens = 4000,
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

  const buildBody = (withJsonFormat: boolean) => {
    const body: any = {
      model: config.model,
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

  let response = await fetch(config.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(buildBody(true)),
  });

  // Gracefully fallback if the model/gateway doesn't support response_format: { type: "json_object" }
  if (!response.ok) {
    const errorText = await response.text();
    const isFormatError =
      errorText.toLowerCase().includes("response_format") ||
      errorText.toLowerCase().includes("json_object") ||
      response.status === 400;

    if (isFormatError) {
      console.warn(
        `[${config.providerLabel}] Retrying without response_format due to gateway error: ${errorText.slice(0, 150)}`
      );
      const retryResponse = await fetch(config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(buildBody(false)),
      });

      if (retryResponse.ok) {
        response = retryResponse;
      } else {
        const retryErr = await retryResponse.text();
        throw new Error(
          `[${config.providerLabel}] Request failed (${retryResponse.status}): ${retryErr.slice(0, 300)}`
        );
      }
    } else {
      throw new Error(
        `[${config.providerLabel}] Request failed (${response.status}): ${errorText.slice(0, 300)}`
      );
    }
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error(`[${config.providerLabel}] Returned empty response content.`);
  }

  const cleaned = cleanJsonOutput(rawContent);
  return JSON.parse(cleaned);
}
