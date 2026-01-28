# Comprehensive Research: docs.cartesia.ai

Summary of Cartesia’s documentation as of the researched pages. Use this alongside the official docs for integration (e.g. N8N, JARVIS).

---

## 1. Overview

- **Base URL:** `https://api.cartesia.ai` (HTTPS only). WebSockets: `wss://api.cartesia.ai`.
- **Product:** Voice AI platform with **TTS (Sonic)** and **STT (Ink)**.
- **TTS:** “Sonic” models — streaming, ultra-low latency, multi-language, voice cloning.
- **STT:** “Ink” models (e.g. Ink-Whisper) — streaming and batch transcription.

---

## 2. Authentication & Headers

### Required Headers (all requests)

| Header | Required | Description |
|--------|----------|-------------|
| `Cartesia-Version` | ✅ | API version date, e.g. `2024-06-10`, `2024-11-13`, `2025-04-16`. Use the version you tested against. |
| `Authorization` | ✅ | `Bearer <api_key>` for server/trusted contexts. |
| `Content-Type` | ✅ for POST | `application/json` for JSON bodies. |

### API keys

- Create keys at **play.cartesia.ai/keys**.
- Use **API keys** only in trusted environments (server, scripts). Never expose them in client apps.

### Access tokens (client apps)

- For **browser / mobile apps**, use **Access Tokens** instead of API keys.
- **Endpoint:** `POST https://api.cartesia.ai/access-token`
- **Headers:** `Authorization: Bearer <api_key>`, `Cartesia-Version`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "grants": { "tts": true, "stt": true, "agent": true },
    "expires_in": 3600
  }
  ```
- **Response:** `{ "token": "<string>" }`
- **Limits:** `expires_in` max **3600** seconds (1 hour).
- **Grants:**
  - `tts`: `/tts/bytes`, `/tts/sse`, `/tts/websocket`
  - `stt`: `/stt`, `/stt/websocket`, `/audio/transcriptions` (OpenAI-compatible)
  - `agent`: Agents WebSocket

**WebSockets:** Use `?api_key=<key>` (server) or `?access_token=<token>` (client). Optional: `?cartesia_version=2025-04-16` instead of header.

---

## 3. TTS (Text-to-Speech)

### 3.1 Endpoints

| Endpoint | Path | Use case |
|----------|------|----------|
| **Bytes** | `POST /tts/bytes` | Generate full audio **ahead of time**. Supports **WAV**, **MP3**, and **raw PCM**. Returns binary (or chunked) audio. |
| **SSE** | `POST /tts/sse` | **Streaming** TTS via Server-Sent Events. Output is **raw PCM** (no WAV/MP3). |
| **WebSocket** | `wss://api.cartesia.ai/tts/websocket` | **Streaming** TTS; lowest latency, input streaming, timestamps, multiplexing. Output is **raw PCM**. |

**When to use which:**

- **Real-time / streaming:** WebSocket (best) or SSE. Both output **raw PCM** only.
- **Ahead-of-time / files (including MP3):** **Bytes** endpoint.

### 3.2 Bytes API – Request (`POST /tts/bytes`)

