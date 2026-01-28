# Add “Build TTS response” so the webhook returns MP3 correctly

**Full step-by-step with all code and JSON → [BUILD-TTS-RESPONSE-STEP-BY-STEP.md](BUILD-TTS-RESPONSE-STEP-BY-STEP.md).**

Your frontend expects the webhook to return JSON in this shape:

```json
{
  "message": "Here's what you requested, sir.",
  "audio": {
    "data": "<base64-encoded MP3>",
    "format": "mp3"
  }
}
```

The Cartesia TTS node returns **binary MP3** (and possibly some JSON). If you connect TTS directly to **Respond to Webhook** and respond with “First Incoming Item,” n8n sends whatever the TTS node outputs—usually binary or a different structure—not `{ message, audio: { data, format: "mp3" } }`. So the app won’t get playable audio unless something in between **builds** that structure.

That “something” is a **Code** node we call **Build TTS response**. You need it even if your workflow is different from the repo’s JSON.

---

## Where it goes

- **After:** the node that has the TTS **binary** (Cartesia TTS HTTP Request, with Response Format = File, output property `data`).
- **Before:** **Respond to Webhook**.

So the chain is:

```
… → TTS (Cartesia) → Build TTS response → Respond to Webhook
```

---

## How to add it in n8n

1. **Add a Code node** between your TTS node and **Respond to Webhook**.
2. Name it e.g. **Build TTS response** (or **Build Response**).
3. Set **Mode** = **Run Once for All Items**.
4. **Paste this code** into the Code node:

```javascript
// N8N Code node: build { message, audio } for Respond to Webhook
// Input: item from TTS (binary.data = MP3) + reply text from your flow
// Output: { message, audio: { data, format: "mp3" } }

const item = $input.first();
const binary = item.binary?.data;

// Where does YOUR workflow put the reply text? Adjust this line to match.
// Common cases:
//   - Set node named "Set textToSpeak": use $json.textToSpeak or reference that node
//   - LLM reply in $json.llmReply, $json.output, $json.message, $json.text
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

5. **Wire it**
   - Input: from your **TTS** node (the one that returns binary MP3 in `data`).
   - Output: to **Respond to Webhook**.
6. **Respond to Webhook**
   - **Respond With** = **First Incoming Item** (so it sends the JSON from this Code node, not raw TTS output).

---

## Matching your “reply” field

The code tries several possible fields for the reply text. If your workflow uses something else, change this part:

```javascript
const reply =
  item.json?.textToSpeak ??   // if you have a Set node that sets textToSpeak
  item.json?.llmReply ??      // if you use "Extract LLM Reply" / llmReply
  item.json?.output ??        // agent/output style
  item.json?.message ??
  item.json?.text ??
  '';
```

Examples:

- You have a **Set** node that sets `textToSpeak`: the TTS input item often still has `textToSpeak` from the previous step; the code already checks `item.json?.textToSpeak`. If the text lives only in an earlier node, use `$('Set textToSpeak').first().json.textToSpeak` (replace `Set textToSpeak` with your node name).
- Your LLM/agent puts the reply in `output`: the line `(typeof item.json?.output === 'string' ? item.json.output : item.json?.output?.output)` handles both string and `{ output: "..." }`.

---

## Input vs output formats (recap)

| Direction | Format | Notes |
|----------|--------|--------|
| **Webhook receives (input)** | PCM (`pcm_s16le`, 16 kHz) or MP3 | Frontend currently sends PCM. “PCM to WAV” supports both; if you send MP3, it passes through. |
| **Webhook returns (output)** | MP3 | TTS is configured for `output_format: { container: "mp3" }`. This Code node sets `audio.format = "mp3"` so the app uses `audio/mpeg` for playback. |

So: the webhook does **not** “receive” MP3 from the app today (it receives PCM). The workflow **is** set up for **MP3 output** as long as you add this Build TTS response step so the response body is `{ message, audio: { data, format: "mp3" } }`.
