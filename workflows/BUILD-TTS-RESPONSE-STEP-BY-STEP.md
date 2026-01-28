# Build TTS Response – Step-by-Step (All Code & JSON)

This guide walks through adding the **Build TTS response** Code node so your N8N webhook returns the exact JSON your JARVIS frontend expects. Every code block and JSON below is copy-paste ready.

---

## What the frontend expects

The app calls `extractAudioFromResponse(response)` and builds a playable URL from **`response.audio.data`** (base64) and **`response.audio.format`** (e.g. `"mp3"` → `audio/mpeg`). The display text comes from **`response.message`**.

**Exact response shape the frontend needs:**

```json
{
  "message": "Here's what you requested, sir.",
  "audio": {
    "data": "<base64-encoded MP3 bytes>",
    "format": "mp3"
  }
}
```

If you skip the Build TTS response node and connect TTS directly to **Respond to Webhook**, n8n sends the **TTS node output** (binary file + other fields), not this JSON. The frontend then gets no playable audio. The **Build TTS response** Code node turns **TTS binary + reply text** into this structure.

---

## Flow (where the node sits)

```
Webhook → If (audio?) → … → AI/LLM → Set textToSpeak → TTS (Cartesia) → [Build TTS response] → Respond to Webhook
                                                                              ↑
                                                                    ADD THIS CODE NODE
```

- **Input of Build TTS response:** one item from the **TTS** node (with `binary.data` = MP3 and, usually, `json.textToSpeak` or similar).
- **Output:** one item with `json = { message, audio: { data, format: "mp3" } }` → that item is what **Respond to Webhook** should send.

---

## Step 1: Add the Code node

1. In the n8n workflow editor, locate your **TTS** node (the HTTP Request that calls `https://api.cartesia.ai/tts/bytes`).
2. Locate the **Respond to Webhook** node.
3. **Add a node** between them:
   - Click **+** on the canvas or use the node palette.
   - Search for **Code**.
   - Add a **Code** node.
4. **Rename** the node to **Build TTS response** (or **Build Response**).
5. **Connect**:
   - **TTS** → **Build TTS response**
   - **Build TTS response** → **Respond to Webhook**
   - Remove any direct connection from **TTS** to **Respond to Webhook** if it exists.

---

## Step 2: Set Code node mode

1. Open the **Build TTS response** Code node.
2. Find **Mode** (or **Run Once for All Items**).
3. Set it to **Run Once for All Items** so the node processes all items in one run and outputs a single item.

---

## Step 3: Paste the code

In the Code node’s **JavaScript** editor, **delete any default code** and paste **one** of the following versions.

### Option A – Generic (fits most flows)

Use this if your reply text is in `textToSpeak`, `llmReply`, `output`, `message`, or `text` on the incoming item:

```javascript
// N8N Code node: build { message, audio } for Respond to Webhook
// Input: item from TTS (binary.data = MP3) + reply text from your flow
// Output: { message, audio: { data, format: "mp3" } }

const item = $input.first();
const binary = item.binary?.data;

const reply =
  item.json?.textToSpeak ??
  item.json?.llmReply ??
  (typeof item.json?.output === 'string' ? item.json.output : item.json?.output?.output) ??
  item.json?.message ??
  item.json?.text ??
  '';

if (!reply) {
  return [{ json: { message: 'No reply.', audio: null } }];
}

const out = { message: reply };

if (binary) {
  const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
  const base64 = Buffer.from(buffer).toString('base64');
  out.audio = { data: base64, format: 'mp3' };
} else {
  out.audio = null;
}

return [{ json: out }];
```

### Option B – With “Set textToSpeak” by name (JARVIS-style)

Use this when a **Set** node named **Set textToSpeak** holds the reply and the TTS item might not carry it:

```javascript
// N8N Code node: build { message, audio } for Respond to Webhook
// Uses "Set textToSpeak" node by name. Output: { message, audio: { data, format: "mp3" } }

const item = $input.first();
const setItem = $('Set textToSpeak').first();
const reply =
  item.json?.textToSpeak ??
  setItem?.json?.textToSpeak ??
  item.json?.output ??
  item.json?.message ??
  item.json?.text ??
  '';
const binary = item.binary?.data;

if (!reply) {
  return [{ json: { message: 'No reply.', audio: null } }];
}

const out = { message: reply };
if (binary) {
  const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
  const base64 = Buffer.from(buffer).toString('base64');
  out.audio = { data: base64, format: 'mp3' };
} else {
  out.audio = null;
}
return [{ json: out }];
```

If your Set node has a **different name**, replace `'Set textToSpeak'` with that exact name, e.g. `$('Set Reply Text').first()`.

---

## Step 4: Configure “Respond to Webhook”

1. Open the **Respond to Webhook** node.
2. Set **Respond With** (or equivalent) to **First Incoming Item**.
3. That makes n8n send the **JSON** produced by Build TTS response (the `{ message, audio }` object), not the raw TTS output.

---

## Step 5: Ensure TTS outputs binary in `data`

The Build TTS response code expects the TTS node to put the MP3 file in **`binary.data`**. Check your **TTS** (Cartesia) node:

1. Open the **TTS** HTTP Request node.
2. Under **Options** or **Response**:
   - **Response Format** = **File** (or “Binary”/“Binary Data”).
   - **Output Property Name** = **data**.

