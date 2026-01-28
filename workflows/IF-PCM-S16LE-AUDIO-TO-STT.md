# IF Node: Receive PCM S16LE Audio → TRUE → STT

The frontend sends **PCM S16LE** (16 kHz, mono) in JSON. This guide sets up the **IF** node so it correctly detects that payload as audio, outputs **TRUE**, and routes to **PCM to WAV** → **STT**.

---

## 1. Webhook payload (what you receive)

The app POSTs JSON like:

```json
{
  "message": "",
  "timestamp": "2025-01-27T...",
  "audio": {
    "format": "pcm_s16le",
    "sampleRate": 16000,
    "channels": 1,
    "data": "<base64-encoded PCM bytes>",
    "size": 48000
  }
}
```

- **Format:** `pcm_s16le` (16 kHz, mono, 16‑bit little‑endian).
- **Audio bytes** are in `audio.data` (base64). The IF node only needs to detect that **audio is present**; the **PCM to WAV** node uses `audio.format` and `audio.data` to build WAV for STT.

---

## 2. Add the IF node

1. Insert an **IF** node **directly after** the **Webhook**.
2. Connect **Webhook** → **IF**.
3. Remove any direct Webhook → PCM-to-WAV or Webhook → STT connection.

---

## 3. Configure the IF node so it detects PCM S16LE audio

**Name:** `Has Audio?` (or `PCM S16LE audio?`)

**Single condition:**

| Field | Value |
|-------|--------|
| **Value 1** (left) | `={{ ($json.body?.audio?.data || $json.audio?.data || $binary?.audio) ? 'yes' : '' }}` |
| **Value 2** (right) | *(leave empty)* |
| **Operation** | `is not empty` (String) |

**Important:**

- Use **one** `=` in the expression: `={{ ... }}`. **No** `==` before `{{`.
- The expression is true when **any** of these exist ([n8n Data structure](https://docs.n8n.io/data/data-structure/), [Check incoming data](https://docs.n8n.io/code/cookbook/expressions/check-incoming-data/)):
  - **JSON:** `$json.body?.audio?.data` or `$json.audio?.data` (base64 from parsed body).
  - **Binary:** `$binary?.audio` — when the webhook receives multipart/form-data and stores the file in binary property **`audio`**.
- When the frontend sends PCM S16LE in JSON, `audio.data` exists → **TRUE**.
- When the webhook receives an uploaded file stored as binary **`audio`**, `$binary.audio` exists → **TRUE**.
- When the request is text‑only (no audio in JSON and no binary `audio`), expression is `''` → **FALSE**.

---

## 4. Wire TRUE → PCM to WAV → STT

| IF output | Meaning | Connect to |
|-----------|---------|------------|
| **TRUE** (top) | PCM S16LE (or any) audio present | **PCM to WAV** (Code) → **STT** |
| **FALSE** (bottom) | Text only | **Set** (transcript from `message`) → AI |

**Flow for audio:**

```
Webhook → IF (TRUE) → PCM to WAV → STT → … → AI → TTS → Respond to Webhook
```

- **PCM to WAV** must run on the **TRUE** branch only. Use the logic in `workflows/code-pcm-to-wav.js`: it reads `audio.data` and `audio.format`, decodes base64, builds WAV for `pcm_s16le` (or passes through MP3 if used later), and outputs **binary** `data`.
- **STT** (e.g. Cartesia): use **Form-Data** with **n8n Binary File**, **Input Data Field Name** = `data`.
- **When the webhook sends binary under `audio`:** The IF will correctly route to TRUE. If the item has **only** `binary.audio` (no JSON `audio.data`), either set STT’s **Input Data Field Name** to `audio`, or add a node (e.g. Move Binary Data or Code) that puts the audio into binary property `data` before STT. See [n8n HTTP Request – binary](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/).

---

## 5. Quick checklist

- [ ] **IF** placed right after **Webhook**; **Webhook** → **IF** connected.
- [ ] **Value 1** = `={{ ($json.body?.audio?.data || $json.audio?.data || $binary?.audio) ? 'yes' : '' }}` (no `==`).
- [ ] **Operation** = `is not empty`.
- [ ] **TRUE** → **PCM to WAV** → **STT** (not FALSE → STT).
- [ ] **FALSE** → **Set** (transcript from `message`) → AI.
- [ ] **PCM to WAV** uses `body = item.json.body \|\| item.json` and `body.audio` / `audio.data` / `audio.format` (see `code-pcm-to-wav.js`).
- [ ] Workflow is **Active** so the webhook can trigger it.

---

## 6. Verify

1. Send a voice message from the app (or use `npm run test:webhook:json-audio` with `scripts/test-audio/test-audio.pcm`).
2. In n8n **Executions**, open the run.
3. Check the **IF** node: the **TRUE** branch should have been taken.
4. Check **PCM to WAV** output: **Binary** → `data` (WAV).
5. Check **STT** output: transcript of the audio.

If the IF goes **FALSE** for voice input, check:

- Raw body / parsing: some setups put the JSON in `$json.body`. The expression `$json.body?.audio?.data || $json.audio?.data` covers both.
- Webhook receives JSON with `Content-Type: application/json`; the body is parsed into `$json` (or `$json.body` depending on webhook config).
- Test with `npm run test:webhook:json-audio` (sends PCM S16LE in the same JSON shape as the frontend).

---

## Summary

| Step | Action |
|------|--------|
| 1 | Add **IF** after **Webhook**; connect Webhook → IF. |
| 2 | **Value 1:** `={{ ($json.body?.audio?.data \|\| $json.audio?.data) ? 'yes' : '' }}` |
| 3 | **Operation:** `is not empty`. |
| 4 | **TRUE** → **PCM to WAV** → **STT**. **FALSE** → **Set** (transcript) → AI. |
| 5 | Use **PCM to WAV** from `code-pcm-to-wav.js`; STT reads binary `data`. |

With this, PCM S16LE from the frontend is detected as audio, the IF outputs TRUE, and the flow goes to PCM to WAV → STT.
