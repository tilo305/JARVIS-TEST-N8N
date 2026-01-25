import { config } from "@/lib/config";

export interface N8NSendPayload {
  message: string;
  timestamp: string;
  audio?: {
    format: string;
    sampleRate: number;
    channels: number;
    data: string;
    size: number;
  };
  attachments?: Array<{ name: string; type: string; size: number; data: string }>;
}

export interface N8NResponse {
  message?: string;
  response?: string;
  text?: string;
  content?: string;
  [key: string]: unknown;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Send a chat message (and optional attachments/audio) to the N8N webhook.
 * Used by ChatContainer as the single bridge to the backend.
 */
export async function sendToN8N(
  message: string,
  attachments?: File[],
  audioData?: ArrayBuffer
): Promise<N8NResponse | string> {
  const payload: N8NSendPayload = {
    message,
    timestamp: new Date().toISOString(),
  };

  if (audioData) {
    payload.audio = {
      format: "pcm_s16le",
      sampleRate: 16000,
      channels: 1,
      data: arrayBufferToBase64(audioData),
      size: audioData.byteLength,
    };
  }

  if (attachments?.length) {
    payload.attachments = await Promise.all(
      attachments.map(async (file) => {
        const buffer = await file.arrayBuffer();
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          data: arrayBufferToBase64(buffer),
        };
      })
    );
  }

  const res = await fetch(config.n8nWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`N8N webhook error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as N8NResponse | string;
  return data;
}

/**
 * Normalize N8N webhook response into a display string for the chat UI.
 */
export function normalizeN8NResponse(raw: N8NResponse | string): string {
  if (typeof raw === "string") return raw;
  if (!raw || typeof raw !== "object")
    return "Processing complete, sir.";
  return (
    (raw.message as string) ??
    (raw.response as string) ??
    (raw.text as string) ??
    (raw.content as string) ??
    JSON.stringify(raw)
  );
}
