# n8n: Get JSON (and Hear Audio) — Step-by-Step

This guide breaks down **exactly** what to change in n8n so the webhook returns **JSON** (with `message` and `audio`) instead of raw binary, and the frontend can show text and play TTS.

---

## Part 1: Why This Matters

### What the frontend expects

The chat app expects the webhook **response body** to be **JSON** like this:

```json
{
  "message": "Here is what JARVIS said, sir.",
  "audio": {
    "data": "<long base64 string of the MP3>",
    "format": "mp3"
  }
}
```

- **`message`** → text shown in the chat bubble and **added to chat history**. The Build TTS response node must always set this so the chat interface receives it.
- **`audio.data`** → base64-encoded MP3. The frontend decodes it and creates a playable URL.
- **`audio.format`** → `"mp3"` so it uses the right MIME type.

If the response is **raw MP3 binary** (or any other binary), the app cannot parse it as JSON, cannot read `message` or `audio`, and you get no text and no playable audio.

### Why you sometimes get binary

The **TTS** node (e.g. Cartesia HTTP Request) returns:

- **Binary:** the MP3 file in a binary property (e.g. `binary.data`).
- **JSON:** often just metadata, no `message`, no `audio` object.

If **Respond to Webhook** receives that TTS output directly (or any item that still has binary), n8n can send that item’s **binary** as the response body. Result: the client gets an MP3 stream, not JSON.

So the fix is: **Respond to Webhook must never get input from TTS (or any binary-only node).** It must get input only from a node whose output is **JSON only** and already in the shape `{ message, audio: { data, format } }`.

---

## Part 2: The Correct Chain (Overview)

You want this chain at the end of the workflow:

```
TTS  →  Build TTS response  →  Respond in text  →  Respond to Webhook
```

- **TTS**  
  Input: text to speak.  
  Output: **binary** MP3 (e.g. in `binary.data`) + some JSON.  
  Do **not** connect TTS directly to Respond to Webhook.

- **Build TTS response**  
  Input: TTS output (binary + reply text from earlier nodes).  
  Output: **one item** with **only** `json`, no binary:  
  `{ message: "<reply text>", audio: { data: "<base64 mp3>", format: "mp3" } }`.  
  Binary is turned into base64 and put inside `json.audio`.

- **Respond in text**  
  Input: Build TTS response output.  
  Output: **one item** with **only** `json`, same shape:  
  `{ message: "<reply text>", audio: { data: "<base64>", format: "mp3" } }`.  
  This node keeps only the fields the frontend needs and drops any leftover binary.

- **Respond to Webhook**  
  Input: **must be only** from **Respond in text** (or, if you skip Respond in text, from **Build TTS response**).  
  Setting: **Respond with = First Incoming Item**.  
  Then n8n sends that **first item’s JSON** as the response body → the client gets the JSON above and can show text and play audio.

---

## Part 3: What Each Node Does (Detail)

### 1. TTS (e.g. Cartesia “TTS” HTTP Request)

- **Role:** Call the TTS API and get back an MP3.
- **Input:** Item with `textToSpeak` (or similar) from “Set textToSpeak”.
- **Output:**  
  - `binary.data` = MP3 file.  
  - `json` = whatever the TTS API returns (often not in `{ message, audio }` form).
- **Important:** This output is “binary-heavy”. If Respond to Webhook uses this item, the response can be the raw MP3. So **TTS must not connect to Respond to Webhook**.

### 2. Build TTS response (Code node)

- **Role:** Turn TTS binary + reply text into the structure the frontend expects.
- **Input:** The item from **TTS** (so it has `binary.data` and usually `textToSpeak` or similar).
- **Logic (conceptually):**  
  - Read the reply text from `textToSpeak` / `output` / `message` / `text`.  
  - Read the MP3 from `binary.data`, convert to base64.  
  - Build  
    `out = { message: replyText, audio: { data: base64, format: 'mp3' } }`.  
  - Return **one item** with **only** `json: out` (no binary).
- **Output:** One item, **json-only**, e.g.  
  `{ message: "...", audio: { data: "<base64>", format: "mp3" } }`.

So after this node, the “payload” the frontend needs is already in `item.json`. There is no binary on the item.

### 3. Respond in text (Code node)

- **Role:** Ensure the body is exactly `{ message, audio? }` and that the item has **no binary**.
- **Input:** The item from **Build TTS response**.
- **Logic (conceptually):**  
  - `message = item.json.message` (or a fallback).  
  - `audio = item.json.audio` if present.  
  - Return one item with **only** `json: { message, audio }` (no binary).
- **Output:** One item, **json-only**:  
  `{ message: "...", audio: { data: "<base64>", format: "mp3" } }`.

So the **only** data on the item is this JSON. That’s what you want to send as the webhook body.

### 4. Respond to Webhook

- **Role:** Send the HTTP response body for the webhook request.
- **Input:** Must be **only** the item from **Respond in text** (or from **Build TTS response** if you don’t use Respond in text).
- **Setting:** **Respond with = First Incoming Item.**

With that, n8n takes the **first incoming item** and sends its **JSON** as the response body. Because that item has only `json` and no binary, the body is your `{ message, audio }` object and the frontend can show text and play audio.

---

## Part 4: What to Change in n8n (Step-by-Step)

Do this in your **live** n8n workflow (the one that serves your webhook).

### Step 1: Identify the nodes

In the editor, locate:

