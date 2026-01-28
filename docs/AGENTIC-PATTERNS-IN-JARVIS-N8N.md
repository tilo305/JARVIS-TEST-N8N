# Agentic Design Patterns in JARVIS + n8n

This doc maps the **21 Agentic Design Patterns** from *Agentic Design Patterns: A Hands-On Guide to Building Intelligent Systems* to the JARVIS stack: **React + TypeScript frontend** and **n8n workflows** as the backend “canvas.” The book uses Python/LangChain/Google ADK; here we apply the same ideas using n8n nodes and frontend logic.

---

## 1. Prompt Chaining (Pipeline)

**Book idea:** Break a complex task into sequential steps; output of step N is input to step N+1.

**In JARVIS/n8n:**

- **n8n:** Build workflows as chains: e.g. **Webhook → Extract/Summarize (Code or LLM) → Transform/Format (Code or LLM) → Respond to Webhook**. Each node’s output is the next node’s input.
- **Structured output:** Use a **Code** node to ensure the handoff is JSON (e.g. `{ "summary": "...", "entities": [...] }`) so the next step gets clean input.
- **Frontend:** The app sends one message and receives one reply. Multi-step logic lives in the workflow. For true “chained” UI (e.g. “Step 1 of 3…”), you’d need either:
  - Streaming / partial responses, or
  - Multiple webhooks (e.g. “step” in the payload) and the app calling the webhook more than once per user turn. See *workflows/AGENTIC-PROMPT-CHAINING.md* for a 2-step chain example.

**Payload:** Optional `chainStep?: number` and `chainContext?: object` if you later add multi-call chains from the frontend.

---

## 2. Routing

**Book idea:** Classify input (e.g. intent) and send it to different tools, sub-agents, or workflows.

**In JARVIS/n8n:**

- **n8n:** Add an **IF** or **Switch** node after the Webhook:
  - **Option A – Client-provided intent:** If the frontend sends `intent: "booker" | "info" | "general"`, branch on `$json.body.intent` (or `$input.item.json.body.intent`).
  - **Option B – Server-side classifier:** Add an LLM node (or a **Code** rule-based classifier) that sets `intent` on the item, then a **Switch** on `$json.intent` to different branches (e.g. “booking” vs “info” vs “general”).
- **Frontend:** The app can send an optional `intent` so n8n doesn’t need to call an LLM to classify. See *Routing in the frontend* below.

**Payload:** The webhook body can include `intent?: "booker" | "info" | "general"`. If present, the workflow uses it for branching; if absent, the workflow can compute intent itself.

---

## 3. Parallelization

**Book idea:** Run independent sub-tasks concurrently, then merge results.

**In n8n:**

- Use **multiple branches** from one node: e.g. one Webhook/Trigger, then three branches (e.g. “search news,” “search product DB,” “search docs”) that all run in parallel. Use a **Merge** or **Join** node (or a **Code** node that combines `$input.all()`) to aggregate, then one LLM/response step.
- **Frontend:** If you add more than one webhook (e.g. “summary” and “suggestions”), the app can call them in parallel with `Promise.all([fetch(summaryUrl), fetch(suggestionsUrl)])` and merge before rendering.

**Payload:** No change required for the current single-webhook design. Optional `parallelKeys?: string[]` could tell the workflow which parallel branches to run if you add dynamic branching later.

**Workflow sketch:** Webhook → split into 3 branches (e.g. HTTP Request “news”, HTTP Request “products”, HTTP Request “docs”) → Merge/Join or Code that does `const items = $input.all(); return [{ json: { news: items[0]?.json, products: items[1]?.json, docs: items[2]?.json } }]` → LLM “Synthesize” → Respond to Webhook.

---

## 4–21. Other patterns (short mapping)

| Pattern | In n8n | In frontend |
|--------|--------|-------------|
| **Tool Use** | HTTP Request, Code, and other nodes as “tools”; LLM decides when to call them (e.g. via n8n + AI node or sub-workflows). | Send `message` (+ optional `intent`); receive `message` (+ optional `audio`, `transcript`). |
| **Memory** | Store/retrieve state in n8n (Redis, DB, or workflow static data); pass `sessionId` in body and use it in nodes. | Send `sessionId` (and optionally `userId`) in every request so n8n can key memory. |
| **Reflection / Self-correction** | Extra LLM node that reviews the first reply and produces a revised one; chain Reflect → Respond. | No change if reflection is inside the workflow. |
| **RAG** | “Retrieve” branch: vector search or lookup node → inject into LLM context → “Generate” node. | Unchanged; RAG is inside n8n. |
| **Multi-Agent** | Several workflows or sub-flows acting as “agents”; Router workflow calls different webhooks or sub-workflows by intent. | Same as Routing: send `intent` or let n8n classify and route. |
| **Guardrails / Safety** | Pre-LLM Check (content filter, PII redaction) and/or Post-LLM Check nodes; only pass “safe” content to Respond to Webhook. | Optional `skipGuardrails?: boolean` for trusted/internal use only; default false. |
| **Orchestration** | The main workflow is the orchestrator; Router + Prompt Chaining + Parallelization compose the steps. | Single `sendToN8N(...)` call; orchestration is in n8n. |

---

## Routing in the frontend

The app can optionally **classify intent** before sending to n8n and add `intent` to the payload so the workflow can branch without an extra LLM call.

- **`intent: "booker"`** – booking-related (flights, hotels, reservations).
- **`intent: "info"`** – general information, Q&A.
- **`intent: "general"`** – anything else or unclear.

Implementation details:

- **Payload:** In `sendToN8N`, the body already includes `message`, `timestamp`, and optionally `audio` / `attachments`. We add an optional field: `intent?: "booker" | "info" | "general"`.
- **Router logic:** A small function `classifyIntent(message: string): "booker" | "info" | "general"` can use keywords (e.g. “book”, “flight”, “hotel”, “reservation”) → `booker`; otherwise `info`. Optionally you can later replace this with a tiny local model or a dedicated “classifier” webhook.
- **Config:** If you add a separate “router” webhook URL, the app could call it first, get `intent`, then call the main webhook with that `intent`. For now, client-side keyword routing is enough to demonstrate the pattern.

---

## Files touched for “execute Agentic Design Patterns”

1. **docs/AGENTIC-PATTERNS-IN-JARVIS-N8N.md** (this file) – pattern map and how to use Routing / Chaining / Parallelization.
2. **src/api/n8n.ts** – `N8NSendPayload` gains `intent?: "booker" | "info" | "general"`; `classifyIntent(message)` runs on the text message and `intent` is always sent when `message` is non-empty so n8n can branch on it.
3. **workflows/AGENTIC-PROMPT-CHAINING.md** – minimal 2-step prompt chain (e.g. “summarize → reply”) as an n8n workflow sketch.
4. **workflows/AGENTIC-PARALLELIZATION.md** – parallel branches + merge + synthesize as an n8n workflow sketch.

---

## References

- *Agentic Design Patterns: A Hands-On Guide to Building Intelligent Systems* (source of the 21 patterns).
- Existing JARVIS docs: `workflows/BUILD-TTS-RESPONSE-STEP-BY-STEP.md`, `workflows/IF_AUDIO_VS_TEXT_SETUP.md`, `docs/N8N_INTEGRATION_VERIFICATION.md`.
