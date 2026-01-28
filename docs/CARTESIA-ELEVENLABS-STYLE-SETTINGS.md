# Cartesia STT & TTS – ElevenLabs-Style Optimal Settings

Research from **docs.cartesia.ai** and **docs.elevenlabs.io** mapped onto your existing Cartesia nodes. You keep Cartesia for STT and TTS; no ElevenLabs APIs. This doc gives exact values to put into your N8N Cartesia nodes and what to add/change/delete.

---

## 1. What “ElevenLabs-style” means here

From ElevenLabs docs, their **low-latency / bidirectional** settings are:

- **TTS:** Fastest model (`eleven_flash_v2_5` ~75 ms), compact output (`mp3_22050_32`), latency mode `optimize_streaming_latency=3` or `4`, explicit `language`.
- **STT:** `pcm_16000`, explicit `language_code`, and (in realtime) VAD params for when to “commit” transcripts.

Cartesia has no `optimize_streaming_latency` or `mp3_22050_32`. The mapping is:

- **TTS:** Use Cartesia’s fastest model (**sonic-turbo** ~40 ms), **MP3** only, explicit **language**, and **generation_config** for speed/volume.
- **STT:** Use recommended model (**ink-whisper**), explicit **language**. Your frontend already does VAD; Cartesia batch has no VAD params. Input stays **16 kHz mono WAV** from your PCM-to-WAV node.

---

## 2. Cartesia TTS node – what to put in

**Node:** The HTTP Request node that calls `https://api.cartesia.ai/tts/bytes` (your “TTS” node).

**Do not add or remove nodes.** Only change this node’s body and headers if needed.

### 2.1 Headers (unchanged)

Keep as you have:

- `Authorization`: `Bearer <your_cartesia_api_key>`
- `Cartesia-Version`: `2025-04-16`
- `Content-Type`: `application/json`

### 2.2 Request body (JSON) – use these values

| Field | Value | Purpose (ElevenLabs-style) |
|-------|--------|----------------------------|
| `model_id` | `"sonic-turbo"` | Fastest Cartesia TTS (~40 ms to first byte). This is the “flash” equivalent. |
| `transcript` | `={{ ($json.textToSpeak && String($json.textToSpeak).trim()) ? $json.textToSpeak : 'No response.' }}` | Same as now: text to speak from “Set textToSpeak”. |
| `voice` | `{ "mode": "id", "id": "95131c95-525c-463b-893d-803bafdf93c4" }` | Keep your current voice ID. |
| `output_format` | `{ "container": "mp3" }` | MP3 only. Cartesia docs say do **not** use `encoding`/`sample_rate` with MP3. |
| `language` | `"en"` | Explicit language, like ElevenLabs’ `language_code`. |
| `generation_config` | `{ "speed": 1, "volume": 1 }` | Normal speed/volume. Use `speed` slightly &gt; 1 (e.g. `1.1`) only if you want faster speech at the cost of a bit of quality. |

Remove from the body (if present):

- `speed` at top level – deprecated; use `generation_config.speed` only.
- `output_format.sample_rate` when container is `"mp3"` – not part of Cartesia’s documented MP3 format.

**Example body you can paste into the TTS node (adjust `transcript` expression if your “Set textToSpeak” output has another name):**

```json
{
  "model_id": "sonic-turbo",
  "transcript": "={{ ($json.textToSpeak && String($json.textToSpeak).trim()) ? $json.textToSpeak : 'No response.' }}",
  "voice": {
    "mode": "id",
    "id": "95131c95-525c-463b-893d-803bafdf93c4"
  },
  "output_format": {
    "container": "mp3"
  },
  "language": "en",
  "generation_config": {
    "speed": 1,
    "volume": 1
  }
}
```

### 2.3 Response handling

Leave as now: response = file/binary, output property = `data`, so “Build TTS response” still sees `item.binary.data`.

---

## 3. Cartesia STT node – what to put in

**Node:** The HTTP Request node that calls `https://api.cartesia.ai/stt` (your “STT” node).

