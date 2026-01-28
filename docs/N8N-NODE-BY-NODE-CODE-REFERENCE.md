# n8n JARVIS Workflow — Node-by-Node Code & Config Reference

This document lists **every node**, in execution order, with the **exact code or config** and **where to put it** in the n8n editor. Use it when building the workflow from scratch or when fixing a single node.

**Quick start:** To use the pre-built workflow instead, import `workflows/jarvis-portable-fixed.json` in n8n, then use this doc to verify or edit individual nodes.

---

## Flow Overview

```
Webhook
  → Parse Webhook Body
  → Prepare audio for STT
  → If
       ├─ TRUE (has text)  → Set Transcript (from message) → AI Agent → AI Agent1 → Set textToSpeak → TTS → Build TTS response → Respond in text → Respond to Webhook
       └─ FALSE (voice)   → STT → AI Agent → AI Agent1 → Set textToSpeak → TTS → Build TTS response → Respond in text → Respond to Webhook
```

---

## 1. Webhook

**Node type:** Webhook  
**Purpose:** Receives POST requests from the chat UI (text and/or audio).

**Where it goes:** First node. Create a **Webhook** node.

**Settings:**

| Field | Value |
|-------|--------|
| **HTTP Method** | `POST` |
| **Path** | your webhook path (e.g. `170d9a22-bac0-438c-9755-dc79b961d36e` or custom) |
| **Respond** | `When Last Node Finishes` (or equivalent so a later “Respond to Webhook” node sends the reply) |
| **Options** | Turn **ON** “Raw body” / `rawBody: true` so the body is available as received for parsing |

No code. Only these parameters.

---

## 2. Parse Webhook Body

**Node type:** Code  
**Purpose:** Parses the raw request body so downstream nodes see `body.message`, `body.text`, `body.audio.data`, etc.

**Where it goes:** Right after the Webhook. Create a **Code** node named **Parse Webhook Body**.

**In the Code node:**

1. Set **Mode** to **Run Once for All Items**.
2. In the **JavaScript** editor, paste this **entire** block:

```javascript
// Parse webhook body so IF and STT see body.audio.data and body.message.
// With rawBody:true the body can be raw string; without rawBody n8n may put parsed body in $json.body or $json.
const item = $input.first();
const raw = item.json.body ?? item.json;
let body;
if (typeof raw === 'string') {
  try { body = JSON.parse(raw); } catch (e) { body = { message: raw || '' }; }
} else if (raw && typeof raw === 'object') {
  body = raw.body && typeof raw.body === 'object' ? raw.body : raw;
} else {
  body = {};
}
return [{ json: { body, headers: item.json.headers, query: item.json.query } }];
```

**Connections:** Input from **Webhook**. Output goes to **Prepare audio for STT**.

---

## 3. Prepare audio for STT

**Node type:** Code  
**Purpose:** Converts `body.audio.data` (base64) into `binary.audio` so the IF/STT branch can use Cartesia STT. Handles WAV, MP3, FLAC, PCM, etc.

**Where it goes:** After **Parse Webhook Body**. Create a **Code** node named **Prepare audio for STT**.

**In the Code node:**

1. Set **Mode** to **Run Once for All Items**.
2. In the **JavaScript** editor, paste this **entire** block:

