/**
 * Diagnostic Script for CausalFlow Script Studio & AI Pipeline
 * Tests:
 * 1. getActiveApiKey() resolution & provider detection
 * 2. Direct AI completion call to Vyce AI / configured provider (testing active models & fallback)
 * 3. End-to-end POST http://localhost:8000/api/script with a sample cluster
 */

import { getActiveApiKey, getFallbackApiKey } from "./backend/dist/config/keys.js";
import { detectAiProvider, callUniversalAiRawText } from "./backend/dist/aiProvider.js";

console.log("================================================================================");
console.log("             CAUSALFLOW SCRIPT STUDIO & AI PIPELINE DIAGNOSTIC                  ");
console.log("================================================================================");

// ─────────────────────────────────────────────────────────────────────────────
// PART 1: TEST getActiveApiKey() & PROVIDER DETECTION
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[TEST 1] Testing getActiveApiKey() resolution...");

const resolvedKey = getActiveApiKey();
const fallbackKey = getFallbackApiKey();

console.log(`- Resolved Key Prefix: ${resolvedKey.slice(0, 10)}... (Length: ${resolvedKey.length})`);
console.log(`- Fallback Key Base64 Safe Match: ${resolvedKey === fallbackKey ? "YES (using hardcoded Base64 fallback or matching env)" : "Using custom env/body key"}`);

const providerConfig = detectAiProvider({ rawKey: resolvedKey, purpose: "script" });
if (!providerConfig) {
  console.error("❌ FAILED: detectAiProvider returned null!");
  process.exit(1);
}

console.log(`✓ Provider Detected: ${providerConfig.provider.toUpperCase()} (${providerConfig.providerLabel})`);
console.log(`- Endpoint: ${providerConfig.endpoint}`);
console.log(`- Default Script Model: ${providerConfig.model}`);

// ─────────────────────────────────────────────────────────────────────────────
// PART 2: SEND TEST PROMPT TO CONFIGURED AI ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[TEST 2] Sending test prompt to AI endpoint with automatic model fallback...");

try {
  const testStart = Date.now();
  const testRes = await callUniversalAiRawText({
    config: providerConfig,
    systemPrompt: "You are an analytical assistant. Answer in 2 short sentences.",
    userPrompt: "What causes a semiconductor supply chain bottleneck?",
    maxTokens: 150,
  });
  const elapsed = Date.now() - testStart;

  console.log(`✓ AI Call Successful in ${elapsed}ms!`);
  console.log(`- Model Used: ${testRes.usedModel}`);
  console.log(`- Response Snippet:\n  "${testRes.text.trim().replace(/\n+/g, " ")}"`);
} catch (err) {
  console.error("❌ Test prompt failed across all models:", err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 3: TEST END-TO-END POST /api/script WITH SAMPLE CLUSTER
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[TEST 3] Calling POST http://localhost:8000/api/script with a sample news cluster...");

const sampleCluster = {
  id: "test-cluster-semiconductor-shortage",
  title: "Global Semiconductor Equipment Export Restrictions Expand",
  summary: "New multilateral export curbs hit lithography tools, straining chip fabrication timelines across Asia and North America.",
  category: "ai-tech",
  primaryNiche: "ai-tech",
  outlets: ["Reuters", "BBC Tech", "Nikkei Asia", "Financial Times"],
  regions: ["Asia-Pacific", "Europe & UK", "US & Global Finance"],
  consensusBadge: "📡 4 Global Outlets (3 Regions)",
  articles: [
    {
      title: "Semiconductor equipment export controls tighten across suppliers",
      source: "Reuters",
      region: "US & Global Finance",
      link: "https://www.reuters.com/technology",
      snippet: "Advanced photolithography and etching equipment face new licensing requirements, delaying foundry expansion.",
    },
    {
      title: "Chip manufacturers reassess wafer capacity amid tool backlog",
      source: "BBC Tech",
      region: "Europe & UK",
      link: "https://www.bbc.com/news/technology",
      snippet: "Foundries report equipment delivery delays stretching past eighteen months.",
    },
    {
      title: "Asian chipmakers accelerate domestic supply alternatives",
      source: "Nikkei Asia",
      region: "Asia-Pacific",
      link: "https://asia.nikkei.com",
      snippet: "Regional supply networks seek non-restricted component substitutes.",
    },
  ],
};

try {
  const reqStart = Date.now();
  const scriptResponse = await fetch("http://localhost:8000/api/script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cluster: sampleCluster,
      format: "short", // Test with shorts first for quick diagnostic verification
    }),
  });

  const status = scriptResponse.status;
  console.log(`- HTTP Status Code: ${status}`);

  const rawJson = await scriptResponse.json();
  const totalElapsed = Date.now() - reqStart;

  if (rawJson.success) {
    console.log(`✓ /api/script Succeeded in ${totalElapsed}ms!`);
    console.log(`- Provider / Model: ${rawJson.provider} / ${rawJson.model}`);
    console.log(`- Sections Generated: ${rawJson.count}`);
    console.log(`- Meta Vehicle: ${rawJson.meta?.vehicle || "N/A"}`);
    console.log(`- Meta Mechanism: ${rawJson.meta?.mechanism || "N/A"}`);
    console.log(`- Scraped Articles Count: ${rawJson.briefingPack?.scrapedCount || 0}`);
    console.log(`- Total Voiceover Words: ${rawJson.fullVoiceover.split(/\s+/).filter(Boolean).length}`);
    console.log(`\n--- SAMPLE GENERATED VOICEOVER SAMPLE ---`);
    console.log(rawJson.fullVoiceover.slice(0, 350) + "...\n-----------------------------------------");
  } else {
    console.error(`❌ /api/script returned error:`, rawJson);
  }
} catch (fetchErr) {
  console.error("❌ Failed to reach /api/script:", fetchErr.message);
}

console.log("\n================================================================================");
console.log("                     DIAGNOSTIC COMPLETE                                        ");
console.log("================================================================================");
