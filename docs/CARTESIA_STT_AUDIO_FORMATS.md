# Cartesia STT – Supported Audio Formats & Frontend Strategy

Based on [docs.cartesia.ai](https://docs.cartesia.ai) (STT Batch API, STT Models). This doc summarizes **supported formats**, recommends a **frontend→N8N→Cartesia** flow that **avoids the PCM→WAV Code node**, and outlines **implementation**.

---

## 1. Cartesia STT Batch API – Supported Formats

**Endpoint:** `POST https://api.cartesia.ai/stt`  
**Content-Type:** `multipart/form-data`  
**Required form field:** `file` (the audio file).

### 1.1 Container formats (files)

Cartesia **decodes these automatically**; no raw PCM or custom encoding needed:

| Format | Typical use |
|--------|-------------|
| **flac** | Lossless, larger |
| **m4a** | AAC in MPEG-4 |
| **mp3** | Common, small |
| **mp4** | Video container, audio track |
| **mpeg**, **mpga** | MPEG audio |
| **oga** | Ogg audio |
| **ogg** | Ogg Vorbis |
| **wav** | Uncompressed PCM in WAV |
| **webm** | WebM (often Opus); **native in browser via MediaRecorder** |

Source: [Speech-to-Text (Batch)](https://docs.cartesia.ai/api-reference/stt/transcribe).

### 1.2 Optional query parameters (raw PCM)

If you send **raw PCM** (not a file), you can use:

- **`encoding`:** `pcm_s16le` \| `pcm_s32le` \| `pcm_f16le` \| `pcm_f32le` \| `pcm_mulaw` \| `pcm_alaw`
- **`sample_rate`:** Hz.

The **Batch** API is built for **file upload** (`multipart/form-data` + `file`). The **Streaming** API uses WebSocket + PCM. For a webhook-based N8N flow, **file upload** is the right fit.

### 1.3 Form fields

- **`file`** (required): audio file (one of the formats above).
- **`model`:** e.g. `ink-whisper`.
- **`language`:** ISO 639-1 (e.g. `en`).
- **`timestamp_granularities[]`:** optional, e.g. `word` for word-level timestamps.

---

## 2. Why avoid PCM→WAV in N8N?

Current flow:

1. Frontend records → **PCM S16LE** (e.g. 16 kHz) → base64 in JSON.
2. N8N webhook receives JSON.
3. **Code node** decodes base64 → builds **WAV** → outputs binary.
4. **HTTP Request** sends that binary as `file` to Cartesia STT.

Cartesia accepts **WAV** (and **WebM**, etc.) **directly**. If the frontend sends a **file** (e.g. WebM or WAV) instead of raw PCM in JSON:

- N8N can forward that **binary** to Cartesia STT as `file`.
- **No PCM→WAV Code node** is needed.

---

## 3. Recommended approach: WebM via MediaRecorder

### 3.1 Why WebM?

- **Supported** by Cartesia STT (`webm` in the list above).
- **Native in the browser:** `MediaRecorder` can record from `MediaStream` to WebM (typically Opus).
- **No extra libraries** or client-side WAV packing.
- Fits **multipart/form-data** upload (send WebM as `file`).

### 3.2 High-level flow

1. **Frontend**
   - Use **MediaRecorder** on the **same** `MediaStream` as the VAD (AudioWorklet).
   - On “speech ended” (VAD) or user stop → `MediaRecorder.stop()` → **WebM Blob**.
   - Send **multipart/form-data** to the N8N webhook:
     - `message` (text)
     - `timestamp` (optional)
     - **`file`** = WebM Blob (e.g. `audio.webm`).

2. **N8N Webhook**
   - **Do not** use “Raw Body” for this request.
   - Enable **Binary Property** (e.g. `data`) so the multipart `file` lands in `$binary.data`.

3. **N8N workflow**
   - **IF** “has audio”: check `$binary.data` (or the property you use) is present.
   - **TRUE** → **Cartesia STT** HTTP Request:
     - Body: **Form-Data**
     - `file` = **n8n Binary File** → **Input Data Field Name** = `data` (same as webhook binary property).
     - `model` = `ink-whisper`, `language` = `en`.
   - **FALSE** (text-only) → use `message` as transcript (e.g. Set node) → same LLM/TTS path.

4. **No PCM→WAV Code node** anywhere.

### 3.3 Alternative: WAV in the frontend

If you prefer **WAV**:

- Keep your current **AudioWorklet** path (Float32 → resample → PCM S16LE).
- In the **browser**, build a **WAV** blob (RIFF header + PCM) and send it as `file` in **multipart**.
- N8N still forwards binary → Cartesia STT. No N8N Code node.

WebM + MediaRecorder is usually simpler (no WAV header code, native API).

---

## 4. Webhook payloads

### 4.1 With audio (multipart)

- **Content-Type:** `multipart/form-data` (browser sets boundary).
- **Form fields:**
  - `message`: string (optional).
  - `timestamp`: string (optional).
  - `file`: WebM (or WAV) **file**; e.g. `audio.webm`.

### 4.2 Text-only (JSON)

- **Content-Type:** `application/json`.
- **Body:** `{ "message": "...", "timestamp": "..." }`.

The **IF** node branches on “has binary” (from multipart `file`) vs “no binary” (JSON-only).

---

## 5. n8n Webhook configuration

- **HTTP Method:** `POST`.
- **Respond:** e.g. **Using 'Respond to Webhook' Node**.
- **Options:**
  - **Binary Property:** e.g. `data` (so the multipart `file` is stored in `$binary.data`).
  - **Raw Body:** **off** for multipart; use **on** only if you also accept JSON and need raw body for that.  
    For a **single** webhook that accepts **either** JSON or multipart, n8n typically parses both; confirm with your n8n version.  
    If you use **two** webhooks (one JSON, one multipart), set each accordingly.

---

## 6. Summary

| Item | Recommendation |
|------|----------------|
| **Cartesia STT input** | **File** in a supported format (e.g. **WebM**, WAV). |
| **Frontend** | **MediaRecorder** → WebM Blob; send as **`file`** in **multipart/form-data**. |
| **N8N webhook** | Receive multipart; **Binary Property** = `data`. |
| **N8N workflow** | IF has `$binary.data` → STT (Form-Data `file` = `data`). Else use `message`. |
| **PCM→WAV Code node** | **Not used.** |

---

## 7. References

- [Cartesia STT Batch – Transcribe](https://docs.cartesia.ai/api-reference/stt/transcribe)
- [Cartesia STT Models](https://docs.cartesia.ai/build-with-cartesia/stt-models)
- [n8n Webhook node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) (Binary Property, options)
