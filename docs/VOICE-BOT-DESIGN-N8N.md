# Voice Bot Design in n8n

This doc describes **n8n workflow changes** that align with *Design Principles for Voice User Interfaces* (see `bOoK oN vOiCe BoT dEsIgN.md`). The frontend already implements S2 (system status), S11 (short feedback), S12 (confirmations), S16 (friendly errors), and S17 (cancel/escape).

---

## 1. Conversational markers (natural flow)

Use **discourse markers** in your AI system/assistant prompts so replies feel like a back-and-forth conversation:

- **Timelines:** "First,…", "Next,…", "Last thing,…", "Finally,…"
- **Acknowledgements:** "Got it.", "Alright.", "Thanks.", "One moment."
- **Positive feedback:** "Good.", "Understood.", "Done."

**In n8n:** In your AI node (e.g. OpenAI/Chat model) system prompt, add instructions such as:

- *Use short acknowledgements like "Got it", "One moment", "Alright" before answering.*
- *For multi-step answers, use "First", "Next", "Finally" so the user knows where they are.*

---

## 2. Error handling (S15–S16)

Handle these cases in the workflow and return **short, friendly** messages (no blame, no mock concern):

| Situation | Suggested response (n8n returns `message`) |
|-----------|--------------------------------------------|
| **No speech detected** (STT returns empty) | *"I didn't hear anything. Try again when you're ready."* |
| **Speech not recognized** (STT low confidence or garbage) | *"Could you say that again?"* or *"I didn't quite catch that."* |
| **Recognized but wrong action** | *"I'm not sure I got that. Did you mean X?"* (offer 1–2 options) |
| **Ambiguous intent** | *"Did you mean A or B?"* (S15: escalate, don’t guess) |

**In n8n:**

- After STT: **IF** transcript is empty or too short → Respond to Webhook with a JSON `{ "message": "I didn't hear anything. Try again when you're ready." }`.
- If you have confidence from STT/LLM: **IF** confidence low → return *"Could you say that again?"* (vary wording on retries).
- In the AI node, instruct the model: *If the user’s intent is unclear, ask once: "Did you mean X or Y?" rather than guessing.*

---

## 3. Confirmations (S12)

- **Normal replies:** Confirm **implicitly** (e.g. by answering or by the next prompt).
- **Critical/irreversible actions** (e.g. book a flight, delete data): Confirm **explicitly** in the same turn.

**In n8n:**

- In the AI system prompt, add: *For critical actions (booking, deletion, payment), always confirm explicitly: "I'll [action]. Is that right?" and wait for user confirmation before proceeding.*
- Optionally: when the AI decides a critical action, set a workflow variable or output field (e.g. `requiresConfirmation: true`) and have a follow-up step that only runs after the user confirms (e.g. via a second webhook call or state).

---

## 4. Global escape / Stop (S17)

Allow the user to **cancel** or **stop** at any time:

- **Frontend:** The app already supports **Cancel** while a request is in progress (S17). For voice, the user can say "Stop" or "Cancel"; the workflow can treat that as intent to cancel.
- **In n8n:**  
  - In your intent/routing logic, treat phrases like *"stop"*, *"cancel"*, *"never mind"* as a **cancel** intent.
  - For that intent, **do not** run the main action; simply **Respond to Webhook** with a short message, e.g.  
    `{ "message": "Stopped, sir. Say or type whenever you're ready." }`  
  - No need to call external APIs or change state when the user cancels.

---

## 5. Keep responses short (S11)

- Prefer **short** answers and prompts (lists of 3–5 items; offer "want more?" if there’s more).
- In the AI system prompt: *Keep replies concise. For lists, give at most 3–5 items unless the user asks for more.*

---

## 6. Optional: Persona and consistency (S1)

- Give the agent a **consistent persona** (e.g. JARVIS: polite, "sir", professional).
- In the AI system prompt: describe tone, vocabulary, and any catchphrases so all branches (info, booking, errors) sound like the same agent.

---

## Summary checklist for n8n

- [ ] **Conversational markers:** System prompt asks for "Got it", "One moment", "First/Next/Finally" where appropriate.
- [ ] **No speech:** Branch after STT; if empty → return *"I didn't hear anything. Try again when you're ready."*
- [ ] **Unrecognized / low confidence:** Return *"Could you say that again?"* (vary wording on retry).
- [ ] **Ambiguous intent:** AI asks *"Did you mean A or B?"* instead of guessing.
- [ ] **Critical actions:** Explicit confirmation in the same reply (*"I'll [action]. Is that right?"*).
- [ ] **Stop/Cancel:** Intent "cancel" → respond *"Stopped, sir. Say or type whenever you're ready."* and do not run the action.
- [ ] **Short replies:** System prompt says to keep answers and lists short (S11).
- [ ] **Persona:** One consistent tone and persona across all nodes that generate text.

These changes are all done **inside your n8n workflow** (prompts, IF branches, Respond to Webhook payloads). No frontend code changes are required for the above.
