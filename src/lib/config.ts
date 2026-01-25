/**
 * App config – env-backed, used by API and chat.
 * Optional: set VITE_N8N_WEBHOOK_URL in .env to override the default webhook.
 */

const env = import.meta.env;
const url = env?.VITE_N8N_WEBHOOK_URL;
const trimmed = typeof url === "string" ? url.trim() : "";

export const config = {
  /** N8N webhook URL for JARVIS chat. */
  n8nWebhookUrl:
    trimmed ||
    "https://n8n.hempstarai.com/webhook/170d9a22-bac0-438c-9755-dc79b961d36e",
} as const;
