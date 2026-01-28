# Optimal Cartesia STT + TTS Setup for Bidirectional Voice with N8N

This document recommends the **best Cartesia STT/TTS configuration** for **bidirectional conversational flow** between the JARVIS frontend and your N8N workflow. It’s based on [docs.cartesia.ai](https://docs.cartesia.ai) and [docs.n8n.io](https://docs.n8n.io).

---

## 1. Architecture Overview

### Constraint: N8N is request–response

- The frontend sends **one HTTP POST** per user turn (text and/or voice).
- N8N runs the workflow and **returns a single response**.
- There is no long-lived WebSocket between frontend and N8N in the current design.

So we optimize for **turn-based conversation**:

1. **User** speaks → VAD detects end of utterance → frontend sends **audio + optional text** to N8N.
2. **N8N** runs: STT → LLM → TTS → returns **text + audio**.
3. **Frontend** displays the reply and **plays TTS audio**.

### Why not Cartesia streaming (WebSocket/SSE)?

- Cartesia’s **WebSocket** STT/TTS give the lowest latency and best real-time feel ([Compare TTS Endpoints](https://docs.cartesia.ai/api-reference/tts/compare-tts-endpoints)).
- N8N’s **Webhook** is HTTP only. Streaming webhooks exist but require specific trigger setup and streaming-capable nodes.
- Using **Bytes (TTS)** and **Batch STT** keeps everything inside N8N, no extra services. For many voice UIs this is enough; you can add a separate WebSocket proxy later if you need true streaming.

---

## 2. Recommended Cartesia Configuration

### 2.1 STT: Batch `POST /stt` (Ink-Whisper)

| Setting | Value | Rationale |
|--------|--------|-----------|
| **Endpoint** | `POST https://api.cartesia.ai/stt` | [Batch STT](https://docs.cartesia.ai/api-reference/stt/transcribe): upload file, get full transcript. Fits N8N’s request–response model. |
| **Model** | `ink-whisper` | [STT Models](https://docs.cartesia.ai/build-with-cartesia/stt-models): good accuracy, supports 99+ languages, robust to noise/accents. |
| **Input** | **WAV** file, 16 kHz, mono, 16‑bit PCM | Cartesia supports `wav` ([supported formats](https://docs.cartesia.ai/api-reference/stt/transcribe)). Your frontend already produces **16 kHz mono PCM S16LE**; wrap it in a WAV header. |
| **Form fields** | `file`, `model`, `language` | Use `language` (e.g. `en`) for better accuracy. |
| **Optional** | `timestamp_granularities[]=word` | Word-level timestamps if you need them later. |

**Headers:** `Authorization: Bearer <api_key>`, `Cartesia-Version: 2025-04-16`.

### 2.2 TTS: Bytes `POST /tts/bytes` (Sonic)

| Setting | Value | Rationale |
|--------|--------|-----------|
| **Endpoint** | `POST https://api.cartesia.ai/tts/bytes` | [Bytes API](https://docs.cartesia.ai/api-reference/tts/bytes): full audio in one response. Use for “generate once, return as file”. |
| **Model** | `sonic-3` or `sonic-turbo` | `sonic-3`: best quality, ~90 ms to first byte. `sonic-turbo`: ~40 ms, lower latency ([TTS Models](https://docs.cartesia.ai/build-with-cartesia/tts-models)). |
| **Voice** | e.g. **Katie** or **Kiefer** | [Voice selection](https://docs.cartesia.ai/build-with-cartesia/tts-models): stable voices recommended for voice agents. |
| **Output** | **MP3** | `output_format: { "container": "mp3" }` only. Do **not** use `encoding`/`sample_rate` with MP3. MP3 is compact and plays widely in browsers. |
| **Language** | `en` (or your UI language) | Match your assistant language. |

**Headers:** `Authorization: Bearer <api_key>`, `Cartesia-Version: 2025-04-16`, `Content-Type: application/json`.

**Example TTS request body:**

```json
{
  "model_id": "sonic-3",
  "transcript": "{{ $json.llmReply }}",
  "voice": { "mode": "id", "id": "f786b574-daa5-4673-aa0c-cbe3e8534c02" },
  "output_format": { "container": "mp3" },
  "language": "en"
}
```

Use `sonic-turbo` and optionally `generation_config` (e.g. `speed`, `volume`) if you need finer control ([Capability guides](https://docs.cartesia.ai/build-with-cartesia/capability-guides/volume-speed-emotion)).

---

## 3. Frontend → N8N Payload (Keep Current)

Your app already sends ([`n8n.ts`](https://github.com/tilo305/JARVIS-TEST-N8N/blob/main/src/api/n8n.ts)):

```json
{
  "message": "optional text or context",
  "timestamp": "2025-01-25T...",
  "audio": {
    "format": "pcm_s16le",
    "sampleRate": 16000,
    "channels": 1,
    "data": "<base64-encoded-pcm>",
    "size": 12345
  }
}
```

- **Voice:** VAD ends → capture 48 kHz → resample to **16 kHz**, convert to **PCM S16LE** → base64 in `audio.data`.
- **Text-only:** Omit `audio`; use `message` as user input.

No change needed on the frontend send side. The important part is **N8N and Cartesia** using the same format (WAV 16 kHz mono from this PCM).

---

## 4. N8N Workflow Structure

**Import ready-made:** An importable workflow is in [`workflows/jarvis-cartesia-voice.json`](../workflows/jarvis-cartesia-voice.json). Import via n8n → Import from File, then add **Cartesia API** and **OpenAI API** (Header Auth) credentials. See [workflows/README.md](../workflows/README.md).

Use a **Webhook** trigger and **Respond to Webhook** for the reply ([Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook), [Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook)).

### 4.1 Webhook node

- **HTTP Method:** `POST`
- **Path:** your webhook path (e.g. `/webhook/jarvis-voice`)
- **Respond:** **Using 'Respond to Webhook' Node**
- **Raw Body:** enabled so you receive JSON with `message`, `audio`, etc.

### 4.2 High-level flow

1. **Parse body**  
   Read `body.message`, `body.audio` (and `body.audio.data` if present).

2. **If `body.audio` exists: STT**
   - **Code node:** Decode `body.audio.data` (base64) → PCM → **WAV** (see §5.1). Output binary `data`.
   - **HTTP Request – Cartesia STT:**
     - **URL:** `POST https://api.cartesia.ai/stt`
     - **Headers:** `Authorization: Bearer <api_key>`, `Cartesia-Version: 2025-04-16`
     - **Body:** Form-Data:
       - **Parameter 1:** Type **n8n Binary File**, Name `file`, Input Data Field Name `data`
       - **Parameter 2:** Type **Form Data**, Name `model`, Value `ink-whisper`
       - **Parameter 3:** Type **Form Data**, Name `language`, Value `en`
     - Optional: add form field `timestamp_granularities[]` = `word` for word timestamps.
   - Use the Cartesia response `text` as **user transcript** for the LLM.

3. **If no audio**
   - Use `body.message` as **user transcript**. Skip the PCM→WAV Code node and Cartesia STT; feed `message` directly into the LLM step. Use an **IF** or **Switch** node to branch on `body.audio != null` if you prefer.

4. **LLM**
   - Input: transcript + conversation history (from workflow logic or store).
   - Output: **reply text** (e.g. `llmReply`).

5. **TTS – Cartesia Bytes**
   - **HTTP Request:**
     - **URL:** `POST https://api.cartesia.ai/tts/bytes`
     - **Headers:** `Authorization: Bearer {{ $env.CARTESIA_API_KEY }}`, `Cartesia-Version: 2025-04-16`, `Content-Type: application/json`
     - **Body:** JSON as in §2.2, with `transcript` = `{{ $json.llmReply }}`
     - **Response Format:** **File** (so the MP3 is in binary).

6. **Prepare webhook response**
   - **Code node:** Read TTS binary, base64-encode. Build:
     ```json
     {
       "message": "{{ $json.llmReply }}",
       "audio": {
         "data": "<base64-mp3>",
         "format": "mp3"
       }
     }
     ```

7. **Respond to Webhook**
   - **Respond With:** **JSON**
   - **Response Body:** the object above (from Code node output).

---

## 5. N8N Implementation Details

### 5.1 WAV from PCM in Code node

Use a **Code** node to convert base64 PCM → WAV binary. Input: webhook body with `audio.data`. Output: binary `data` for the Cartesia STT HTTP Request (Form-Data, n8n Binary File, field `file`).

```javascript
// N8N Code node: PCM base64 → WAV binary (run as "Run Once for All Items" or per item)
const item = $input.first();
const body = item.json.body || item.json;
const audio = body?.audio;
if (!audio?.data) return [{ json: { ...body, transcript: body?.message || '' } }];

const pcm = Buffer.from(audio.data, 'base64');
const sampleRate = 16000;
const channels = 1;
const bitsPerSample = 16;
const byteRate = sampleRate * channels * (bitsPerSample / 8);
const dataSize = pcm.length;
const fileSize = 36 + dataSize;

const header = Buffer.alloc(44);
let offset = 0;
header.write('RIFF', offset); offset += 4;
header.writeUInt32LE(fileSize, offset); offset += 4;
header.write('WAVE', offset); offset += 4;
header.write('fmt ', offset); offset += 4;
header.writeUInt32LE(16, offset); offset += 4;
header.writeUInt16LE(1, offset); offset += 2;
header.writeUInt16LE(channels, offset); offset += 2;
header.writeUInt32LE(sampleRate, offset); offset += 4;
header.writeUInt32LE(byteRate, offset); offset += 4;
header.writeUInt16LE((bitsPerSample / 8) * channels, offset); offset += 2;
header.writeUInt16LE(bitsPerSample, offset); offset += 2;
header.write('data', offset); offset += 4;
header.writeUInt32LE(dataSize, offset);

const wav = Buffer.concat([header, pcm]);
const data = await this.helpers.prepareBinaryData(wav, 'audio.wav');

return [{ json: { ...body }, binary: { data } }];
```

- Use **Run Once for All Items** if you have a single webhook payload.
- The next **HTTP Request** node (Cartesia STT): **Body** → Form-Data → **n8n Binary File** → Name `file`, **Input Data Field Name** `data`.
- If `body.audio` is missing, return `body.message` as `transcript` and skip STT (text-only turn).

### 5.2 Cartesia credentials in N8N

- Store the Cartesia API key securely (e.g. **n8n credentials** or `CARTESIA_API_KEY` env).
- Use **Header Auth** or **Custom Auth** in the HTTP Request nodes so the key is never logged.

### 5.3 HTTP Request – TTS response as file

- In the **TTS** HTTP Request node, set **Response → Response Format** to **File** and **Put Output in Field** to e.g. `data`.
- The next Code node reads `$binary.data` (or equivalent), base64-encodes it, and puts it in `audio.data`.

---

## 6. Frontend: Handling the N8N Response

### 6.1 Contract

N8N returns JSON like:

```json
{
  "message": "Your reply text...",
  "audio": {
    "data": "<base64-encoded-mp3>",
    "format": "mp3"
  }
}
```

- **Display:** use `message` for the chat UI (or fallback to `response` / `text` / `content` if you keep compatibility).
- **Playback:** decode `audio.data` → `Blob` with `type: "audio/mpeg"` → `URL.createObjectURL` → `<audio src={url} />` or `Audio` API.

### 6.2 Changes in your app

- **`n8n.ts`:**  
  - Extend `N8NResponse` with `audio?: { url?: string; data?: string; format?: string }`.  
  - Add `extractAudioFromResponse(raw)` that returns either `audio.url` or an object URL from `audio.data` + `audio.format`.

- **`ChatMessage` / `ChatContainer`:**  
  - Use `extractAudioFromResponse` and add a **play** button (or auto-play) for assistant messages when `audio` is present.  
  - Remove or repurpose client-side TTS (Web Speech API) for assistant replies; TTS comes from N8N/Cartesia.

---

## 7. Latency and Quality Tips

| Area | Recommendation |
|------|----------------|
| **TTS model** | Use `sonic-turbo` if first-byte latency matters more than peak quality. |
| **Voice** | Use **Katie** or **Kiefer** (or other [recommended](https://docs.cartesia.ai/build-with-cartesia/tts-models) voice-agent voices). |
| **VAD** | Keep your current silence threshold and min-speech duration so turns are neither too short nor too long. |
| **N8N** | Minimal nodes between Webhook and Respond to Webhook; avoid heavy external calls in the hot path. |
| **Hosting** | Run N8N and Cartesia in the same region if possible to reduce network RTT. |

---

## 8. End-to-End Bidirectional Flow (Summary)

```
[User speaks] → VAD end
    → Frontend: PCM 16kHz mono → base64 in audio.data
    → POST /webhook/jarvis-voice { message?, audio }

[N8N]
    → Decode audio → WAV
    → Cartesia STT (ink-whisper) → transcript
    → LLM(transcript + history) → reply text
    → Cartesia TTS Bytes (sonic-3, MP3) → binary MP3
    → Base64 MP3 + message → Respond to Webhook

[Frontend]
    → Receive { message, audio: { data, format: "mp3" } }
    → Show message, play audio (object URL from base64)
```

---

## 9. Quick reference

| | **STT (Cartesia)** | **TTS (Cartesia)** |
|---|-------------------|---------------------|
| **Endpoint** | `POST /stt` | `POST /tts/bytes` |
| **Model** | `ink-whisper` | `sonic-3` or `sonic-turbo` |
| **Input** | WAV 16 kHz mono (from PCM base64) | JSON `transcript` + `voice` + `output_format` |
| **Output** | JSON `{ text, language, duration, words? }` | Binary MP3 |
| **N8N** | Form-Data `file` + `model` + `language` | JSON body; response as **File** |

---

## 10. Verification

After you deploy the workflow, use the [Verification checklist](./VERIFICATION.md):

1. **Webhook:** `npm run test:webhook` must exit `0`.
2. **Frontend:** `npm run dev` → send a message → you should see a reply and, if the workflow returns `audio`, a play button.

---

## 11. References

- **Cartesia:** [Overview](https://docs.cartesia.ai), [TTS Bytes](https://docs.cartesia.ai/api-reference/tts/bytes), [TTS Compare](https://docs.cartesia.ai/api-reference/tts/compare-tts-endpoints), [STT Batch](https://docs.cartesia.ai/api-reference/stt/transcribe), [STT Streaming](https://docs.cartesia.ai/api-reference/stt/stt), [TTS Models](https://docs.cartesia.ai/build-with-cartesia/tts-models), [STT Models](https://docs.cartesia.ai/build-with-cartesia/stt-models).
- **N8N:** [Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook), [Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook), [HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest), [Workflow development](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/workflow-development).
- **Project:** [CARTESIA_DOCS_RESEARCH.md](./CARTESIA_DOCS_RESEARCH.md), [n8n API](../../src/api/n8n.ts), [useAudioRecorder](../../src/hooks/useAudioRecorder.ts).

---

*This setup optimizes for **turn-based**, **N8N-centered** voice conversation using Cartesia batch STT and Bytes TTS. For fully streaming, low-latency flows you’d need a separate WebSocket service (e.g. frontend ↔ Cartesia or a small proxy) outside this N8N webhook path.*
