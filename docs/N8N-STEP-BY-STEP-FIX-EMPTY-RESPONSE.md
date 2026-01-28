# N8N: Step-by-Step Fix for Empty Webhook Response (No Audio Playback)

Your frontend sends voice (or text) to the N8N webhook and gets **HTTP 200** but **empty response body**. The app needs JSON with `message` and `audio` to show text and play TTS. This guide tells you **exactly what to do inside N8N** so the webhook returns that JSON.

---

## What the frontend expects

The webhook **response body** must be **JSON** like this:

```json
{
  "message": "Here is what JARVIS said, sir.",
  "audio": {
    "data": "<base64-encoded MP3 string>",
    "format": "mp3"
  }
}
```

- **`message`** — Shown in the chat and added to history.
- **`audio.data`** — Base64 MP3 so the app can play it.
- **`audio.format`** — `"mp3"`.

If the response is empty (or binary), the app has nothing to play.

---

## Part 1: Ensure the Webhook waits for “Respond to Webhook”

If the **Webhook** node responds **immediately**, it sends a 200 with an empty body before your workflow runs. It must wait for the **Respond to Webhook** node.

### Steps

1. Open your workflow in N8N (e.g. “JARVIS PORTABLE (fixed)”).
2. Click the **Webhook** node (the one that receives the POST).
3. In the node panel on the right, find **“Respond”** or **“When to Respond”** (or similar).
4. Set it to **“Using ‘Respond to Webhook’ Node”** (or “When Last Node Finishes” / “Response Node” — the option that means “wait for another node to send the response”).
5. Do **not** use “Immediately” or “On Received” if that sends the response before the workflow finishes.
6. Save the workflow.

**Check:** After a run, the webhook should only send the response **after** the **Respond to Webhook** node runs. If it’s “Immediately,” that explains the empty body.

---

## Part 2: Ensure the voice path reaches “Respond to Webhook”

For **voice** requests, the flow must be:

**Webhook → Parse body → Prepare audio → IF (no text) → STT → AI Agent → … → Set textToSpeak → TTS → Build TTS response → Respond in text → Respond to Webhook**

### Steps

1. **IF node (has text?)**  
   - **TRUE** (has text): should go to **Set Transcript (from message)** → then into the same AI chain.  
   - **FALSE** (no text = voice): must go to **STT** (speech-to-text).  
   - Confirm: for voice-only requests, the condition “text/message not empty” is **FALSE**, so the execution goes to **STT**.

2. **STT → AI Agent → AI Agent1 → Set textToSpeak → TTS**  
   - Follow the connections from **STT** all the way to **TTS**.  
   - There must be **no dead ends**. Every path that goes through TTS must then go to **Build TTS response**.

3. **Build TTS response → Respond in text → Respond to Webhook**  
   - **TTS** must connect **only** to **Build TTS response**.  
   - **Build TTS response** must connect to **Respond in text**.  
   - **Respond in text** must connect to **Respond to Webhook**.  
   - **Respond to Webhook** must have **no other incoming connections**. In particular, **TTS must not connect directly to Respond to Webhook**.

4. **Remove wrong connections**  
   - Click **Respond to Webhook** and look at what connects **to** it.  
   - The **only** incoming connection must be from **Respond in text** (or, if you don’t use that node, from **Build TTS response**).  
   - If **TTS** (or any node that outputs binary) is connected to **Respond to Webhook**, remove that connection.

---

## Part 3: Configure “Respond to Webhook” correctly

This node must send the **first item** it receives (from Respond in text) as the response body. It must not send binary or a custom empty body.

### Steps

1. Click the **Respond to Webhook** node.
2. Find **“Respond with”** (or “Response Body” / “What to Send”).
3. Set it to **“First Incoming Item”** (or “Using the data from the first input item”).  
   - That makes N8N use the **JSON** of the first item as the response body.
4. If there is a **“Response Body”** or **“Body”** text field:  
   - **Leave it empty.**  
   - If you put static text or JSON there, it can override the item and you may get that (or empty) instead of `{ message, audio }`.
5. If there is an option like “Send as JSON” or “Content-Type,” ensure the response is sent as **JSON** (N8N usually does this when responding with an item’s JSON).
6. Save the workflow.

---

## Part 4: Verify “Build TTS response” and “Respond in text” output JSON only

These two nodes must produce **one item** whose **json** is exactly `{ message: "...", audio: { data: "<base64>", format: "mp3" } }` and must **not** pass binary through to **Respond to Webhook**.

### Steps

1. **Build TTS response (Code node)**  
   - It should take the TTS output (with binary MP3) and the reply text.  
   - It must output **one item** with **only** `json` (no binary), e.g.  
     `{ message: "<reply text>", audio: { data: "<base64>", format: "mp3" } }`.  
   - If your Code node returns binary or a different shape, edit it so the **only** output is that JSON object.