- **TTS** (Cartesia or other TTS node).
- **Build TTS response** (Code node that builds `{ message, audio }`).
- **Respond in text** (Code node that keeps only `message` + `audio` in `json`).
- **Respond to Webhook**.

If “Respond in text” is missing, you can use **Build TTS response** as the only node that feeds Respond to Webhook, as long as Build TTS response outputs **json-only** (no binary). The steps below still apply; wherever we say “Respond in text,” use “Build TTS response” instead.

### Step 2: Ensure the chain TTS → Build TTS response → Respond in text

- **TTS** → **Build TTS response**  
  The TTS node’s main output must connect to the Build TTS response node.
- **Build TTS response** → **Respond in text**  
  Build TTS response’s output must connect to Respond in text.

So the flow is: **TTS → Build TTS response → Respond in text**. No other nodes should be between these for the success path.

### Step 3: Make Respond to Webhook receive only from Respond in text

- **Respond to Webhook** may have several **incoming** connections. You only want **one**:
  - **From: Respond in text** (or from Build TTS response if you don’t use Respond in text).
- **Remove** any other incoming connection **to** Respond to Webhook, especially:
  - From **TTS**
  - From any node that outputs binary (other HTTP requests that return files, etc.)

How to do it in the UI:

1. Click **Respond to Webhook**.
2. Look at the **connection lines coming into** this node.
3. For every line that does **not** come from **Respond in text** (or Build TTS response):  
   - Click that connection and delete it, **or**  
   - Drag from the source node and disconnect from Respond to Webhook.

When you’re done, **only** Respond in text (or Build TTS response) feeds Respond to Webhook.

### Step 4: Set “Respond with” to “First Incoming Item”

1. Click **Respond to Webhook**.
2. In the parameters, find **“Respond with”** (or “Respond With”).
3. Set it to **“First Incoming Item”** (not “Binary File”, not “No Data”, not “JSON” with a custom body—unless you explicitly put the same `{ message, audio }` there).

With “First Incoming Item,” n8n sends the **first** item’s **JSON** as the response body. Because that item comes from Respond in text, the body is `{ message, audio }`.

### Step 5: Do not add extra nodes between Respond in text and Respond to Webhook

Anything you put **between** Respond in text and Respond to Webhook could change the item (e.g. add binary again or drop `audio`). So the link should be:

**Respond in text** → **Respond to Webhook**

with nothing in between on the success path.

### Step 6: Double-check the “success” path

For a request that should get TTS audio:

- The execution path must be:  
  … → **Set textToSpeak** → **TTS** → **Build TTS response** → **Respond in text** → **Respond to Webhook**.
- No branch that goes **TTS → Respond to Webhook** (or **TTS → … → Respond to Webhook** without going through Build TTS response and Respond in text).

So: **Respond to Webhook must get its input only from Respond in text (or Build TTS response). It must not get input directly from TTS or any other node that outputs binary.**

---

## Part 5: Checklist

Use this as a quick check in n8n:

| # | Check | Done? |
|---|--------|--------|
| 1 | TTS connects to **Build TTS response** (and only to that, on the success path). | ☐ |
| 2 | Build TTS response connects to **Respond in text**. | ☐ |
| 3 | **Respond in text** connects to **Respond to Webhook**. | ☐ |
| 4 | **Respond to Webhook** has **no** incoming connection from TTS or any binary-output node. | ☐ |
| 5 | **Respond to Webhook** has **only one** incoming connection: from **Respond in text** (or Build TTS response). | ☐ |
| 6 | **Respond with** = **First Incoming Item**. | ☐ |
| 7 | Build TTS response output is json-only `{ message, audio }` (no binary on the item). | ☐ |
| 8 | Respond in text output is json-only `{ message, audio }` (no binary on the item). | ☐ |

---

## Part 6: Why “Respond in text” output is JSON-only

The “Respond in text” node (in your workflow) is a **Code** node that returns something like:

```js
return [{ json: out }];
```

It does **not** do:

```js
return [{ json: out, binary: item.binary }];
```

So the returned item has **only** `json`. No `binary` property.  
When Respond to Webhook uses **First Incoming Item**, it has only JSON to send, so the response body is JSON. That’s why “Respond in text” (or an equivalent node that outputs only `{ message, audio }` in `json`) must be the only input to Respond to Webhook.

---

## Part 7: Verify

After saving and activating the workflow:

1. **From the app:** Send a short text message (e.g. “Hello”). You should see a reply and a play button, and hear audio when you press play.
2. **From the command line:**
   ```bash
   node scripts/test-webhook.mjs "https://n8n.hempstarai.com/webhook/170d9a22-bac0-438c-9755-dc79b961d36e"
   ```
   You should see `OK`, `Message: ...`, and `Audio: base64 length ..., format mp3`.  
   If you see “Response is not JSON” or binary garbage, something still sends binary (e.g. another connection into Respond to Webhook, or Respond with set to “Binary File”).

---

## Part 8: One-Paragraph Summary

**What to change in n8n so you get JSON and hear audio:**  
Use the chain **TTS → Build TTS response → Respond in text → Respond to Webhook**. Ensure **Respond to Webhook** gets its input **only** from **Respond in text** (or from **Build TTS response** if you omit Respond in text), and set **Respond with** to **First Incoming Item**. Do not connect TTS or any binary-output node to Respond to Webhook. Then the webhook response body is the first item’s JSON (`message` + `audio` as base64), and the frontend can show text and play audio.
