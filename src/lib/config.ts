/**
 * App config – WebSocket version only.
 * The N8N webhook URL is configured in the websocket-proxy service.
 * Frontend only needs the WebSocket proxy URL.
 */

const metaEnv = typeof import.meta !== "undefined" && 'env' in import.meta
  ? (import.meta as { env?: Record<string, unknown> }).env
  : undefined;
const env = metaEnv || {};

// WebSocket proxy URL (required for WebSocket version)
const wsUrl = env?.VITE_WEBSOCKET_PROXY_URL;
const websocketProxyUrl = typeof wsUrl === "string" ? wsUrl.trim() : undefined;

export const config = {
  /** WebSocket proxy URL for streaming mode. Required for WebSocket version. */
  websocketProxyUrl: websocketProxyUrl,
} as const;

// Log configuration on startup (development only) - defer to avoid blocking
if (import.meta.env.DEV && !import.meta.env.VITEST) {
  // Use setTimeout to ensure logging doesn't block initialization
  setTimeout(() => {
    console.log("🔧 [JARVIS] WebSocket configuration:", {
      websocketProxyUrl: config.websocketProxyUrl || "not set",
      environment: import.meta.env.MODE,
    });
    
    if (!config.websocketProxyUrl) {
      console.warn("⚠️ VITE_WEBSOCKET_PROXY_URL is not set. WebSocket connection will fail.");
    }
  }, 0);
}
