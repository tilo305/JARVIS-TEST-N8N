# Test the Full Pipeline and Hear Audio Output

This guide walks you through testing the full text + audio pipeline and hearing JARVIS reply with TTS.

---

## 1. Prerequisites

- **N8N workflow** is active and uses your webhook URL.
- **Respond to Webhook** receives **only** from **Respond in text** (or **Build TTS response**), and is set to **Respond With → First Incoming Item**. The item must be **JSON only** (no binary). If the webhook returns raw MP3 instead of JSON, see [Section 4](#4-if-you-get-binary-instead-of-json) below.
- **Dev server** and **browser** on your machine.

---

## 2. Start the App

```bash
npm run dev
```

Note the URL (e.g. `http://localhost:8080/` or `http://localhost:8082/`). Open it in your browser.

---

## 3. Test and Hear Audio

### A. Text path (type a message)

1. In the chat input, type a short message, e.g. **"Hello"** or **"Ready?"**.
2. Click **Send** (or press Enter).
3. You should see:
   - Your message in chat.
   - An assistant reply (text) under it.
   - An audio control (e.g. play button) on the assistant message.
4. Click **Play** on the assistant message. You should **hear** the TTS reply.

If you get text but no play button or no sound, the response likely has no `audio` or the webhook returned binary instead of JSON → go to [Section 4](#4-if-you-get-binary-instead-of-json).

### B. Voice path (mic)

1. Click the **microphone** button to start recording.
2. Say something short, e.g. **"What time is it?"**.
3. Wait for **silence** so VAD auto-sends (or click Send when you see “Audio recorded”).
4. You should see:
   - Your voice message (and transcript if the workflow returns it).
   - An assistant reply (text).
   - An audio control on the assistant message.
5. Click **Play** to **hear** the TTS reply.

---

## 4. If You Get Binary Instead of JSON

If the webhook returns **raw MP3** (or other binary) instead of JSON, the frontend cannot show text or build a playable URL from `audio.data`. That usually means **Respond to Webhook** is sending the wrong data.

**Check in N8N:**

1. **Respond to Webhook** must receive input **only** from **Respond in text** (or from **Build TTS response** if you removed Respond in text).
2. **Do not** connect **TTS** (or any node that outputs binary) directly to **Respond to Webhook**. The TTS node outputs binary; the frontend expects `{ message, audio: { data: "<base64>", format: "mp3" } }`.
3. **Respond with** must be **First Incoming Item**. The first item must be the one from **Respond in text**, whose `json` is `{ message, audio: { data, format } }` and has **no** binary property. Then n8n will send that JSON as the response body.
4. Flow must be:  
   **TTS → Build TTS response → Respond in text → Respond to Webhook**.

After fixing that, run the tests again; you should get JSON and hear audio.

---

## 5. Quick Backend Check (optional)

To confirm the webhook returns **JSON with message + audio** (and not binary):

**Text:**

```bash
node scripts/test-webhook.mjs "https://n8n.hempstarai.com/webhook/170d9a22-bac0-438c-9755-dc79b961d36e"
```

Expected: `OK` and a line like `Message: ...` and `Audio: base64 length ..., format mp3`.  
If you see `Response is not JSON` or binary garbage, the workflow is still returning binary → fix as in Section 4.

**Voice (JSON body, like the frontend):**

```bash
npm run test:audio:generate   # once, to create test PCM
npm run test:webhook:json-audio
```

Expected: `OK`, `Message: ...`, and `Audio: base64 length ...` when the workflow returns TTS.

---

## 6. Checklist

- [ ] Dev server running, app open in browser.
- [ ] Text test: type "Hello" → see reply text + play button → hear audio.
- [ ] Voice test: mic → speak → see reply + play button → hear audio.
- [ ] In N8N: Respond to Webhook is fed only by Respond in text (or Build TTS response), and Respond with = First Incoming Item.
- [ ] `node scripts/test-webhook.mjs <webhook_url>` returns JSON with `message` and `audio.data`.
