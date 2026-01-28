# JARVIS: Chat Memory + Supabase RAG + Subagent Delegation in n8n

This doc describes how to wire the **main AI agent** so it:

1. **Uses chat memory and Supabase vector DB first** — as soon as the agent receives the query, the workflow loads conversation history and runs a vector search so the agent can answer faster (RAG + memory).
2. **Delegates all tasks to a subagent via a tool** — the main agent has one tool, "Delegate to Subagent"; it transfers every task to the subagent. You can add more subagents and tools later.

---

## 1. High-level flow

```
Webhook (message, sessionId, …)
    ↓
Load chat memory (by sessionId)
    ↓
Supabase vector search (embed user query → similarity search)
    ↓
Build context (memory + retrieved chunks)
    ↓
AI Agent (main/orchestrator)
    • System prompt includes: "Conversation history" + "Knowledge base results"
    • Instruction: "Use the delegate_to_subagent tool for all tasks; answer from context only when enough."
    • Tools: [Delegate to Subagent]
    ↓
When agent calls delegate_to_subagent(task)
    → Execute Subagent workflow (task) → return result to agent
    ↓
Agent formats final reply (or returns subagent result)
    ↓
Set textToSpeak → TTS → Build TTS response → Respond to Webhook
```

- **Before the agent**: Memory + vector search run first; their output is injected into the agent’s context so it can answer from memory/RAG when possible.
- **Main agent**: Sees context + user message; uses the **delegate_to_subagent** tool for any task that needs doing; can answer directly only when the context is enough.
- **Subagent**: Runs in a separate workflow; receives `task`, runs its AI (or logic), returns a string result to the main agent.

---

## 2. Chat memory

### Option A: n8n built-in memory (recommended if you use n8n Chat)

- Use the **Memory** store (e.g. **Window Buffer Memory** or **Redis**) attached to the **AI Agent**.
- The agent node can be configured with a **session key** (e.g. `$json.body.sessionId`).
- Memory is loaded automatically by the agent; you don’t need a separate “load memory” node if the agent is the one that has memory attached.
- **Caveat:** If you run “Load memory” *before* the agent (e.g. in a different branch), you need a way to **read** chat history (e.g. Supabase table or Redis) and pass it into the agent’s system/user message. Option B does that.

### Option B: Supabase conversation history (recommended for full control)

- **Table:** e.g. `chat_messages` with `session_id`, `role` (user/assistant), `content`, `created_at`.
- **Load:** After Webhook, use a **Supabase** node: “Get many” rows where `session_id = $json.body.sessionId`, order by `created_at` desc, limit 20 (last 10 turns). Output: array of `{ role, content }`.
- **Inject into agent:** In a **Code** node (or **Set**), format as a string, e.g.  
  `Conversation history:\n` + messages.map(m => `${m.role}: ${m.content}`).join('\n')  
  and put that into a field like `memoryContext` or `conversationHistory`. The **main agent**’s system prompt (or the “user” message that contains the query) should include this field so the agent sees the history.

**Frontend:** Send `sessionId` in every webhook body so the workflow can key memory (see section 7).

---

## 3. Supabase vector database (RAG)

### 3.1 Table (pgvector)

Example schema:

