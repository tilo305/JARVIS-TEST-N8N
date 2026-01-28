import { config } from "@/lib/config";

/**
 * Check if the N8N webhook is reachable and responding.
 * Returns true if the webhook is accessible, false otherwise.
 * Note: CORS errors will return false, but the webhook may still be functional.
 */
export async function checkN8NConnection(): Promise<boolean> {
  // Validate webhook URL is configured
  if (!config.n8nWebhookUrl || config.n8nWebhookUrl.trim().length === 0) {
    console.error("❌ N8N webhook URL is not configured");
    return false;
  }

  try {
    console.log("🔍 Checking N8N webhook connection:", config.n8nWebhookUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for health check
    
    // Try a minimal POST request (OPTIONS often fails due to CORS)
    const res = await fetch(config.n8nWebhookUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
      },
      body: JSON.stringify({ message: "health_check", timestamp: new Date().toISOString() }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const isConnected = res.ok || res.status < 500;
    if (isConnected) {
      console.log("✅ N8N webhook is reachable (status:", res.status, ")");
    } else {
      console.warn("⚠️ N8N webhook returned error status:", res.status, res.statusText);
    }
    
    return isConnected;
  } catch (error) {
    // CORS errors are expected in development - webhook may still work for actual requests
    if (error instanceof Error && error.message.includes("CORS")) {
      console.warn("⚠️ CORS error during health check (this may be normal in development)");
      // Return true optimistically - the actual request might work via proxy
      return true;
    }
    
    // Network errors
    if (error instanceof TypeError && (error.message.includes("Failed to fetch") || error.message.includes("NetworkError"))) {
      console.error("❌ Network error: Unable to reach N8N webhook. Check your connection and server status.");
      return false;
    }
    
    // Timeout errors
    if (error instanceof Error && error.name === "AbortError") {
      console.error("❌ Connection timeout: N8N webhook did not respond within 5 seconds");
      return false;
    }
    
    console.error("❌ Error checking N8N connection:", error);
    return false;
  }
}

/** Intent used for Agentic Routing: n8n can branch on this. */
export type N8NIntent = "booker" | "info" | "general";

export interface N8NSendPayload {
  message: string;
  timestamp: string;
  /** Optional intent (Routing pattern). When set, n8n can branch without an LLM classifier. */
  intent?: N8NIntent;
  /** Optional session ID so n8n can load chat memory / conversation history (see docs/JARVIS-MEMORY-RAG-SUBAGENT-N8N.md). */
  sessionId?: string;
  audio?: {
    format: string;
    sampleRate: number;
    channels: number;
    data: string;
    size: number;
  };
  attachments?: Array<{ name: string; type: string; size: number; data: string }>;
}

export interface N8NAudio {
  /** Direct URL to play (optional). */
  url?: string;
  /** Base64-encoded audio bytes (e.g. from N8N/Cartesia TTS). */
  data?: string;
  /** Format hint for playback. TTS returns "mp3"; default "mp3" → audio/mpeg. */
  format?: string;
}

export interface N8NResponse {
  message?: string;
  response?: string;
  text?: string;
  content?: string;
  /** Transcription of user's audio input (from STT). */
  transcript?: string;
  userMessage?: string;
  /** TTS audio from N8N: url (optional) or base64 data + format. */
  audio?: N8NAudio;
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

/** Keyword-based intent for Agentic Routing. n8n can branch on $json.body.intent. Exported for tests. */
export function classifyIntent(text: string): N8NIntent {
  if (!text || typeof text !== "string") return "general";
  const lower = text.trim().toLowerCase();
  if (!lower) return "general";
  const booking =
    /\b(book|booking|reserve|reservation|flight|hotel|ticket|rent|rental)\b/.test(lower) ||
    /\b(fly|train|car\s*hire)\b/.test(lower);
  if (booking) return "booker";
  return "info";
}

/**
 * Options for sendToN8N (Voice Bot Design S17: allow cancel/escape).
 */
export interface SendToN8NOptions {
  /** Max retries for transient failures. Default 2. */
  retries?: number;
  /** Optional AbortSignal to cancel the request (e.g. user clicks Cancel). */
  signal?: AbortSignal;
  /** Optional session ID so n8n can load chat memory / conversation history. */
  sessionId?: string;
}

/**
 * Send a chat message (and optional attachments/audio) to the N8N webhook.
 * Used by ChatContainer as the single bridge to the backend.
 * Includes retry logic for transient failures.
 * Supports optional AbortSignal for cancel (S17: allow users to exit).
 */
export async function sendToN8N(
  message: string,
  attachments?: File[],
  audioData?: ArrayBuffer,
  retriesOrOptions: number | SendToN8NOptions = 2
): Promise<N8NResponse | string> {
  const options: SendToN8NOptions =
    typeof retriesOrOptions === "object" ? retriesOrOptions : { retries: retriesOrOptions };
  const retries = options.retries ?? 2;
  const userSignal = options.signal;
  // Validate webhook URL is configured
  if (!config.n8nWebhookUrl || config.n8nWebhookUrl.trim().length === 0) {
    throw new Error("N8N webhook URL is not configured. Please check your configuration.");
  }

  // Must have message text, audio, or attachments
  const hasContent =
    (message != null && message.trim().length > 0) ||
    (attachments != null && attachments.length > 0) ||
    (audioData != null && audioData.byteLength > 0);
  if (!hasContent) {
    throw new Error("Message cannot be empty");
  }

  const trimmedMessage = (message ?? "").trim();
  const payload: N8NSendPayload = {
    message: trimmedMessage,
    timestamp: new Date().toISOString(),
  };
  if (trimmedMessage) {
    payload.intent = classifyIntent(trimmedMessage);
  }
  if (options.sessionId?.trim()) {
    payload.sessionId = options.sessionId.trim();
  }

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

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Log attempt details
      if (attempt > 0) {
        console.log(`🔄 Retrying N8N webhook request (attempt ${attempt + 1}/${retries + 1})...`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      const abortCleanup = userSignal
        ? () => {
            userSignal.removeEventListener("abort", onUserAbort);
          }
        : () => {};
      const onUserAbort = () => {
        controller.abort();
        abortCleanup();
      };
      if (userSignal) {
        if (userSignal.aborted) {
          clearTimeout(timeoutId);
          throw new Error("Request was cancelled");
        }
        userSignal.addEventListener("abort", onUserAbort);
      }

      try {
        console.log(`📤 Sending request to N8N webhook: ${config.n8nWebhookUrl}`, {
          hasMessage: !!(message ?? "").trim(),
          hasAudio: !!audioData,
          audioSizeKb: audioData ? Math.round(audioData.byteLength / 1024) : 0,
        });
        
        const res = await fetch(config.n8nWebhookUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        abortCleanup();

      // Log response status and headers for debugging
      console.log('📡 N8N webhook response:', {
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get("content-type"),
        contentLength: res.headers.get("content-length"),
        headers: Object.fromEntries(res.headers.entries()),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        console.error('❌ N8N webhook error:', {
          status: res.status,
          statusText: res.statusText,
          errorText,
        });
        
        // Parse N8N error response to extract helpful hints
        let parsedError: { code?: number; message?: string } | null = null;
        try {
          if (errorText) {
            parsedError = JSON.parse(errorText);
          }
        } catch {
          // Not JSON, use as-is
        }
        
        // Special handling for 404 - webhook not registered (test mode)
        if (res.status === 404) {
          const hint = parsedError?.message || errorText;
          const isTestModeHint = hint?.includes("Execute workflow") || hint?.includes("test mode");
          
          if (isTestModeHint) {
            throw new Error(
              `N8N webhook is not active. The workflow is in test mode and needs to be activated.\n\n` +
              `To fix this:\n` +
              `1. Open your N8N workflow in the editor\n` +
              `2. Click the "Execute workflow" button on the canvas\n` +
              `3. Then try sending a message again\n\n` +
              `Note: In test mode, the webhook only works for one call after clicking Execute. ` +
              `For production use, activate the workflow permanently.`
            );
          }
          
          throw new Error(
            `N8N webhook not found (404). The webhook "${config.n8nWebhookUrl}" is not registered or the workflow is not active.\n\n` +
            `Please verify:\n` +
            `- The workflow is activated in N8N\n` +
            `- The webhook URL is correct\n` +
            `- If in test mode, click "Execute workflow" first`
          );
        }
        
        // For other errors, include the parsed message if available
        const errorMessage = parsedError?.message || errorText || res.statusText;
        throw new Error(
          `N8N webhook error (${res.status}): ${errorMessage}`
        );
      }

      // Try to parse response
      let data: N8NResponse | string;
      const contentType = res.headers.get("content-type") || "";
      const responseText = await res.text();
      
      console.log('📦 N8N response body:', {
        length: responseText.length,
        isEmpty: !responseText || responseText.trim().length === 0,
        preview: responseText.slice(0, 200),
        fullText: responseText,
      });
      
      // If response is empty, return helpful message (webhook was called; workflow didn't reply)
      if (!responseText || responseText.trim().length === 0) {
        console.warn("⚠️ N8N webhook returned empty response", {
          status: res.status,
          contentType,
          url: config.n8nWebhookUrl,
          sentAudio: !!audioData,
          audioSize: audioData?.byteLength,
        });
        console.warn(
          "💡 Webhook was called successfully. The workflow is not returning a response. " +
          "Ensure: (1) IF node routes text vs voice (e.g. TRUE when $json.body.text or $json.body.message is not empty → text path; FALSE → STT for voice), " +
          "(2) both paths reach AI → TTS → Build TTS response → Respond to Webhook, " +
          "(3) Respond to Webhook = First Incoming Item, (4) workflow returns JSON with `message`."
        );
        const emptyReply = audioData
          ? "The workflow received your voice message but returned no reply. Ensure your N8N workflow: (1) IF node sends voice (no text) to the FALSE branch → STT, (2) voice path goes STT → AI → … → Respond to Webhook, (3) returns JSON with `message` (and optionally `transcript`), (4) Respond to Webhook is set to **First Incoming Item**."
          : "The workflow received your message but returned no reply. Ensure **Respond to Webhook** is set to **First Incoming Item** and the workflow returns JSON `{ message }` (and optionally `transcript` for voice).";
        return emptyReply;
      }
      
      // Try to parse as JSON if content-type suggests JSON or if text looks like JSON
      const looksLikeJson = responseText.trim().startsWith("{") || responseText.trim().startsWith("[");
      const isJsonContentType = contentType.includes("application/json");
      
      if (isJsonContentType || looksLikeJson) {
        try {
          data = JSON.parse(responseText) as N8NResponse | string;
          console.log("N8N response parsed successfully:", typeof data === "object" ? { ...data, audio: data.audio ? "[audio data present]" : undefined } : data);
        } catch (parseError) {
          console.error("Failed to parse JSON response from N8N:", {
            contentType,
            responsePreview: responseText.slice(0, 200),
            error: parseError instanceof Error ? parseError.message : String(parseError)
          });
          // If JSON parsing fails but we have text, use the text as the message
          if (responseText.trim().length > 0) {
            console.warn("Using response text as fallback message");
            return responseText.trim();
          }
          throw new Error(
            `Invalid JSON response from N8N webhook. Response preview: ${responseText.slice(0, 100)}`
          );
        }
      } else {
        // Not JSON, use text as-is
        console.log("N8N returned non-JSON response, using as text");
        data = responseText.trim() || "Processing complete, sir.";
      }

      return data;
      } finally {
        clearTimeout(timeoutId);
        if (userSignal) userSignal.removeEventListener("abort", onUserAbort);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Handle network errors
      if (error instanceof TypeError) {
        if (error.message.includes("CORS")) {
          throw new Error(
            "CORS error: The n8n webhook is blocking requests from this origin. " +
            "Please configure CORS on your n8n server to allow requests from " +
            `${window.location.origin}, or use a proxy server.`
          );
        }
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          // Network errors can be retried
          console.warn(`⚠️ Network error on attempt ${attempt + 1}:`, error.message);
          if (attempt < retries) {
            continue; // Retry network errors
          }
          throw new Error(
            `Network error: Unable to reach N8N webhook at ${config.n8nWebhookUrl}. ` +
            `Please check your internet connection and ensure the N8N server is running.`
          );
        }
      }
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          const cancelled = userSignal?.aborted;
          throw new Error(
            cancelled
              ? "Request was cancelled"
              : "Request timeout: N8N webhook did not respond within 30 seconds"
          );
        }
        // 4xx errors (client errors) shouldn't be retried
        if (error.message.includes("400") || 
            error.message.includes("401") || 
            error.message.includes("403") || 
            error.message.includes("404")) {
          throw error;
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === retries) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError || new Error("Failed to connect to N8N webhook");
}

/**
 * Normalize N8N webhook response into a display string for the chat UI.
 * Handles various response formats and validates the response structure.
 */
export function normalizeN8NResponse(raw: N8NResponse | string): string {
  if (typeof raw === "string") {
    return raw.trim() || "Processing complete, sir.";
  }
  
  if (!raw || typeof raw !== "object") {
    return "Processing complete, sir.";
  }
  
  // Try multiple possible response fields
  const text =
    (raw.message as string) ??
    (raw.response as string) ??
    (raw.text as string) ??
    (raw.content as string);
  
  if (text && typeof text === "string") {
    return text.trim();
  }
  
  // If we have audio but no text, return a default message
  if (raw.audio) {
    return "Audio response received, sir.";
  }
  
  // Log what we received for debugging
  console.warn('⚠️ normalizeN8NResponse: No message field found in response. Available fields:', Object.keys(raw));
  console.warn('⚠️ Full response object:', JSON.stringify(raw, null, 2));
  
  return "Processing complete, sir.";
}

/**
 * Extract the transcription of user's audio input from N8N response.
 * Returns the transcript if available, null otherwise.
 * Checks multiple possible field names that n8n workflows might use.
 */
export function extractTranscriptFromResponse(raw: N8NResponse | string): string | null {
  if (typeof raw !== "object" || !raw) return null;
  
  // Check for transcript fields (common field names n8n workflows might use)
  const transcript =
    (raw.transcript as string) ??
    (raw.userMessage as string) ??
    (raw.user_message as string) ??
    (raw.input as string) ??
    (raw.inputText as string) ??
    (raw.stt_result as string) ??
    (raw.sttResult as string);
  
  if (transcript && typeof transcript === "string" && transcript.trim().length > 0) {
    console.log("Found transcript in n8n response:", transcript);
    return transcript.trim();
  }
  
  // Log available fields for debugging
  console.log("No transcript found in n8n response. Available fields:", Object.keys(raw));
  
  return null;
}

/**
 * Extract a playable audio URL from an N8N response.
 * Playback is MP3: N8N TTS (e.g. Cartesia) returns audio in `audio.data` (base64) with
 * `audio.format === "mp3"`. We default to mp3 when format is missing.
 * Returns either audio.url (if present) or an object URL from audio.data + format.
 * Caller may revoke object URLs when done (URL.revokeObjectURL) to avoid leaks.
 */
export function extractAudioFromResponse(raw: N8NResponse | string): string | null {
  if (typeof raw !== "object" || !raw?.audio) return null;
  const a = raw.audio as N8NAudio;
  if (typeof a.url === "string" && a.url.trim().length > 0) return a.url.trim();
  if (typeof a.data !== "string" || !a.data.trim()) return null;
  try {
    const binary = atob(a.data.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const fmt = (a.format ?? "mp3").toLowerCase();
    const mime = fmt.includes("mp3") || fmt.includes("mpeg") ? "audio/mpeg" : "audio/wav";
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
