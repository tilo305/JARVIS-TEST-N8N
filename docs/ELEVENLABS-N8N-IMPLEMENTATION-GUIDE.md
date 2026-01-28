# ElevenLabs in N8N – What You Need to Implement

Research from [docs.elevenlabs.io](https://docs.elevenlabs.io): best settings for low latency and bidirectional conversational flow, and what to change in your N8N workflow. You implement these changes yourself.

---

## 1. ElevenLabs vs Your Current Flow

Your current flow:

- **Webhook** → **If** (audio vs text) → **PCM to WAV** (when audio) → **STT (Cartesia)** → **AI Agent** → **AI Agent1** → **Set textToSpeak** → **TTS (Cartesia)** → **Build TTS response** → **Respond to Webhook**

To use ElevenLabs for better latency and conversational flow, you keep this structure and swap **STT** and **TTS** to ElevenLabs APIs.

---

## 2. What to Implement in N8N

### 2.1 TTS node (replace Cartesia TTS)

**Node to change:** the HTTP Request node that currently calls `https://api.cartesia.ai/tts/bytes` (your “TTS” node).

**What you need to do:**

1. **URL**  
   - Use: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`  
   - Replace `{voice_id}` with your ElevenLabs voice ID (from [Voice Library](https://elevenlabs.io/voice-library) or API).

2. **Method**  
   - `POST`

3. **Headers**  
   - `xi-api-key`: your ElevenLabs API key  
   - `Content-Type`: `application/json`

4. **Query parameters** (on the URL or in “Query Parameters” in N8N)  
   - `output_format`: `mp3_22050_32` (lower latency, smaller chunks) or `mp3_44100_128` (higher quality).  
   - `optimize_streaming_latency`: `3` or `4` (3 = max latency optimizations; 4 = max + no text normalizer, best latency, may mispronounce numbers).

5. **Body (JSON)**  
   - `text`: the text to speak. In your flow this is the same as now, e.g. `{{ ($json.textToSpeak && String($json.textToSpeak).trim()) ? $json.textToSpeak : 'No response.' }}` (or your “Set textToSpeak” output).  
   - `model_id`: `eleven_flash_v2_5` for lowest latency (~75 ms). Use `eleven_turbo_v2_5` if you prefer quality over a bit of latency.

6. **Response**  
   - Tell N8N to treat the response as a file/binary (like your current TTS node), and keep writing it into the same binary property (e.g. `data`) so **Build TTS response** still receives `item.binary.data`.

**References:**  
- [Create speech](https://docs.elevenlabs.io/api-reference/text-to-speech)  
- [Stream speech](https://docs.elevenlabs.io/api-reference/text-to-speech/convert-as-stream) (if you later switch to streaming)  
- Model IDs: `eleven_flash_v2_5`, `eleven_turbo_v2_5`, `eleven_multilingual_v2`

---

### 2.2 STT node (replace Cartesia STT)

**Node to change:** the HTTP Request node that currently calls `https://api.cartesia.ai/stt` (your “STT” node).

ElevenLabs STT has two styles:

- **Realtime (WebSocket)**  
  - Best for bidirectional, lowest latency (~150 ms).  
  - Not a simple “single HTTP request” – you’d need a different path (e.g. Subflow / custom node / external service that talks WebSocket and returns transcript). So for “only change my current N8N workflow,” this is **not** what you implement first.

- **Batch (async + webhook or polling)**  
  - You upload a file, get a task id, then either wait for a webhook or poll for completion.  
  - Fits N8N but adds extra nodes (e.g. “Poll” or “Webhook” for completion).  
  - See: [Speech to Text – batch / webhooks](https://elevenlabs.io/docs/developers/guides/cookbooks/speech-to-text/batch/webhooks).

**What you need to do if you want ElevenLabs STT in this same webhook-run:**

1. Look up the **batch transcription** API in [ElevenLabs Speech to Text docs](https://docs.elevenlabs.io/api-reference/speech-to-text):  
   - Endpoint to **create** a transcription task (upload file + get `task_id` or `transcription_id`).  
   - Endpoint (or webhook) to **get the result** (transcript text).

2. **STT branch in N8N:**  
   - After **PCM to WAV** (or wherever you have `binary.data` as the audio file):  
     - One HTTP Request: “Create transcription” → body/form: upload the audio file, use your ElevenLabs API key.  
     - Then either:  
       - **Option A:** a “Wait” + “Get transcription result” (poll by id), or  
       - **Option B:** a webhook that ElevenLabs calls when done, and then another part of the workflow continues from that.  
   - Map the **final transcript** into the same field your AI Agent uses as “user message” (e.g. `text` or `$json.text`), so the rest of the flow (AI Agent → … → TTS) stays the same.

3. **Input format:**  
   - Prefer the same format you already have: WAV or the format ElevenLabs batch accepts (see their “supported formats” for the create-transcription endpoint). Your **PCM to WAV** node is fine as-is for creating that file.

If you decide to keep Cartesia for STT for now, you only replace the **TTS** node with ElevenLabs as in section 2.1.

---

### 2.3 Build TTS response node

**Node:** your Code node that builds `{ message, audio: { data, format } }` for **Respond to Webhook**.

**What you need to do:**

- Keep the same output shape: `message` (string), `audio.data` (base64), `audio.format` (e.g. `"mp3"`).  
- Ensure the **TTS** node’s binary output is still in the same property (e.g. `binary.data`) and that this node reads from that and base64-encodes it.  
- If ElevenLabs returns MP3, `format` stays `"mp3"`. No frontend changes required.

---

### 2.4 Optional: streaming TTS for even lower latency

ElevenLabs supports **streaming** at:

- `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`

Same auth and body as the non-stream endpoint; response is chunked audio. In N8N you’d need to:

- Use an HTTP Request node that can handle streaming (or a custom node / Subflow that reads the stream, buffers it, and outputs one “full file” at the end).  
- Then pass that into your existing **Build TTS response** logic so the webhook still returns `{ message, audio: { data, format } }`.

So: “what you need to implement” for streaming is either (a) a streaming-capable HTTP step + logic to collect chunks into one base64 body, or (b) a small external service that calls the stream API and returns the full file to N8N. You can do that later; starting with the non-stream TTS endpoint is enough.

---

## 3. Recommended settings for “optimal latency” (ElevenLabs)

- **TTS**  
  - Model: `eleven_flash_v2_5`  
  - Query: `output_format=mp3_22050_32` and `optimize_streaming_latency=3` (or `4` if you accept worse number/date pronunciation).  
  - Body: `text` = your `textToSpeak` value, `model_id` = `eleven_flash_v2_5`.

- **STT**  
  - Keep Cartesia for now, **or** implement ElevenLabs batch STT as in 2.2.  
  - Realtime WebSocket STT is the “best bidirectional” option but requires a different N8N/architecture (WebSocket handler, etc.).

- **Bidirectional flow**  
  - Your current design (one webhook request → one response with message + audio) is already “one turn” of bidirectional.  
  - For “most optimal” low latency in that design: ElevenLabs TTS (flash + streaming params) + keep Cartesia STT, or add ElevenLabs batch STT when you’re ready.

---

## 4. Checklist (only N8N)

- [ ] Get ElevenLabs API key and a voice ID.
- [ ] Replace TTS HTTP Request: URL = `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`, headers `xi-api-key` + `Content-Type`, query `output_format` + `optimize_streaming_latency`, body `text` + `model_id`.
- [ ] Set TTS response handling to “file”/binary and keep output in the same field (e.g. `data`) that **Build TTS response** uses.
- [ ] Confirm **Build TTS response** still outputs `{ message, audio: { data, format: "mp3" } }`.
- [ ] (Optional) Replace STT with ElevenLabs batch: create transcription request + wait/poll or webhook for result, then map transcript into `text` for the AI Agent.
- [ ] (Later) Consider streaming TTS or Realtime STT if you add WebSocket support outside or inside N8N.

That’s all you need to implement in the N8N workflow for ElevenLabs-based, low-latency conversational flow.