```sql
create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),   -- OpenAI text-embedding-3-small dimension
  metadata jsonb,          -- optional: source, title, etc.
  created_at timestamptz default now()
);

create index if not exists knowledge_base_embedding_idx
  on public.knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

- Use the same embedding model in n8n as you use when inserting (e.g. **OpenAI Embeddings** `text-embedding-3-small`, 1536 dimensions).

### 3.2 Workflow: embed query → search → inject

1. **Embed user query**
   - After Webhook (and after you have the text query from either typed message or STT):
   - Add **OpenAI** (or **Embeddings**) node: input = user message (e.g. `$json.body.message` or `$json.text`), output = embedding array.
   - Pass that embedding to the next step.

2. **Supabase vector search**
   - **Option A – Supabase node + RPC:**  
     In Supabase, create a function that runs a similarity search, e.g.  
     `match_documents(query_embedding vector(1536), match_count int)`  
     returning `id, content, metadata`. Call it via **Supabase** node, operation “Execute a function”, with the embedding and `match_count` (e.g. 5).
   - **Option B – Raw query in Code node:**  
     Use **Supabase** node with a raw SQL expression (if your n8n Supabase node supports it) or an **HTTP Request** to Supabase REST API with an RPC that does the same.

   Example RPC (Supabase SQL):

   ```sql
   create or replace function match_documents(
     query_embedding vector(1536),
     match_count int default 5
   )
   returns table (id uuid, content text, metadata jsonb)
   language plpgsql
   as $$
   begin
     return query
     select k.id, k.content, k.metadata
     from public.knowledge_base k
     order by k.embedding <=> query_embedding
     limit match_count;
   end;
   $$;
   ```

3. **Format and inject into agent context**
   - In a **Code** or **Set** node: take the Supabase result and build a string, e.g.  
     `Knowledge base (relevant excerpts):\n` + results.map(r => r.content).join('\n\n').  
   - Put that in a field like `knowledgeContext` or `ragContext`. The **main agent**’s system prompt (or the message that contains the query) must include this field so the agent sees the RAG results first.

### 3.3 Order in the workflow

- Run **Load chat memory** and **Vector search** in parallel (two branches from Webhook/Set) if you want speed; then **Merge** and **Build context** (memory + RAG) into one object that the agent node will use.
- Or run sequentially: Load memory → Vector search → Build context → AI Agent.

---

## 4. Main agent (orchestrator)

- **Input:** One item that has at least:
  - `message` (user query)
  - `conversationHistory` (string from section 2)
  - `knowledgeContext` (string from section 3)
- **System prompt (concise):**

```
You are JARVIS. Use the conversation history and knowledge base excerpts below to answer when they already contain the answer. For any task that requires action, reasoning, or an answer not fully in the context, use the delegate_to_subagent tool and pass the full task description. Do not make up information; either use context or delegate.

--- Conversation history ---
{{ $json.conversationHistory }}

--- Knowledge base (relevant excerpts) ---
{{ $json.knowledgeContext }}

