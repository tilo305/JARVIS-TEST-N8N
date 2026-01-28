# JARVIS PORTABLE – Why Audio Stops at the IF Node & Manual-Execute Only

## 1. Workflow never runs automatically (main cause)

**Symptom:** You have to run each node manually with "Execute step." No error; execution doesn’t continue past the IF.

**Cause:** The workflow is **inactive** (`"active": false` in the JSON).  
**Webhooks only trigger workflows that are active.** If the workflow isn’t active, n8n does not run it when the webhook receives a request. You only see data when you manually execute nodes in the editor.

### Fix

1. Open the **JARVIS PORTABLE** workflow in n8n.
2. Toggle **Active** **ON** (top right). The workflow must be **Active** for the webhook to run it.
3. **Save** the workflow.
4. Trigger the webhook again (e.g. from your frontend or Postman). The run should proceed automatically through the IF and the rest of the flow.

**Check:** In **Executions**, you should see new runs when you call the webhook, without pressing "Execute step" yourself.

---

## 2. IF condition typo

**Issue:** The IF node uses:

```text
=={{ ($json.body?.audio?.data || $json.audio?.data) ? 'yes' : '' }}
```

The leading **`==`** is wrong. It can break the expression or produce unexpected values.

**Fix:** Use a **single** `=` (expression):

```text
={{ ($json.body?.audio?.data || $json.audio?.data) ? 'yes' : '' }}
```

- **Value 1 (left):** `={{ ($json.body?.audio?.data || $json.audio?.data) ? 'yes' : '' }}`
- **Operation:** `is not empty` (or `not empty`, depending on your IF node version).

**IF routing (must match):** The IF detects whether the webhook payload contains `audio.data`.  
- **TRUE** (top output) → must connect to **PCM to WAV** → **STT**. Audio present → speech-to-text path.  
- **FALSE** (bottom output) → must connect to **Set Transcript (from message)** → AI Agent. Text-only path.

If TRUE goes to the text branch or FALSE to STT, audio will never reach STT. Check the connections on the IF node.

---

## 3. No binary for STT (audio path)

**Issue:** The flow is **Webhook → IF → STT**.  
The webhook sends **JSON** with base64 in `audio.data`. The IF only forwards that same item.  
The STT node expects **binary** (Form-Data file). There is **no node that creates binary** before STT, so STT never receives a file. That can cause errors or “no data” when you run it.

**Fix:** Add a **Code** node **between the IF (TRUE branch) and STT** that:

1. Reads `body.audio.data` (or `audio.data`) and optional `audio.format` from the webhook payload.
2. **If `audio.format` is MP3** (or mpeg/mpga/audio/mpeg): decode base64 → pass through as **MP3** binary. Cartesia STT accepts MP3.
3. **Otherwise (PCM):** decode base64 → build **WAV** (16 kHz, mono, 16‑bit).
4. Output **binary** in a field (e.g. `data`) for the STT node.

**Flow should be:**

```text
IF (TRUE = has audio) → PCM to WAV (Code) → STT
```

Use the logic from `workflows/code-pcm-to-wav.js` in that Code node.  
In the STT **Form-Data** config, use **n8n Binary File** with **Input Data Field Name** = `data` (same as the Code node’s binary field).

**MP3 from webhook:** If the client sends **MP3** (base64 in `audio.data`), set `audio.format` to `"mp3"` (or `"mpeg"` / `"audio/mpeg"`). The Code node will pass it through as `audio.mp3`; no WAV header is added. Cartesia STT supports MP3.

---

## 4. Webhook body parsing

**Issue:** The Webhook node has `options: {}`. Depending on setup, the payload may be in `$json` or `$json.body`. The IF and Code node both need to read the same structure.

**Fix:**

- Enable **Raw body** on the Webhook (`options` → **Raw Body** = true) if you need consistent `body` parsing.
- In Code/IF, use `body = item.json.body || item.json` and then `body.audio?.data` / `body.audio?.format` / `body.message` so both shapes work.

**Audio format:** Send `audio.format` (e.g. `"mp3"` or `"pcm_s16le"`) so the Code node knows whether to pass through MP3 or build WAV from PCM. If omitted, the node assumes PCM.

---

## 5. Checklist

| # | Check | Action |
|---|--------|--------|
| 1 | Workflow **Active** | Toggle **Active** ON and save. |
| 2 | IF **Value 1** | `={{ ($json.body?.audio?.data \|\| $json.audio?.data) ? 'yes' : '' }}` (no `==`). |
| 3 | IF **Operation** | `is not empty` / `not empty`. |
| 4 | IF **routing** | **TRUE** → PCM to WAV → STT; **FALSE** → Set Transcript → AI Agent. |
| 5 | **PCM to WAV** Code node | On IF **TRUE** branch only; PCM→WAV or MP3 pass-through, output binary `data`. |
| 6 | **STT** | Form-Data file from **binary** `data` (Input Data Field Name = `data`). |
| 7 | **Webhook** | Optional: **Raw Body** ON; use `body` / `json` consistently. |

---

## 6. Reference flow (audio + text)

**Audio path:**

```text
Webhook → IF (has audio?) TRUE → PCM to WAV (Code) → STT → … → TTS → Build TTS response → Respond to Webhook
```

**Text-only path:**

```text
Webhook → IF (has audio?) FALSE → Set “transcript” from message → … (same LLM/TTS path)
```