2. **Respond in text (Code node)**  
   - It should take the output of **Build TTS response**.  
   - It must output **one item** with **only** `json`: `{ message, audio }` (same shape).  
   - No binary.  
   - If you don’t have this node, then **Respond to Webhook** must receive input **only** from **Build TTS response**, and **Build TTS response** must output the JSON shape above (no binary).

---

## Part 5: Run a test execution and inspect where it fails

If the response is still empty, the voice path may be failing before it reaches **Respond to Webhook**. Use N8N’s execution history to see which nodes ran.

### Steps

1. **Trigger the workflow with a voice request**  
   - Use your app (record a short phrase and send) or a tool like Postman:  
     - POST to your webhook URL.  
     - Body: JSON with `audio: { data: "<base64 PCM or WAV>", format: "pcm" }` (and no `message`/`text` so it goes to the voice branch).

2. **Open Executions**  
   - In N8N, go to **Executions** (or “Workflow Executions”) and open the latest run for this workflow.

3. **Check which nodes ran**  
   - See which nodes are **green** (success) and which are **red** (error) or not run at all.  
   - Typical problems:  
     - **Webhook** runs, then **Parse Webhook Body** → **Prepare audio for STT** → **If** → **STT**.  
     - If **STT** is red: STT failed (e.g. no binary, wrong format, or API error). Fix STT input or API key.  
     - If **AI Agent** or **AI Agent1** is red: check credentials and input (e.g. transcript from STT).  
     - If **TTS** is red: check TTS API key and that `textToSpeak` is set.  
     - If **Build TTS response** or **Respond in text** is red: check that they receive the expected input (reply text + binary from TTS for Build TTS response).  
     - If **Respond to Webhook** never runs (grey or missing): an earlier node failed or the path doesn’t connect. Fix the failing node or the connections.

4. **Check input to Respond to Webhook**  
   - Click **Respond to Webhook** in the execution view and look at its **input**.  
   - You should see **one item** with `json.message` and `json.audio.data` (long base64 string).  
   - If there is no input, or input is empty, the problem is that nothing is being passed from **Respond in text** (or **Build TTS response**). Go back and fix that path.

---

## Part 6: Checklist (quick reference)

Use this in N8N:

| # | What to check | Where in N8N |
|---|----------------|--------------|
| 1 | Webhook responds **only** when **Respond to Webhook** runs | Webhook node → “Respond” = “Using ‘Respond to Webhook’ Node” |
| 2 | Voice path: IF (no text) → **STT** → … → TTS → **Build TTS response** → **Respond in text** → **Respond to Webhook** | Connections from If (FALSE) to STT; TTS → Build TTS response → Respond in text → Respond to Webhook |
| 3 | **Respond to Webhook** has **one** incoming connection: from **Respond in text** (or Build TTS response) | Respond to Webhook node → only one incoming edge |
| 4 | **TTS** is **not** connected to **Respond to Webhook** | Respond to Webhook node → no direct connection from TTS |
| 5 | **Respond to Webhook** → “Respond with” = **First Incoming Item** | Respond to Webhook node → Respond with = First Incoming Item |
| 6 | **Respond to Webhook** has no static “Response Body” (or it’s empty) | Respond to Webhook node → Response Body empty |
| 7 | **Build TTS response** output = one item, **json only**: `{ message, audio: { data, format: "mp3" } }` | Build TTS response Code node |
| 8 | **Respond in text** output = same **json only**, no binary | Respond in text Code node |

---

## Part 7: If it still returns empty

- **Execution finishes but body is empty**  
  - Confirm again: **Respond to Webhook** “Respond with” = **First Incoming Item** and **Response Body** is empty.  
  - In the last successful execution, open **Respond to Webhook** and check that its **input** item has `json.message` and `json.audio`. If not, the node that feeds it (Respond in text / Build TTS response) is not sending that shape.

- **Execution fails before Respond to Webhook**  
  - Use Part 5: find the first **red** node, fix its error (credentials, missing input, wrong field names), then run again.

- **Voice path not taken**  
  - For voice, the client sends body with `audio` and no (or empty) `text`/`message`.  
  - In **Parse Webhook Body** and **Prepare audio for STT**, ensure they read `body.audio.data` and attach binary for STT.  
  - In the **IF** node, the condition for “has text” must use `body.text` or `body.message`; when that’s empty, the branch must be the one that goes to **STT**.

Once the execution reaches **Respond to Webhook** with an item that has `message` and `audio`, and “Respond with” is “First Incoming Item,” the response body will be that JSON and the app will show text and play audio.