If you use another property name (e.g. `binary`), you must change the Code node line that gets the buffer:

- Default: `this.helpers.getBinaryDataBuffer(0, 'data')`
- If your TTS writes to `binary.myAudio`: use `getBinaryDataBuffer(0, 'myAudio')` and keep the rest of the code the same.

---

## TTS node body (Cartesia, MP3) – reference JSON

Your TTS node should request MP3 so the Build TTS response can set `audio.format = "mp3"`. Here is a **Cartesia** body that does that (copy into the TTS node’s **JSON** body; fix the `transcript` expression if your field name differs):

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

Notes:

- **`transcript`** must be the text you want spoken (e.g. from **Set textToSpeak** or your LLM/agent output). Adjust the expression if you use another field name.
- **`output_format.container`** = **`"mp3"`** so the Bytes API returns MP3; then Build TTS response correctly sets `format: 'mp3'`.
- Do **not** add `output_format.sample_rate` when using `"container": "mp3"` (Cartesia MP3 format does not use it in the API).
- For lowest latency use **`sonic-turbo`**; for higher quality you can use **`sonic-3`** and keep the same response shape.

---

## Exact response shape (for debugging)

When everything is wired correctly, the webhook response body should look like this (with real base64 in `audio.data`):

```json
{
  "message": "Here's what you requested, sir.",
  "audio": {
    "data": "//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhQCA//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAABQTEFNRTMuMTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQgABAAAAA4VkxJUAAAf..."
  }
}
```

The frontend treats missing `audio.format` as `"mp3"`, but the Build TTS response code sets **`format: "mp3"`** explicitly so it’s always correct.

---

## Quick checklist

- [ ] **Build TTS response** Code node added **between** TTS and Respond to Webhook.
- [ ] Code node **Mode** = **Run Once for All Items**.
- [ ] **Option A** or **Option B** code pasted (Option B if you use a “Set textToSpeak” node; otherwise Option A).
- [ ] **TTS** → **Build TTS response** → **Respond to Webhook** connected in that order.
- [ ] **Respond to Webhook** → **Respond With** = **First Incoming Item**.
- [ ] **TTS** node → Response = **File**, output property = **data**.
- [ ] TTS request body uses **`output_format: { "container": "mp3" }`** (see JSON above).

---

## Troubleshooting

### “No reply” or empty message

- The **reply** variable is empty. The code looks for `textToSpeak`, `llmReply`, `output`, `message`, `text` (and in Option B, the “Set textToSpeak” node).
- **Fix:** In the Build TTS response node, inspect **Input** (run the workflow up to that node). See which field actually contains the AI reply. Then add that field to the `reply` chain, e.g. `item.json?.myReply ??` at the top, or use Option B and make sure the node name in `$('...')` matches your Set node.

### No audio / “audio: null”

- Either the TTS node didn’t run, or its binary is not in `binary.data` on the item that reaches Build TTS response.
- **Fix:** Confirm TTS runs and that its **Response** is **File** with property **data**. Run the workflow and open the Build TTS response **Input** item: it should show **Binary** → **data**.
- If the TTS node writes to another binary property, change `getBinaryDataBuffer(0, 'data')` to use that property name.

### Frontend still doesn’t play audio

- The webhook might be returning something other than `{ message, audio: { data, format: "mp3" } }` (e.g. raw TTS output or another structure).
- **Fix:** Call the webhook from the browser or Postman and inspect the **response body**. It must be JSON with `message` (string) and `audio` (object with `data` base64 string and `format: "mp3"`). If Respond to Webhook is not set to **First Incoming Item**, it may be sending the wrong item; set it to use the output of Build TTS response.

### Wrong “reply” source (e.g. agent output in `output`)

- If your LLM/agent returns `{ output: "..." }`, Option A already supports it with:
  `(typeof item.json?.output === 'string' ? item.json.output : item.json?.output?.output)`.
- If the reply is in another field (e.g. `result`, `content`), add it to the chain:
  `item.json?.result ?? item.json?.content ??` etc.

### TTS: "invalid output specification: unsupported sample rate: 0"

- Cartesia TTS returns **400** with `unsupported sample rate: 0`. For **MP3** output, Cartesia does **not** use `sample_rate` in `output_format`; if you send it (e.g. from an expression that’s empty/0), the API rejects it.
- **Fix:** In the **TTS** node body, set `output_format` to **only** `{ "container": "mp3" }`. Remove `output_format.sample_rate` and any expression that might resolve to 0. Do not use top-level `"speed": "normal"`; use `generation_config: { "speed": 1, "volume": 1 }` and `"language": "en"` as in the reference JSON above.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Add **Code** node between **TTS** and **Respond to Webhook**; name it **Build TTS response**. |
| 2 | Set Code **Mode** = **Run Once for All Items**. |
| 3 | Paste **Option A** or **Option B** code (Option B if you have a “Set textToSpeak” node). |
| 4 | **Respond to Webhook** → **Respond With** = **First Incoming Item**. |
| 5 | TTS → Response = **File**, output property = **data**; body uses `output_format: { "container": "mp3" }`. |

After that, the webhook returns `{ message, audio: { data, format: "mp3" } }` and the JARVIS frontend can show the reply and play the MP3.