--- Rules ---
- Prefer answering from the above if sufficient.
- Otherwise call delegate_to_subagent(task) with a clear description of what the user wants.
- Reply in 2–3 short sentences; keep the JARVIS tone (dry wit, "sir").
```

- **Tools:** One tool: **Delegate to Subagent** (see section 5).
- **Memory:** Optional. If you use Supabase for history, you already inject it; you can still attach a small buffer so the agent has “current turn” state.

---

## 5. Tool: Delegate to Subagent

- **Name:** `delegate_to_subagent`
- **Description:**  
  `Call this for any user task that needs to be done: answering a question, performing an action, or generating a response. Pass a clear, full description of the task. Do not use for simple acknowledgements.`
- **Parameters:**  
  - `task` (string, required): Full description of what the user wants (e.g. the question or the action to perform).

**Implementation in n8n:**

- Add an **AI Agent Tool** (or **Custom n8n Workflow Tool**) that runs the **Subagent** workflow.
- **Custom n8n Workflow Tool:**  
  - **Workflow:** Select the “Subagent” workflow (see section 6).  
  - **Parameters:** Map `task` from the tool input to the subworkflow input (e.g. `task` → Subagent workflow’s first node expecting `task`).  
- When the main agent calls `delegate_to_subagent(task: "...")`, n8n executes the Subagent workflow with that `task` and returns the subworkflow’s result (e.g. the subagent’s reply text) back to the main agent. The main agent then uses that text as the final reply (or wraps it in 2–3 sentences in JARVIS tone).

---

## 6. Subagent workflow

- **Trigger:** “Execute Workflow” (called by the main workflow’s **Custom n8n Workflow Tool**).  
  Input: one item with at least `task` (string).
- **Flow:**  
  - **AI Agent** (or **Chat Model**) node: system prompt = JARVIS subagent (e.g. same as your current JARVIS reply agent: short, dry, helpful). User message = `{{ $json.task }}`.  
  - **Set** (or similar): take the AI output and set a single field, e.g. `result`, with the reply text.  
  - **Respond to Webhook** or “return” the item to the caller. When using **Execute Workflow** / **Custom n8n Workflow Tool**, the output of this workflow is what the main workflow receives as the tool result.

So: **Subagent workflow** = receive `task` → run JARVIS AI on `task` → return reply text. The main agent gets that text and can return it (or shorten it) to the user.

---

## 7. Frontend: send `sessionId` for memory

So that n8n can load chat memory by user/session, the frontend should send a stable `sessionId` in every webhook request.

- **Payload:** Add `sessionId` to the body you send to the n8n webhook (e.g. same payload that already has `message`, `timestamp`, `intent`, etc.).
- **Value:** e.g. a UUID per browser tab or per user session (e.g. `crypto.randomUUID()` once per session and reuse). Same session = same conversation history in Supabase (or same n8n memory key).

**Example (in `src/api/n8n.ts`):**

- Add to `N8NSendPayload`: `sessionId?: string;`.
- When building the payload in `sendToN8N`, if you have a session id (e.g. from a React context or storage), set `payload.sessionId = sessionId`.

In n8n, use `$json.body.sessionId` (or your webhook body path) when loading from Supabase or when configuring the agent’s memory session key.

---

## 8. Adding more subagents and tools later

- **More tools:** Add more tool nodes to the **main** agent (e.g. another **Custom n8n Workflow Tool** for “book_calendar”, or “search_docs”). Give each a clear **name** and **description** so the agent knows when to call which tool. In the system prompt, list when to use which tool (e.g. “Use delegate_to_subagent for general tasks; use book_calendar only when the user explicitly asks to create a calendar event.”).
- **More subagents:** Create additional workflows (e.g. “Booking Subagent”, “Search Subagent”). Add one **Custom n8n Workflow Tool** per subagent; the main agent then chooses the right tool (e.g. `delegate_to_subagent` vs `book_calendar`). You can keep a single “general” subagent and add specialized ones over time.
- **Tool parameters:** For each new tool, define parameters (e.g. `task`, `date`, `title`) and map them to the subworkflow input in the **Custom n8n Workflow Tool** configuration.

---

## 9. Summary checklist

| Step | What to do |
|------|------------|
| **Memory** | Store chat in Supabase `chat_messages` (or use n8n Memory). Load by `sessionId` and inject as `conversationHistory` into the main agent context. |
| **RAG** | Embed user query (OpenAI Embeddings) → Supabase vector search (pgvector) → format results as `knowledgeContext` and inject into the main agent. |
| **Context first** | Run “Load memory” and “Vector search” before the main agent; merge into one context object; pass to the agent via system prompt or message. |
| **Main agent** | System prompt includes “Conversation history” + “Knowledge base”; instruction to use context when enough, else call `delegate_to_subagent(task)`. |
| **Tool** | One tool: `delegate_to_subagent(task)`, implemented as **Custom n8n Workflow Tool** that runs the Subagent workflow. |
| **Subagent** | Separate workflow: input `task` → AI (JARVIS) → output reply text; called by the main workflow’s tool. |
| **Frontend** | Send `sessionId` in webhook body so n8n can load conversation history. |
| **Later** | Add more tools (e.g. book_calendar, search_docs) and/or more subagent workflows; connect them to the same main agent and describe in the prompt when to use each. |

This keeps the agent **memory- and RAG-aware first**, and **task execution** fully delegated to the subagent via a single, extensible tool.
