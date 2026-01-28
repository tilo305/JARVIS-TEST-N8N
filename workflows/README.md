# JARVIS + Cartesia N8N Workflows

This folder contains **Code node snippets** and references for the **Cartesia STT + TTS** N8N workflow described in [`../docs/CARTESIA_N8N_OPTIMAL_SETUP.md`](../docs/CARTESIA_N8N_OPTIMAL_SETUP.md).

## Quick links

- **Full setup guide:** [docs/CARTESIA_N8N_OPTIMAL_SETUP.md](../docs/CARTESIA_N8N_OPTIMAL_SETUP.md)
- **Cartesia API reference:** [docs/CARTESIA_DOCS_RESEARCH.md](../docs/CARTESIA_DOCS_RESEARCH.md)
- **IF node: PCM S16LE audio → TRUE → STT** → [IF-PCM-S16LE-AUDIO-TO-STT.md](IF-PCM-S16LE-AUDIO-TO-STT.md) — receive frontend PCM S16LE, detect audio, route to STT.
- **PCM to MP3 Code node** → [PCM-TO-MP3-CODE-NODE.md](PCM-TO-MP3-CODE-NODE.md) — convert PCM S16LE → MP3 (lamejs; [docs.n8n.io](https://docs.n8n.io) aligned).
- **Don’t have “Build TTS response”?** → [BUILD-TTS-RESPONSE-SETUP.md](BUILD-TTS-RESPONSE-SETUP.md) — add the Code node so the webhook returns `{ message, audio: { data, format: "mp3" } }`.

## Files

| File | Purpose |
|------|---------|
| **`jarvis-cartesia-voice.json`** | **Complete n8n workflow** (import and configure credentials) |
| **`IF-PCM-S16LE-AUDIO-TO-STT.md`** | **IF node setup**: receive PCM S16LE, detect audio → TRUE → PCM to WAV → STT |
| `IF_AUDIO_VS_TEXT_SETUP.md` | IF node: audio vs text branching (audio → STT, text → Set transcript) |
| `code-pcm-to-wav.js` | N8N Code node: base64 audio → binary for Cartesia STT (PCM→WAV or MP3 pass-through) |
| **`code-pcm-to-mp3.js`** | N8N Code node: PCM S16LE → MP3 (lamejs; [docs.n8n.io](https://docs.n8n.io) compliant) |
| **`PCM-TO-MP3-CODE-NODE.md`** | Step-by-step: add PCM→MP3 Code node, Enable modules, Execute Command option |
| `code-build-tts-response.js` | N8N Code node: TTS binary + reply text → `{ message, audio }` for Respond to Webhook |

## Import ready-made workflow

1. In n8n: **Menu → Import from File** (or **Import from URL** if you use a raw URL to the JSON).
2. Select **`jarvis-cartesia-voice.json`**.
3. **Create credentials** (if missing):
   - **Cartesia API** (Header Auth): Name `Authorization`, Value `Bearer <your-cartesia-api-key>`.
   - **OpenAI API** (Header Auth): Name `Authorization`, Value `Bearer <your-openai-api-key>`.
4. Assign **Cartesia API** to **Cartesia STT** and **Cartesia TTS**; **OpenAI API** to **OpenAI Chat**.
5. **Webhook**: ensure **Respond** = **Using 'Respond to Webhook' Node** and **Raw Body** is enabled (options). Path is `jarvis-voice` by default.
6. **Save** and **Activate** the workflow. Use the **Production** webhook URL in your app (`VITE_N8N_WEBHOOK_URL` or config).

The workflow implements: Webhook → PCM→WAV (Code) → IF (has audio?) → Cartesia STT (when audio) / skip (when text) → Set transcript → OpenAI Chat → Extract LLM Reply → Cartesia TTS → **Build TTS response (Code)** → Respond to Webhook.

**Input vs output:** The webhook **receives** PCM (or MP3 if the client sends it). The webhook **returns** `{ message, audio: { data, format: "mp3" } }`. The **Build TTS response** (or **Build Response**) Code node is required: it turns TTS binary + reply text into that JSON so the frontend can play audio. If you don’t have it, add it per [BUILD-TTS-RESPONSE-SETUP.md](BUILD-TTS-RESPONSE-SETUP.md).

## Workflow outline (build in n8n UI)

1. **Webhook** (POST, Raw Body, Respond = **Using 'Respond to Webhook' Node**)
2. **IF**: `={{ ($json.body?.audio?.data || $json.audio?.data || $binary?.audio) ? 'yes' : '' }}` **is not empty** → TRUE = has audio (JSON base64 or binary `audio`), FALSE = text only. See [IF-PCM-S16LE-AUDIO-TO-STT.md](IF-PCM-S16LE-AUDIO-TO-STT.md).
3. **Branch with audio (TRUE)**
   - **Code** “PCM to WAV”: paste `code-pcm-to-wav.js` → PCM→WAV or MP3 pass-through, output binary `data`
   - **HTTP Request** Cartesia STT: `POST https://api.cartesia.ai/stt`, Form-Data `file` (n8n Binary `data`), `model=ink-whisper`, `language=en`
   - Use STT `text` as **transcript**
4. **Branch without audio (FALSE)**: use `body.message` (or `$json.body?.message || $json.message`) as **transcript**
5. **Merge** branches → **LLM** (your AI) → reply text, e.g. `llmReply`
6. **HTTP Request** Cartesia TTS: `POST https://api.cartesia.ai/tts/bytes`, JSON body, **Response Format = File**, output `data`
7. **Code** “Build TTS response”: paste `code-build-tts-response.js` → `{ message, audio: { data, format: "mp3" } }`
8. **Respond to Webhook**: Respond With = **First Incoming Item** (input from Code above; no Response Body)

## Test webhook

From project root:

```bash
# Text-only
npm run test:webhook
node scripts/test-webhook.mjs [WEBHOOK_URL]

# JSON + PCM S16LE audio (same format as frontend)
npm run test:audio:generate   # create scripts/test-audio/test-audio.pcm
npm run test:webhook:json-audio
node scripts/test-webhook-json-audio.mjs [pcm-path] [WEBHOOK_URL]
```

Uses `N8N_WEBHOOK_URL` from env, or the URL you pass, or the default JARVIS webhook. Text test sends `{ message: "Hello" }`; JSON-audio test sends `{ message, timestamp, audio: { format: "pcm_s16le", ... } }` and checks for `200` + JSON with `message` (and optionally `audio`, `transcript`). Exits `0` on success, `1` on failure.

If you see **"Response body is empty"** or **"Response missing message..."**, the workflow is not yet returning `{ message, ... }` (and optionally `audio`). Configure the Webhook respond mode and Respond to Webhook node as in the setup guide.