```javascript
// JSON base64 -> binary.audio for all Cartesia STT formats. IF and STT use same property 'audio'.
const item = $input.first();
const body = item.json.body || {};
const audio = body?.audio;
if (!audio?.data) return [{ json: { body, headers: item.json.headers, query: item.json.query } }];
let raw = Buffer.from(audio.data, 'base64');
const fmt = (audio.format || '').toLowerCase();
let name = 'audio.wav';
if (fmt.includes('mp3')||fmt.includes('mpeg')||fmt.includes('mpga')||fmt.includes('audio/mpeg')) name='audio.mp3';
else if (fmt.includes('flac')) name='audio.flac';
else if (fmt.includes('m4a')) name='audio.m4a';
else if (fmt.includes('mp4')) name='audio.mp4';
else if (fmt.includes('oga')||fmt.includes('ogg')) name='audio.ogg';
else if (fmt.includes('wav')) name='audio.wav';
else if (fmt.includes('webm')) name='audio.webm';
else if (fmt.includes('pcm')) {
  const sr=16000,ch=1,bps=16,dataSize=raw.length,fileSize=36+dataSize,byteRate=sr*ch*(bps/8);
  const h=Buffer.alloc(44);let o=0;
  h.write('RIFF',o);o+=4;h.writeUInt32LE(fileSize,o);o+=4;h.write('WAVE',o);o+=4;h.write('fmt ',o);o+=4;h.writeUInt32LE(16,o);o+=4;
  h.writeUInt16LE(1,o);o+=2;h.writeUInt16LE(ch,o);o+=2;h.writeUInt32LE(sr,o);o+=4;h.writeUInt32LE(byteRate,o);o+=4;
  h.writeUInt16LE((bps/8)*ch,o);o+=2;h.writeUInt16LE(bps,o);o+=2;h.write('data',o);o+=4;h.writeUInt32LE(dataSize,o);
  raw = Buffer.concat([h, raw]);
}
const fileData = await this.helpers.prepareBinaryData(raw, name);
return [{ json: { body, headers: item.json.headers, query: item.json.query }, binary: { audio: fileData } }];
```

**Connections:** Input from **Parse Webhook Body**. Output goes to **If**.

---

## 4. If

**Node type:** IF  
**Purpose:** Routes by “has text or not”: TRUE = text path, FALSE = voice (STT) path.

**Where it goes:** After **Prepare audio for STT**. Create an **IF** node named **If**.

**Condition:**

- **Value 1** (left): use this **expression** (Expression tab, paste exactly):

```
{{ ($json.body?.text || $json.body?.message || '').toString().trim() }}
```

- **Operation:** “is not empty” / “not empty” (string).
- **Value 2** can be empty.

So: **TRUE** when the user sent text (`body.text` or `body.message`); **FALSE** when they sent only voice.

**Connections:**

- **If TRUE** → **Set Transcript (from message)**
- **If FALSE** → **STT**

---

## 5. Set Transcript (from message)

**Node type:** Set  
**Purpose:** Puts the typed message into a `text` field so the AI Agent receives it as the user query.

**Where it goes:** On the **TRUE** branch of **If**. Create a **Set** node named **Set Transcript (from message)**.

**Assignments:**

| Name | Value (paste in Expression) | Type |
|------|-----------------------------|------|
| `text` | `{{ $json.body?.text \|\| $json.body?.message \|\| $json.message \|\| '' }}` | String |

(Use the Expression editor and paste that; the `||` are “or”.)

**Connections:** Input from **If (TRUE)**. Output goes to **AI Agent**.

---

## 6. STT (Speech-to-Text)

**Node type:** HTTP Request  
**Purpose:** Sends the audio file to Cartesia STT and gets back `text`.

**Where it goes:** On the **FALSE** branch of **If**. Create an **HTTP Request** node named **STT**.

**Settings:**

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **URL** | `https://api.cartesia.ai/stt` |
| **Headers** | Add: `Authorization` = `Bearer YOUR_CARTESIA_API_KEY`, `Cartesia-Version` = `2025-04-16` |
| **Send Body** | On |
| **Body Content Type** | `multipart-form-data` |
| **Body:** | |
| – `file` | Type: **Form Binary Data**, **Input Data Field Name**: `audio` |
| – `model` | Type: Form Data, value: `ink-whisper` |
| – `language` | Type: Form Data, value: `en` |

So STT reads `binary.audio` from the item (created by **Prepare audio for STT**).

**Connections:** Input from **If (FALSE)**. Output goes to **AI Agent**.

---

## 7. AI Agent (first agent)

**Node type:** AI Agent (LangChain)  
**Purpose:** Routes the user query (from text or STT) and calls tools/subagents.