**Body (JSON):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `model_id` | string | ✅ | e.g. `sonic-3`, `sonic-3-2026-01-12`, `sonic-turbo` |
| `transcript` | string | ✅ | Text to speak. |
| `voice` | object | ✅ | `{ "mode": "id", "id": "<uuid>" }`. Get IDs from [play.cartesia.ai/voices](https://play.cartesia.ai/voices). |
| `output_format` | object | ✅ | **RAWOutputFormat**, **WAVOutputFormat**, or **MP3OutputFormat**. See below. |
| `language` | string | ❌ | e.g. `en`, `fr`, `de`. See [Models](#44-sonic-3-languages). |
| `generation_config` | object | ❌ | `volume`, `speed`, `emotion`. Sonic-3 only. |
| `save` | boolean | ❌ | Default `false`. If `true`, response includes `Cartesia-File-ID` header. |
| `pronunciation_dict_id` | string | ❌ | Sonic-3+ only. |
| `speed` | string | ❌ | Deprecated. Use `generation_config.speed`. `slow` \| `normal` \| `fast`. |

**Response:** Binary audio (content-type `file`). Format depends on `output_format`.

### 3.3 Output formats (Bytes)

**RAW (raw PCM):**

```json
{
  "container": "raw",
  "encoding": "pcm_f32le",
  "sample_rate": 8000
}
```

**WAV:**

```json
{
  "container": "wav",
  "encoding": "pcm_s16le",
  "sample_rate": 44100
}
```

**MP3:**

- **Container:** `mp3`.
- **Encoding / sample_rate:** For MP3, the codec is fixed. Do **not** use `pcm_f32le` or other PCM encodings with `container: "mp3"`.
- **Correct form:**

```json
{
  "container": "mp3"
}
```

- If the API allows extra fields for MP3 (e.g. bitrate), use only what’s documented. The docs we have show **RAW** and **WAV** with `encoding`/`sample_rate`; **MP3** is referenced as its own format (MP3OutputFormat) and used for “batch” use cases.

**Encodings seen in docs:** `pcm_f32le`, `pcm_s16le`.  
**Sample rates seen:** `8000`, `44100`.

### 3.4 TTS models (Sonic)

| Model | Description |
|-------|-------------|
| **sonic-3** | Latest. 42 languages, volume/speed/emotion, `[laughter]` tags. ~90 ms to first byte. |
| **sonic-3-2026-01-12**, **sonic-3-2025-10-27** | Dated snapshots. Stable, pinned behavior. |
| **sonic-3-latest** | Beta; may change. Not for production. |
| **sonic-turbo** | Lower latency (~40 ms first byte). |
| **sonic-2**, **sonic**, **sonic-multilingual** | Older; see [Older Models](https://docs.cartesia.ai/build-with-cartesia/tts-models/older-models). |

**Voice usage:**

- **Voice agents:** Prefer stable, realistic voices (e.g. Katie, Kiefer).
- **Expressive characters:** Use “Emotive” voices (e.g. Tessa, Kyle).

### 3.5 Generation config (Sonic-3)

`generation_config` can include:

- `volume` (default `1`)
- `speed` (default `1`)
- `emotion` (e.g. `neutral`)

See [Volume, Speed, and Emotion](https://docs.cartesia.ai/build-with-cartesia/capability-guides/volume-speed-emotion) (docs).

### 3.6 WebSocket TTS (streaming)

- **URL:** `wss://api.cartesia.ai/tts/websocket`
- **Output:** Raw PCM only (`container: "raw"` + `encoding` + `sample_rate`).
- **Features:** Pre-established connection, input streaming, optional word/phoneme timestamps, multiplexing via `context_id`.
- **Messages:** JSON for config; binary chunks for audio. `chunk`, `flush_done`, `done`, `timestamps`, `error`.

### 3.7 SSE TTS

- **URL:** `POST https://api.cartesia.ai/tts/sse`
- **Output:** Raw PCM stream (no MP3/WAV).
- **Extra options:** `add_timestamps`, `add_phoneme_timestamps`, `use_normalized_timestamps`, `pronunciation_dict_id`, `context_id`.

---

## 4. STT (Speech-to-Text)

### 4.1 Endpoints

| Endpoint | Path | Use case |
|----------|------|----------|
| **Streaming** | `wss://api.cartesia.ai/stt/websocket` | Real-time streaming STT. |
| **Batch** | `POST https://api.cartesia.ai/stt` | Upload file, get full transcription. |

### 4.2 Streaming STT (WebSocket)

- **URL:** `wss://api.cartesia.ai/stt/websocket`
- **Query params:** `model`, `language`, `encoding`, `sample_rate`, `min_volume`, `max_silence_duration_secs`, plus `api_key` or `access_token`.
- **Encoding:** Recommended **`pcm_s16le`**.
- **Sample rate:** Recommended **16000** Hz.
- **Flow:** Send **binary** audio chunks; send **text** commands `finalize` (flush → `flush_done`) and `done` (close → `done`).
- **Responses:** `transcript` (with `text`, `words`, `duration`, `language`), `flush_done`, `done`, `error`.
- **Timeout:** 3 minutes without audio; resets on each message.

### 4.3 Batch STT (`POST /stt`)

- **Content-Type:** `multipart/form-data`
- **Form fields:** `file`, `model`, `language`, `timestamp_granularities[]` (e.g. `word`).
- **Optional query:** `encoding`, `sample_rate` (for raw PCM).
- **Supported formats:** flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm.
- **Response:** `{ "text", "language", "duration", "words": [{ "word", "start", "end" }] }`.
- **Pricing:** 1 credit per 2 seconds of audio (docs).

### 4.4 Ink-Whisper

- **Model ID:** `ink-whisper` or `ink-whisper-2025-06-04`.
- **Characteristics:** Streaming, dynamic chunking, robust to noise/accents/telephony. Many languages.
- **Pricing (streaming):** ~\$0.13/hour (Scale plan).

---

## 5. SDKs & Tools

- **JavaScript/TypeScript:** `@cartesia/cartesia-js`. Used by Cartesia Playground.
- **Python:** `cartesia` (`pip install cartesia` or `uv add cartesia`).
- **Playground / voices:** [play.cartesia.ai](https://play.cartesia.ai) (voices, keys).

---

## 6. Integrations (from docs)

MCP, LiveKit, Pipecat, Rasa, Tencent RTC, Thoughtly, Twilio, Vision Agents by Stream, etc.

---

## 7. N8N + JARVIS – Practical Notes

### TTS (Cartesia → N8N → your app)

1. Use **Bytes** for “generate once, return as file” (e.g. webhook response).
2. Use **`output_format`: `{ "container": "mp3" }`** for web playback. Do **not** mix MP3 with `encoding: "pcm_f32le"`.
3. Send **`transcript`** = actual text to speak (from your AI/LLM step).
4. Return **`{ "message": "<text>", "audio": { "data": "<base64-mp3>", "format": "mp3" } }`** from your webhook. Frontend decodes base64 and plays as `audio/mpeg`.

### STT (your app → N8N → Cartesia)

1. Send raw audio (e.g. **PCM 16 kHz mono**) or a file in a supported format.
2. Use **Ink-Whisper** via **streaming** (WebSocket) or **batch** (`POST /stt`) depending on your N8N flow.

### Auth in N8N

- Use **API key** in `Authorization: Bearer <api_key>`.
- Always set **`Cartesia-Version`** (e.g. `2025-04-16`).

---

## 8. Links (official docs)

- **Overview:** https://docs.cartesia.ai  
- **Get started:** https://docs.cartesia.ai/get-started/overview  
- **Make first request:** https://docs.cartesia.ai/get-started/make-an-api-request  
- **API conventions:** https://docs.cartesia.ai/use-the-api/api-conventions  
- **TTS Bytes:** https://docs.cartesia.ai/api-reference/tts/bytes  
- **TTS SSE:** https://docs.cartesia.ai/api-reference/tts/sse  
- **TTS WebSocket:** https://docs.cartesia.ai/api-reference/tts/tts  
- **Compare TTS endpoints:** https://docs.cartesia.ai/api-reference/tts/compare-tts-endpoints  
- **Sonic 3 / TTS models:** https://docs.cartesia.ai/build-with-cartesia/tts-models  
- **STT streaming:** https://docs.cartesia.ai/api-reference/stt/stt  
- **STT batch:** https://docs.cartesia.ai/api-reference/stt/transcribe  
- **STT models:** https://docs.cartesia.ai/build-with-cartesia/stt-models  
- **Auth (Access Token):** https://docs.cartesia.ai/api-reference/auth/access-token  
- **Client auth:** https://docs.cartesia.ai/get-started/authenticate-your-client-applications  
- **JS SDK:** https://docs.cartesia.ai/use-an-sdk/javascript-typescript  
- **Localize voices:** https://docs.cartesia.ai/build-with-cartesia/capability-guides/localize-voices  

---

*Generated from research on docs.cartesia.ai. Always verify against the latest official documentation.*
