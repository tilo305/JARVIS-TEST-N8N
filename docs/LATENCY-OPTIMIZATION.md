# Latency Optimization for JARVIS Voice Chat

## Goal

Minimize time from "user stops speaking" → "user hears assistant reply."

---

## Current Flow (N8N Webhook)

1. **User** → (voice) → **Frontend** (VAD, PCM 16 kHz) → **N8N webhook**
2. **N8N** → STT (Cartesia) → LLM → TTS (Cartesia Bytes) → **Respond to Webhook**
3. **Frontend** ← JSON `{ message, audio: { data, format } }` ← plays via `<audio>` element

Bottlenecks: Cartesia TTS time-to-first-byte, MP3 encoding, and the fact that the whole reply is generated before anything is sent back.

---

## What’s Best for Optimal Latency

### 1. TTS model (largest impact, no architecture change)

| Model          | Time to first byte | Use when                |
|----------------|--------------------|--------------------------|
| **sonic-turbo**| ~40 ms             | Prefer lowest latency   |
| **sonic-3**    | ~90 ms             | Prefer best quality     |
| **sonic-english** | —               | Not in official docs; treat as custom / check against sonic-turbo / sonic-3 |

**Recommendation:** Use **`sonic-turbo`** for lowest latency. Your voice ID stays the same.

**N8N TTS body (optimized for latency):**

```json
{
  "model_id": "sonic-turbo",
  "transcript": "{{ $json.output }}",
  "voice": {
    "mode": "id",
    "id": "95131c95-525c-463b-893d-803bafdf93c4"
  },
  "output_format": {
    "container": "mp3"
  },
  "language": "en"
}
```

---

### 2. TTS output format (Bytes API)

| Format    | Latency / size notes                    | Frontend today   |
|----------|-----------------------------------------|------------------|
| **MP3**  | Extra encode step; smaller payload      | ✅ Supported      |
| **WAV**  | No encode; larger than MP3              | ✅ Supported      |
| **RAW**  | No container/encode; largest            | ❌ Needs PCM path|

**Recommendation:** Stay on **MP3** for now. The frontend already handles it, and the ~50 ms gain from sonic-turbo (vs sonic-3) is bigger than the gain from avoiding MP3 encoding. If you later add RAW PCM playback, you can try `output_format: { container: "raw", encoding: "pcm_s16le", sample_rate: 24000 }` and optimize further.

---

### 3. Endpoint choice (future architecture)

| Endpoint   | Latency characteristics                          | Fits current N8N?   |
|-----------|----------------------------------------------------|----------------------|
| **Bytes** | One shot; you wait for full file                  | ✅ Yes (what you use)|
| **WebSocket TTS** | ~200 ms less connection cost; stream chunks as generated | ❌ Needs different design |
| **SSE TTS**      | Stream raw PCM                                    | ❌ Needs different design |

**Recommendation:** For your current **single webhook request/response**, Bytes + **sonic-turbo** + MP3 is the best tradeoff. For even lower latency later, you’d add a separate streaming path (e.g. WebSocket from frontend to a small service that calls Cartesia WebSocket TTS and streams audio back).

---

## Summary: Best for Optimal Latency Today

1. **Use `sonic-turbo`** instead of `sonic-3` or `sonic-english` in the TTS request body.
2. **Keep `output_format: { "container": "mp3" }`** so the app keeps working as-is.
3. **Keep your voice ID** and other fields; only change `model_id` to `sonic-turbo`.

That gives you roughly **~50 ms faster** time-to-first-byte from TTS with no frontend or N8N structural changes.

Optional later steps:

- In N8N, run TTS as soon as the LLM reply is ready (no extra waits).
- If you add RAW PCM support in the frontend, try TTS with `container: "raw"` and compare end-to-end latency.