**Where it goes:** After **Set Transcript (from message)** and after **STT** — both branches merge here. Create an **AI Agent** node named **AI Agent**.

**Parameters:**

- **Prompt / Text:** Expression  
  `{{ $json.text }}`
- **System Message** (or equivalent): your router instructions, e.g.  
  `You are to take the user's query and make sure it is something simple that you can respond to and send it to the appropriate subagent, tool, etc.`

Attach your **Groq Chat Model** (or other LLM) and **Simple Memory** (and **AI Agent Tool** if used). No code block here; only these prompt/config fields.

**Connections:** Input from **Set Transcript (from message)** and from **STT**. Output goes to **AI Agent1**.

---

## 8. AI Agent1 (JARVIS reply)

**Node type:** AI Agent (LangChain)  
**Purpose:** Produces the final JARVIS reply in natural language.

**Where it goes:** After **AI Agent**. Create an **AI Agent** node named **AI Agent1**.

**Parameters:**

- **Prompt / Text:** Expression  
  `{{ $json.output }}`
- **System Message:** your full JARVIS personality and rules (e.g. “You are JARVIS, the sophisticated and quick-witted AI assistant…” with tone, “sir”, etc.).

Attach the **Groq Chat Model1** (or second LLM). No code.

**Connections:** Input from **AI Agent**. Output goes to **Set textToSpeak**.

---

## 9. Set textToSpeak

**Node type:** Set  
**Purpose:** Puts the LLM reply into `textToSpeak` for the TTS node.

**Where it goes:** After **AI Agent1**. Create a **Set** node named **Set textToSpeak**.

**Assignments:**

| Name | Value (Expression) | Type |
|------|--------------------|------|
| `textToSpeak` | `{{ (typeof $json.output === 'string' ? $json.output : $json.output?.output) \|\| $json.text \|\| $json.message \|\| 'No response.' }}` | String |

**Connections:** Input from **AI Agent1**. Output goes to **TTS**.

---

## 10. TTS (Text-to-Speech)

**Node type:** HTTP Request  
**Purpose:** Calls Cartesia TTS and returns MP3 in `binary.data`.

**Where it goes:** After **Set textToSpeak**. Create an **HTTP Request** node named **TTS**.

**Settings:**

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **URL** | `https://api.cartesia.ai/tts/bytes` |
| **Headers** | `Cartesia-Version` = `2025-04-16`, `X-API-Key` = `YOUR_CARTESIA_API_KEY` |
| **Send Body** | On |
| **Body Content Type** | JSON |
| **JSON body** | Use expressions where needed. The **transcript** must come from `textToSpeak`. Example body (adjust model/voice to your setup): |

**JSON Body** (in the body editor, use expressions for the transcript):

```json
{
  "model_id": "sonic-3",
  "transcript": "{{ ($json.textToSpeak && String($json.textToSpeak).trim()) ? $json.textToSpeak : 'No response.' }}",
  "voice": {
    "mode": "id",
    "id": "95131c95-525c-463b-893d-803bafdf93c4"
  },
  "output_format": { "container": "mp3" },
  "language": "en",
  "generation_config": { "speed": 1, "volume": 1 }
}
```

**Response:**

- **Response Format** (or equivalent): **File**
- **Output Property Name**: `data`

So the node returns binary in `binary.data`.

**Connections:** Input from **Set textToSpeak**. Output goes to **Build TTS response**.

---

## 11. Build TTS response

**Node type:** Code  
**Purpose:** Builds the JSON the chat UI needs: `message` (for history and bubble) and `audio` (base64 MP3). **This node must always set `message`** so the chat interface can add it to history.

**Where it goes:** After **TTS**. Create a **Code** node named **Build TTS response**.

**In the Code node:**

1. Set **Mode** to **Run Once for All Items**.
2. In the **JavaScript** editor, paste this **entire** block:

