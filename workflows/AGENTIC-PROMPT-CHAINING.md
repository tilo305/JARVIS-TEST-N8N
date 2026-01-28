# Agentic Prompt Chaining in n8n

This guide shows how to implement **Prompt Chaining** (Pipeline pattern) from *Agentic Design Patterns* inside a single n8n workflow. The idea: break the reply into **sequential steps**; each step’s output is the next step’s input.

---

## Two-step chain example: Summarize → Reply

**Step 1 – Extract/Summarize:** From the user message, produce a short summary or key points.  
**Step 2 – Reply:** Use that summary (and optional context) to produce the final answer or TTS text.

### Flow sketch

```
Webhook
  → [Step 1] LLM or Code: "Summarize / extract key points from: {{ $json.body.message }}"
  → [Step 2] LLM: "Using this summary, write a brief reply: {{ $json.summary }}. User said: {{ $json.body.message }}"
  → (optional) TTS → Build TTS response → Respond to Webhook
```

- **Step 1** runs first; its output must be stored in a field the next node can read (e.g. `summary` or the item’s `json`).
- **Step 2** receives the same item (or a merged item) and uses `summary` plus the original `body.message` to generate the reply.

### Minimal node layout

1. **Webhook** – receives `body.message` (and optionally `body.intent`).
2. **Code or LLM “Summarize”** – input: `$input.item.json.body.message` (or `$json.body.message`); output: one item with `json.summary` (and pass through `body`).
3. **Merge** (if needed) – combine Webhook item and Summarize output so the next node sees both `body` and `summary`.
4. **LLM “Reply”** – system/user prompt uses `{{ $json.summary }}` and `{{ $json.body.message }}`; output goes to your existing “Set textToSpeak” / TTS / Build TTS response / Respond to Webhook.

### Structured handoff (recommended)

To keep the chain reliable, use a **Code** node after Step 1 to shape the handoff, e.g.:

```javascript
// After Step 1 (Summarize)
const body = $input.item.json.body || {};
const summary = $input.item.json.summary ?? $input.item.json.output ?? "";
return [{ json: { ...body, summary } }];
```

Then the Reply node always reads `$json.summary` and `$json.body.message`.

---

## Three-step chain: Extract → Transform → Reply

Same idea, one more step:

1. **Extract** – e.g. “From this message, output JSON: { intent, entities }.”
2. **Transform** – e.g. “Using intent and entities, build a short context string.”
3. **Reply** – “Using this context, answer the user: …”

Each step’s output is the next step’s input; use **Code** or **Set** nodes to keep `json` in a clean shape for the next LLM.

---

## Payload hooks for multi-call chains (frontend)

If you later want the **frontend** to drive a multi-step chain (e.g. “step 1” then “step 2” in two requests), the webhook body can support:

- `chainStep?: number` – 1, 2, 3…
- `chainContext?: object` – output from the previous step, so the next run can continue the chain.

The current JARVIS app sends one message and gets one reply; prompt chaining is implemented **inside** the workflow. These fields are optional for future use.

---

## References

- *Agentic Design Patterns*, Ch. 1: Prompt Chaining.
- **docs/AGENTIC-PATTERNS-IN-JARVIS-N8N.md** – pattern map for JARVIS + n8n.
- **workflows/BUILD-TTS-RESPONSE-STEP-BY-STEP.md** – how the final reply is turned into `{ message, audio }` for the frontend.
