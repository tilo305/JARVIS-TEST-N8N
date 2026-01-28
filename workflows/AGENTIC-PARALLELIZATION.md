# Agentic Parallelization in n8n

This guide shows how to run **independent sub-tasks in parallel** (Parallelization pattern from *Agentic Design Patterns*) inside a single n8n workflow, then merge results into one reply.

---

## Flow sketch

```
Webhook
  → Branch 1: HTTP Request / LLM "Search news for {{ $json.body.message }}"
  → Branch 2: HTTP Request / LLM "Search products for {{ $json.body.message }}"
  → Branch 3: HTTP Request / LLM "Search docs for {{ $json.body.message }}"
  → Merge / Code: combine Branch 1–3 outputs into one item
  → LLM "Synthesize": "Using these findings, answer: {{ $json.body.message }}"
  → (optional) TTS → Build TTS response → Respond to Webhook
```

- **Parallel:** All three branches start from the same trigger/item. n8n runs them concurrently when they have no dependency on each other.
- **Merge:** Use a **Merge** node (e.g. “Combine by position”) or a **Code** node that reads `$input.all()` and builds one item with `news`, `products`, `docs` (or similar keys).
- **Synthesize:** One LLM node uses the merged JSON to produce the final answer.

---

## Merge with Code (example)

After the three parallel branches, add a **Code** node that receives all branch outputs:

```javascript
// Run Once for All Items
const items = $input.all();
const body = (items[0]?.json?.body ?? items[0]?.json) || {};
const news   = items.find(i => i.json?.source === "news")?.json ?? items[0]?.json;
const prod   = items.find(i => i.json?.source === "products")?.json ?? items[1]?.json;
const docs   = items.find(i => i.json?.source === "docs")?.json ?? items[2]?.json;

return [{
  json: {
    body,
    news: news?.result ?? news?.output ?? news,
    products: prod?.result ?? prod?.output ?? prod,
    docs: docs?.result ?? docs?.output ?? docs,
  }
}];
```

Adjust `source` and field names to match your branch outputs. The next node (e.g. LLM) can use `$json.news`, `$json.products`, `$json.docs` in its prompt.

---

## References

- *Agentic Design Patterns*, Ch. 3: Parallelization.
- **docs/AGENTIC-PATTERNS-IN-JARVIS-N8N.md** – pattern map.
- **workflows/BUILD-TTS-RESPONSE-STEP-BY-STEP.md** – turning the reply into `{ message, audio }`.
