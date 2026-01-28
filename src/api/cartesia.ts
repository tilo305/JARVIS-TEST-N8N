/**
 * Cartesia TTS – used for the "still here" prompt so it uses the same voice as N8N replies.
 * In dev: uses Vite proxy /api/cartesia-tts (API key stays server-side, no CORS).
 * In prod: calls Cartesia from the client when VITE_CARTESIA_API_KEY is set (may hit CORS).
 */

const CARTESIA_URL = "https://api.cartesia.ai/tts/bytes";
const CARTESIA_VERSION = "2025-04-16";
const DEFAULT_MODEL = "sonic-turbo";
const DEFAULT_VOICE_ID = "95131c95-525c-463b-893d-803bafdf93c4";
const DEFAULT_SPEED = 1.05;

/** In dev we use the Vite proxy; no API key is sent from the client. */
const USE_PROXY = typeof import.meta !== "undefined" && !!import.meta.env?.DEV;

function getCartesiaConfig() {
  const env = import.meta.env as Record<string, unknown>;
  const key = (env?.VITE_CARTESIA_API_KEY as string)?.trim() || null;
  const model = (env?.VITE_CARTESIA_TTS_MODEL as string)?.trim() || DEFAULT_MODEL;
  const voiceId = (env?.VITE_CARTESIA_VOICE_ID as string)?.trim() || DEFAULT_VOICE_ID;
  const speed = Number((env?.VITE_CARTESIA_TTS_SPEED as string) ?? DEFAULT_SPEED) || DEFAULT_SPEED;
  return { key, model, voiceId, speed };
}

/**
 * Fetch Cartesia TTS audio for the given text.
 * In dev: POST to /api/cartesia-tts (Vite proxy adds API key server-side).
 * In prod: POST to Cartesia when VITE_CARTESIA_API_KEY is set; otherwise null.
 * Returns MP3 bytes or null if the request fails or no key (prod only).
 */
export async function fetchCartesiaTts(text: string): Promise<ArrayBuffer | null> {
  const t = text?.trim();
  if (!t) return null;

  if (USE_PROXY) {
    try {
      const res = await fetch("/api/cartesia-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: t }),
      });
      if (!res.ok) return null;
      return res.arrayBuffer();
    } catch {
      return null;
    }
  }

  const { key, model, voiceId, speed } = getCartesiaConfig();
  if (!key) return null;

  try {
    const res = await fetch(CARTESIA_URL, {
      method: "POST",
      headers: {
        "Cartesia-Version": CARTESIA_VERSION,
        "X-API-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: model,
        transcript: t,
        voice: { mode: "id" as const, id: voiceId },
        output_format: { container: "mp3" as const },
        language: "en",
        generation_config: { speed, volume: 1 },
      }),
    });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}
