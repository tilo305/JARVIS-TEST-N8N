# PCM to MP3 Code Node (docs.n8n.io–aligned)

This guide shows how to add a **Code** node that converts **PCM S16LE** (16 kHz, mono) from the webhook into **MP3** binary, using only built‑ins and (when used) an external module. It follows [docs.n8n.io](https://docs.n8n.io):

- [Using the Code node](https://docs.n8n.io/code/code-node/) — modes, JavaScript, external libraries, **no file system / no HTTP** in Code
- [Built-in methods and variables](https://docs.n8n.io/code/builtin/) — `$input`, `$input.first()`, etc.
- [Enable modules in Code node](https://docs.n8n.io/hosting/configuration/configuration-examples/modules-in-code-node/) (self‑hosted) — required for the **lamejs** variant below

---

## 1. When to use PCM → WAV vs PCM → MP3

| Output | Use case | Code node |
|--------|----------|-----------|
| **WAV** | Cartesia STT, most STT APIs | `code-pcm-to-wav.js` (no deps) |
| **MP3** | STT/services that prefer MP3, or downstream MP3-only | `code-pcm-to-mp3.js` (uses lamejs) |

**PCM → WAV** uses only `Buffer` and `this.helpers.prepareBinaryData` — no external modules, no file system, no HTTP.  
**PCM → MP3** uses **lamejs** in the Code node when you need MP3 output.

---

## 2. Add the Code node

1. In the n8n workflow editor, add a **Code** node (e.g. after the **IF** node on the audio branch).
2. Set **Mode** to **Run Once for All Items**.
3. Rename the node (e.g. **PCM to MP3**).
4. Connect **IF (TRUE)** → **PCM to MP3** → your **STT** (or next) node.

---

## 3. Enable external modules (self‑hosted, for lamejs)

The PCM→MP3 code uses **lamejs**. You must enable external modules in the Code node:

1. Open [Enable modules in Code node](https://docs.n8n.io/hosting/configuration/configuration-examples/modules-in-code-node/).
2. Follow the steps for your deployment (Docker, npm, etc.).
3. Ensure **lamejs** is available (e.g. add to `NODE_FUNCTION_ALLOW_EXTERNAL` or your project’s dependencies as per the guide).

**n8n Cloud:** External modules are not supported; only **crypto** and **moment** are available. Use **PCM → WAV** (`code-pcm-to-wav.js`) instead, or an **HTTP Request** node to an external PCM→MP3 API.

---

## 4. Paste the Code (PCM → MP3)

1. Open the **PCM to MP3** Code node.
2. Delete any default code.
3. Paste the contents of **`workflows/code-pcm-to-mp3.js`**:

```javascript
// N8N Code node: PCM S16LE (base64) → MP3 binary (run "Run Once for All Items")
// Input: webhook body with audio.data (base64) and optional audio.format
// Output: { json: { ...body }, binary: { data } } — MP3 in binary.data for STT / downstream
//
// Uses lamejs. Requires "Enable modules in Code node" (self-hosted).
// See: https://docs.n8n.io/code/code-node/ (External libraries, File system and HTTP)
// Built-in: $input, this.helpers.prepareBinaryData — https://docs.n8n.io/code/builtin/

const lamejs = require('lamejs');

const item = $input.first();
const body = item.json.body || item.json;
const audio = body?.audio;
if (!audio?.data) return [{ json: { ...body, text: body?.message || '' } }];

const raw = Buffer.from(audio.data, 'base64');
const fmt = (audio.format || '').toLowerCase();

// MP3 (or mpeg/mpga): pass through as-is.
if (fmt.includes('mp3') || fmt.includes('mpeg') || fmt.includes('mpga') || fmt.includes('audio/mpeg')) {
  const data = await this.helpers.prepareBinaryData(raw, 'audio.mp3');
  return [{ json: { ...body }, binary: { data } }];
}

// PCM S16LE 16 kHz mono → MP3 via lamejs
const sampleRate = 16000;
const channels = 1;
const kbps = 128;
const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
const sampleBlockSize = 1152;
const numSamples = Math.floor(raw.length / 2);
const mp3Chunks = [];

for (let i = 0; i < numSamples; i += sampleBlockSize) {
  const end = Math.min(i + sampleBlockSize, numSamples);
  const chunk = new Int16Array(end - i);
  for (let j = 0; j < chunk.length; j++) chunk[j] = raw.readInt16LE((i + j) * 2);
  const mp3buf = encoder.encodeBuffer(chunk);
  if (mp3buf.length > 0) mp3Chunks.push(Buffer.from(mp3buf));
}

const flush = encoder.flush();
if (flush.length > 0) mp3Chunks.push(Buffer.from(flush));

const mp3 = Buffer.concat(mp3Chunks);
const data = await this.helpers.prepareBinaryData(mp3, 'audio.mp3');

return [{ json: { ...body }, binary: { data } }];
```

4. Save the node.

---

## 5. Input / output (same as PCM→WAV)

- **Input:** One item from the **Webhook** (or **IF**). The webhook body must include `audio.data` (base64) and optionally `audio.format` (`pcm_s16le` or `mp3`).
- **Output:** One item with `json: { ...body }` and `binary.data` = MP3 file (or pass‑through MP3 if input was already MP3).

The node uses **only** in‑memory `Buffer` and `this.helpers.prepareBinaryData`. It does **not** use the file system or HTTP, in line with [Code node — File system and HTTP requests](https://docs.n8n.io/code/code-node/).

---

## 6. Wire to STT

- **STT** (e.g. Cartesia): use **n8n Binary File** with **Input Data Field Name** = `data`, same as for the PCM→WAV node.

---

## 7. Optional: PCM → MP3 via Execute Command (ffmpeg)

If you prefer **ffmpeg** and have the **Execute Command** node (self‑hosted only):

1. Use a **Code** node only to decode base64 → PCM and output PCM as binary `data`, or use **Read/Write File From Disk** ([docs.n8n.io](https://docs.n8n.io)) to write PCM to a file.
2. Add **Execute Command** and run ffmpeg, e.g.:  
   `ffmpeg -y -f s16le -ar 16000 -ac 1 -i /path/to/in.pcm -codec:a libmp3lame -q:a 2 /path/to/out.mp3`
3. Use **Read/Write File From Disk** to read the MP3 and pass it to the next node.

See [Execute Command node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executecommand/) and [Execute Command common issues](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executecommand/common-issues/). This requires ffmpeg on the host/container and is not available on n8n Cloud.

---

## 8. Quick checklist

- [ ] **Code** node added, **Mode** = **Run Once for All Items**.
- [ ] **External modules** enabled (self‑hosted) and **lamejs** available, **or** you use PCM→WAV / Execute Command instead.
- [ ] **PCM to MP3** code pasted from `workflows/code-pcm-to-mp3.js`.
- [ ] **IF (TRUE)** → **PCM to MP3** → **STT** (or next node).
- [ ] **STT** reads binary from `data`.

---

## 9. References (docs.n8n.io)

| Topic | URL |
|-------|-----|
| Code node | https://docs.n8n.io/code/code-node/ |
| Built-in methods and variables | https://docs.n8n.io/code/builtin/ |
| Enable modules in Code node | https://docs.n8n.io/hosting/configuration/configuration-examples/modules-in-code-node/ |
| File system and HTTP (Code node) | https://docs.n8n.io/code/code-node/ (§ File system and HTTP requests) |
| Execute Command node | https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executecommand/ |
| Execute Command common issues | https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executecommand/common-issues/ |
