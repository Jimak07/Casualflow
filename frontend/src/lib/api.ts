/**
 * Central API configuration for CausalFlow frontend
 * Connects to the standalone backend API server (Render deployment)
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:8000";

export const API_ENDPOINTS = {
  radar: `${API_BASE_URL}/api/radar`,
  synthesize: `${API_BASE_URL}/api/synthesize`,
  storyline: `${API_BASE_URL}/api/storyline`,
  script: `${API_BASE_URL}/api/script`,
  models: `${API_BASE_URL}/api/models`,
  health: `${API_BASE_URL}/health`,
};
