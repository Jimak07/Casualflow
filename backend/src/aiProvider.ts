export interface AiProviderConfig {
  provider: "gemini" | "groq" | "openrouter" | "openai";
  providerLabel: string;
  endpoint: string;
  model: string;
  apiKey: string;
}

/**
 * Auto-detects AI Provider based on API key prefix:
 * - AIza... -> Google Gemini (gemini-2.5-flash)
 * - gsk_... -> Groq (llama-3.3-70b-versatile)
 * - sk-or-... -> OpenRouter (meta-llama/llama-3.3-70b-instruct:free)
 * - Otherwise (sk-... etc) -> OpenAI (gpt-4o-mini)
 */
export function detectAiProvider(rawKey?: string): AiProviderConfig | null {
  const apiKey =
    (rawKey && rawKey.trim()) ||
    process.env.UNIVERSAL_AI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  if (!apiKey) return null;

  // 1. Google Gemini (Key starts with AIza)
  if (apiKey.startsWith("AIza")) {
    return {
      provider: "gemini",
      providerLabel: "Google Gemini (gemini-2.5-flash)",
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model: "gemini-2.5-flash",
      apiKey,
    };
  }

  // 2. Groq (Key starts with gsk_)
  if (apiKey.startsWith("gsk_")) {
    return {
      provider: "groq",
      providerLabel: "Groq (llama-3.3-70b-versatile)",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.3-70b-versatile",
      apiKey,
    };
  }

  // 3. OpenRouter (Key starts with sk-or-)
  if (apiKey.startsWith("sk-or-")) {
    return {
      provider: "openrouter",
      providerLabel: "OpenRouter (meta-llama/llama-3.3-70b-instruct:free)",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      apiKey,
    };
  }

  // 4. Standard OpenAI (Key starts with sk- or other OpenAI-compatible key)
  return {
    provider: "openai",
    providerLabel: "OpenAI (gpt-4o-mini)",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    apiKey,
  };
}

/**
 * Strips markdown code blocks (```json ... ```) if present
 */
export function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return cleaned;
}

/**
 * Universal OpenAI-compatible chat completion caller
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
  const requestBody: any = {
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://causalflow.app";
    headers["X-Title"] = "CausalFlow Documentary Intelligence";
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[${config.providerLabel}] Request failed (${response.status}): ${errorText.slice(
        0,
        300
      )}`
    );
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error(`[${config.providerLabel}] Returned empty response content.`);
  }

  const cleaned = cleanJsonOutput(rawContent);
  return JSON.parse(cleaned);
}
