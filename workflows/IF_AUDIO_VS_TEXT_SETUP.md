# IF Node: Audio vs Text Right After Webhook

Place an **IF** node directly after the **Webhook**. Use it to route:
- **Audio** (PCM S16LE from frontend) → **TRUE** → PCM to WAV → STT (then to your AI)
- **Text only** → **FALSE** → Set transcript from `message` → AI (skip STT)

**Audio format:** The frontend sends **PCM S16LE** (16 kHz, mono) in `audio.data` (base64) with `audio.format: "pcm_s16le"`. The IF detects **any** audio via `audio.data`; the **PCM to WAV** node consumes that format. See **IF-PCM-S16LE-AUDIO-TO-STT.md** for a focused PCM S16LE → TRUE → STT setup.

---

## 1. Add the IF node

1. Add an **IF** node.
2. Connect **Webhook** → **IF** (replace any direct Webhook → PCM-to-WAV link).

---

## 2. Configure the IF node

**Name:** `Has Audio?` (or `PCM S16LE audio?`)

**Condition:**

| Field | Value |
|-------|--------|
| **Value 1** (left side) | `={{ ($json.body?.audio?.data || $json.audio?.data || $binary?.audio) ? 'yes' : '' }}` |
| **Value 2** (right side) | leave empty |
| **Operation** | `is not empty` (string) |

In the IF node, add one condition. Use the expression above as the left value; the right value can be empty. Operation = **is not empty**.

- **Important:** Use a **single** `=` in the expression: `={{ ... }}`. **No** `==` before `{{` (common typo).
- **Audio (JSON base64):** Frontend sends `{ message, timestamp, audio: { format: "pcm_s16le", data: "<base64>", ... } }` → expression becomes `'yes'` → **TRUE** → route to PCM to WAV → STT.
- **Audio (binary from webhook):** When the webhook receives multipart/form-data and stores the file in binary property **`audio`**, `$binary.audio` is set ([n8n Data structure](https://docs.n8n.io/data/data-structure/), [check incoming data](https://docs.n8n.io/code/cookbook/expressions/check-incoming-data/)) → expression is `'yes'` → **TRUE**.
- **Text only:** Frontend sends `{ message: "hello" }` (no `audio` in JSON and no binary `audio`) → expression is `''` → **FALSE** → route to Set transcript → AI.

The IF checks `$json.body?.audio?.data`, `$json.audio?.data`, and **`$binary?.audio`** so it detects both JSON base64 audio and binary `audio` from the webhook.

---

## 3. Wire the branches

### TRUE (has audio, e.g. PCM S16LE) → STT path

- **IF (output 1 / TRUE)** → **PCM to WAV** (Code) → **Cartesia STT** → … → your AI node.

Only items with `audio.data` go here. PCM to WAV decodes base64 PCM S16LE (or MP3), builds WAV (or pass-through), and outputs binary `data` for STT. STT always receives binary.

### FALSE (text only) → AI agent as JSON

- **IF (output 2 / FALSE)** → **Set** node → your **AI** node.

**Set node** (“Transcript from message”):

- **Mode:** “Manual mapping” (or equivalent).
- **Assignments:**
  - `transcript` = `={{ $json.body?.message || $json.message || '' }}`

This forwards the text as `transcript` so your AI node can use `$json.transcript` like the STT path.

---

## 4. Summary

| Branch | Condition | Next node | Then |
|--------|-----------|-----------|------|
| **TRUE** | `audio.data` present (PCM S16LE or other) | PCM to WAV | STT → … → AI |
| **FALSE** | text only | Set (`transcript` from `message`) | AI |

The IF node checks **webhook JSON** (`body.audio.data` or `audio.data`) and **binary** (`$binary.audio`) so it works when audio is sent as base64 in JSON or as a binary file under property `audio`. When only binary `audio` exists, ensure STT’s **Input Data Field Name** is `audio`, or add a node that provides binary under `data` before STT. For a step‑by‑step PCM S16LE setup, see **IF-PCM-S16LE-AUDIO-TO-STT.md**.