```javascript
// Output must include 'message' so the chat UI can add it to history. Reply from textToSpeak/llmReply/output/message/text.
const item = $input.first();
const setItem = $('Set textToSpeak').first();
const reply = item.json?.textToSpeak ?? setItem?.json?.textToSpeak ?? item.json?.llmReply ?? item.json?.output ?? item.json?.message ?? item.json?.text ?? '';
const binary = item.binary?.data;
if (!reply) return [{ json: { message: 'No reply.', audio: null } }];
const out = { message: reply };
if (binary) {
  const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
  const base64 = Buffer.from(buffer).toString('base64');
  out.audio = { data: base64, format: 'mp3' };
}
return [{ json: out }];
```

**Connections:** Input from **TTS**. Output goes to **Respond in text**.

---

## 12. Respond in text

**Node type:** Code  
**Purpose:** Ensures the payload has a clean `message` (and optional `audio`) and no binary, so the webhook response is valid JSON for the chat UI.

**Where it goes:** After **Build TTS response**. Create a **Code** node named **Respond in text**.

**In the Code node:**

1. Set **Mode** to **Run Once for All Items**.
2. In the **JavaScript** editor, paste this **entire** block:

```javascript
// Respond in text: ensure chat interface always gets a text message in history.
// Runs for both typed messages and mic/audio — output must include 'message' for the chat UI.
const item = $input.first();
const msg = (item.json?.message != null && String(item.json.message).trim()) ? String(item.json.message).trim() : 'No response.';
const out = { message: msg };
if (item.json?.audio) out.audio = item.json.audio;
return [{ json: out }];
```

**Connections:** Input from **Build TTS response**. Output goes to **Respond to Webhook**.

---

## 13. Respond to Webhook

**Node type:** Respond to Webhook  
**Purpose:** Sends the final JSON back to the chat UI.

**Where it goes:** After **Respond in text**. Create a **Respond to Webhook** node named **Respond to Webhook**.

**Settings:**

| Field | Value |
|-------|--------|
| **Respond With** | **First Incoming Item** (or “Using the first incoming item”) |

Do **not** send binary or “Binary File”. The input must be the JSON-only item from **Respond in text** (shape `{ message, audio? }`).

**Connections:** Input **only** from **Respond in text**. No input from TTS or any node that still has binary.

---

## Quick copy-paste index (Code nodes only)

| Node | Mode | In this doc | In repo |
|------|------|-------------|---------|
| Parse Webhook Body | Run Once for All Items | §2 | `workflows/jarvis-portable-fixed.json` (node "Parse Webhook Body") |
| Prepare audio for STT | Run Once for All Items | §3 | same workflow JSON (node "Prepare audio for STT") |
| Build TTS response | Run Once for All Items | §11 | `workflows/code-build-tts-response.js` (slightly simplified; use §11 for full version with `setItem`) |
| Respond in text | Run Once for All Items | §12 | same workflow JSON (node "Respond in text") |

---

## Expressions summary (copy-paste)

**If – Value 1:**
```
{{ ($json.body?.text || $json.body?.message || '').toString().trim() }}
```

**Set Transcript – `text`:**
```
{{ $json.body?.text || $json.body?.message || $json.message || '' }}
```

**Set textToSpeak – `textToSpeak`:**
```
{{ (typeof $json.output === 'string' ? $json.output : $json.output?.output) || $json.text || $json.message || 'No response.' }}
```

**TTS – transcript** (inside JSON body):
```
{{ ($json.textToSpeak && String($json.textToSpeak).trim()) ? $json.textToSpeak : 'No response.' }}
```

---

## Response shape the chat UI expects

The webhook must return **JSON** like:

```json
{
  "message": "Here is what JARVIS said, sir.",
  "audio": {
    "data": "<base64 MP3 string>",
    "format": "mp3"
  }
}
```

- **`message`** → Shown in the bubble and stored in chat history.
- **`audio.data`** + **`audio.format`** → Used for playback.

Build TTS response and Respond in text produce this shape; Respond to Webhook sends it with **Respond With = First Incoming Item**.