**Do not add or remove nodes.** Only ensure method, URL, headers, and form body match below.

### 3.1 Method and URL

- Method: `POST`
- URL: `https://api.cartesia.ai/stt`

### 3.2 Headers

- `Authorization`: `Bearer <your_cartesia_api_key>`
- `Cartesia-Version`: `2025-04-16`
- `Content-Type`: `multipart/form-data` (or leave N8N to set it when you use form body)

### 3.3 Body (multipart/form-data)

| Form field | Value | Purpose (ElevenLabs-style) |
|------------|--------|----------------------------|
| `file` | binary from previous node | Your audio file. In N8N, “Input Data Field Name” = `data` (from “PCM to WAV” binary output). |
| `model` | `ink-whisper` | Recommended Cartesia STT model; good accuracy and languages. |
| `language` | `en` | Explicit language, like ElevenLabs’ `language_code`. |

Optional (only if you need word-level timestamps):

- `timestamp_granularities[]` = `word`  
  Use only if something downstream needs word timestamps; otherwise omit for slightly simpler, latency-oriented behavior.

### 3.4 Query parameters (optional)

Cartesia batch transcribe accepts optional query params:

- `encoding` – e.g. `pcm_s16le` if you were sending raw PCM. You send **WAV**, so the API decodes the file; you can leave this unset.
- `sample_rate` – e.g. `16000`. Only relevant when using raw PCM. For WAV upload, omit.

So for your current setup (WAV file from “PCM to WAV”), you do **not** need to add any query parameters.

### 3.5 Downstream use of STT output

Keep using `$json.text` (or your existing mapping) as the “user message” into the AI Agent. Cartesia returns `{ "text", "language", "duration", "words?" }`; you already use `text`.

---

## 4. Other nodes – add / change / delete

- **Add:** None. All ElevenLabs-style optimizations are expressed as Cartesia parameter values in your existing STT and TTS nodes.
- **Change:** Only the **TTS** and **STT** nodes as above (body/params). Leave Webhook, If, PCM to WAV, Set textToSpeak, Build TTS response, Respond to Webhook, and AI agents as they are.
- **Delete:** None.

---

## 5. Quick reference – Cartesia vs ElevenLabs concepts

| ElevenLabs (docs.elevenlabs.io) | Cartesia (docs.cartesia.ai) – what to use in your nodes |
|----------------------------------|----------------------------------------------------------|
| Model “eleven_flash_v2_5” (low latency) | `model_id`: **"sonic-turbo"** |
| output_format “mp3_22050_32” | `output_format`: **{ "container": "mp3" }** (Cartesia MP3 has no sample_rate/bitrate in API) |
| optimize_streaming_latency 3/4 | No direct equivalent; **sonic-turbo** is Cartesia’s low-latency option |
| language_code “en” | **language**: `"en"` (TTS body) and **language**: `"en"` (STT form) |
| STT pcm_16000, language_code | STT **language** `"en"`; input remains 16 kHz mono WAV from your PCM-to-WAV logic |
| STT VAD (realtime) | Handled in your frontend; Cartesia batch has no VAD params |

---

## 6. Checklist

- [ ] **TTS node**  
  - Body: `model_id` = `"sonic-turbo"`, `output_format` = `{ "container": "mp3" }`, `language` = `"en"`, `generation_config` = `{ "speed": 1, "volume": 1 }`.  
  - No top-level `speed`, no `output_format.sample_rate` for MP3.
- [ ] **STT node**  
  - Form: `file` = binary `data`, `model` = `"ink-whisper"`, `language` = `"en"`.  
  - No optional query params unless you specifically need them.
- [ ] **No new nodes**, no nodes removed.
- [ ] **Build TTS response** and **Respond to Webhook** unchanged; they still consume TTS binary `data` and build `{ message, audio: { data, format: "mp3" } }`.

Once these are set, your N8N workflow uses Cartesia with ElevenLabs-style, low-latency-oriented settings end to end.