Use a **Set** node on the FALSE branch to set e.g. `text` = `{{ $json.body?.message || $json.message || '' }}` so the rest of the flow receives a transcript for text-only input.

---

## 7. Quick test

1. **Activate** the workflow and **save**.
2. Send a **text-only** POST (e.g. `{"message": "Hello"}`) to the webhook URL.  
   - Should take FALSE branch, no STT, and still reach your LLM/reply.
3. Send a POST **with** `audio.data` (base64 PCM).  
   - Should take TRUE → PCM to WAV → STT → … → reply.

If you still see “stops at IF” or “manual execute only,” the first thing to verify is that the workflow is **Active** and that you’re using the **Production** webhook URL (not the Test URL) when the workflow is active.

---

## 8. No audio in response when webhook triggered

**Symptom:** The workflow runs, you get a text reply in the chat, but **no sound** plays (no TTS playback).  
**Also:** n8n execution **succeeds**, but the **website** never plays voice.

**Quick fix (most common):** **TTS** is wired **directly** to **Respond to Webhook** (e.g. "Respond IN VOICE"). The website expects JSON `{ message, audio: { data, format: "mp3" } }`. TTS returns **binary** MP3, not that shape, so the response has no playable audio.

1. **Add a Code node** between **TTS** and **Respond to Webhook**. Name it e.g. **Build TTS response**.
2. Paste the code from **`workflows/code-build-tts-response.js`** (see repo). It reads the TTS binary, base64-encodes it, and outputs `{ message, audio: { data, format: "mp3" } }`.
3. **Reconnect:** **TTS** → **Build TTS response** → **Respond to Webhook**. The Respond node must receive input from **Build TTS response**, not from TTS.
4. Set **Respond to Webhook** to **Respond with** = **First Incoming Item**.
5. **Save** and **Activate**, then trigger the webhook again. The site should now play the TTS audio.

**Causes and fixes:**

| Check | Fix |
|-------|-----|
| **TTS → Respond to Webhook directly** | The frontend expects JSON `{ message, audio: { data, format: "mp3" } }`. The TTS node returns **binary** MP3. You must add a **Build TTS response** Code node that converts the TTS binary to base64 and builds that JSON. |
| **Flow** | **TTS** → **Build TTS response** → **Respond to Webhook**. Respond to Webhook must receive input from **Build TTS response**, not from TTS. |
| **TTS Response Format** | In the TTS HTTP Request node, set **Options** → **Response** → **Response Format** = **File**, **Output Property Name** = `data`. Otherwise the MP3 never lands in `binary.data` and the Build node has no audio to encode. |
| **Respond to Webhook** | Use **Respond with** = **First Incoming Item**. The node sends the first input item’s JSON (from Build TTS response) as the response—no Response Body field, so no "Invalid JSON" errors. |

**Build TTS response** logic: read `textToSpeak` (or `$('Set textToSpeak').first().json.textToSpeak`), read TTS `binary.data`, base64-encode it, output `{ message, audio: { data, format: 'mp3' } }`. See `workflows/code-build-tts-response.js` and the Build TTS response node in `jarvis-portable-fixed.json`.

---

## 9. Fixed workflow (import and use)

A corrected workflow is in **`workflows/jarvis-portable-fixed.json`**. It includes:

- **Active** set to `true`
- **Webhook** with `rawBody: true`
- **IF** condition fixed (no `==` typo)
- **PCM to WAV** Code node on the audio branch (IF TRUE → PCM to WAV → STT); supports PCM→WAV or MP3 pass-through when `audio.format` is `"mp3"`
- **Set Transcript (from message)** on the text-only branch (IF FALSE → Set → AI Agent)
- **Set textToSpeak** between AI Agent1 and TTS (so TTS receives `textToSpeak`)
- **TTS** → **Build TTS response** → **Respond to Webhook** (First Incoming Item; `{ message, audio }` for playback)
- **TTS** options: **Response Format** = File, **Output Property Name** = `data`
- **STT** using binary field `data` and Cartesia-Version `2025-04-16`

**Import:** n8n → **Import from File** → select `jarvis-portable-fixed.json`. Reconnect **Groq** credentials, then **Activate** the workflow. Replace the Cartesia API key in the STT/TTS nodes with your own or use n8n **Credentials** (Header Auth) instead of hardcoded values.

---

## 10. "Invalid JSON in 'Response Body' field" (Respond to Webhook)

**Symptom:** The workflow fails at the **Respond to Webhook** node (sometimes named "Respond in TEXT") with:

```text
Invalid JSON in 'Response Body' field
Check that the syntax of the JSON in the 'Response Body' parameter is valid
```

**Cause:** With **Respond with** = **JSON**, n8n parses the **Response Body** as JSON. Expressions like `={{ $json }}` or `={{ JSON.stringify($json) }}` can still produce values that fail validation (e.g. escaping, non‑serializable data), causing this error.

**Fix (recommended):** Use **First Incoming Item** so there is no Response Body field:

1. Open the **Respond to Webhook** node (or "Respond in TEXT").
2. Set **Respond with** = **First Incoming Item**.
3. Leave **Response Body** empty (it is not used).
4. Ensure the node receives input from **Build TTS response** (single item with `{ message, audio? }`). The node will send that item’s JSON as the webhook response.

**Alternative:** If you must use **Respond with** = **JSON**, set **Response Body** to `={{ JSON.stringify($json) }}`. If the error persists, switch to **First Incoming Item** as above.

The workflow `jarvis-portable-fixed.json` uses **First Incoming Item** and does not set Response Body.
