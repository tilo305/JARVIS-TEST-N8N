/**
 * App config – env-backed, used by API and chat.
 * Optional: set VITE_N8N_WEBHOOK_URL in .env to override the default webhook.
 */

const env = import.meta.env;
const url = env?.VITE_N8N_WEBHOOK_URL;
const trimmed = typeof url === "string" ? url.trim() : "";

/**
 * Validate that a URL is a valid HTTP/HTTPS URL.
 */
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Single source of truth: N8N webhook URL. */
const N8N_WEBHOOK_URL = "https://n8n.hempstarai.com/webhook/170d9a22-bac0-438c-9755-dc79b961d36e";

// Validate the default webhook URL
if (!isValidWebhookUrl(N8N_WEBHOOK_URL)) {
  throw new Error(`Invalid default N8N webhook URL: ${N8N_WEBHOOK_URL}`);
}

const webhookPath = new URL(N8N_WEBHOOK_URL).pathname;
const defaultWebhook = N8N_WEBHOOK_URL;

// In development, use proxy to avoid CORS issues
const isDevelopment = import.meta.env.DEV;
const useProxy = isDevelopment && !trimmed; // Only use proxy if no custom URL is set

// Determine the webhook URL to use
let webhookUrl: string;
if (useProxy) {
  // Use Vite proxy in development
  webhookUrl = `/api/n8n${webhookPath}`;
} else if (trimmed) {
  // Use custom URL from environment variable
  if (!isValidWebhookUrl(trimmed)) {
    console.error(`Invalid VITE_N8N_WEBHOOK_URL: ${trimmed}. Using default: ${defaultWebhook}`);
    webhookUrl = defaultWebhook;
  } else {
    webhookUrl = trimmed;
  }
} else {
  // Use default webhook URL
  webhookUrl = defaultWebhook;
}

// Final validation
if (!useProxy && !isValidWebhookUrl(webhookUrl)) {
  throw new Error(`Invalid webhook URL format: ${webhookUrl}`);
}

export const config = {
  /** N8N webhook URL for JARVIS chat. Uses proxy in development to avoid CORS. */
  n8nWebhookUrl: webhookUrl,
} as const;

// Log configuration on startup (development only)
if (import.meta.env.DEV && !import.meta.env.VITEST) {
  console.log("🔧 [JARVIS] N8N webhook configuration:", {
    url: config.n8nWebhookUrl,
    usingProxy: useProxy,
    defaultUrl: defaultWebhook,
    customUrl: trimmed || "none",
    environment: import.meta.env.MODE,
  });
  
  // Validate webhook URL format (skip validation for relative proxy URLs)
  if (!useProxy) {
    try {
      const url = new URL(config.n8nWebhookUrl);
      console.log("✅ Webhook URL is valid:", {
        protocol: url.protocol,
        host: url.host,
        pathname: url.pathname,
      });
    } catch (error) {
      console.error("❌ Invalid webhook URL format:", config.n8nWebhookUrl);
    }
  } else {
    console.log("✅ Using proxy URL (relative):", config.n8nWebhookUrl);
  }
}
