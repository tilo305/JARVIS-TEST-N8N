# n8n MCP: Best Implementation Step-by-Step (Video-Style)

This guide follows the **MCP Server + Parent Agent** pattern from the video: build an **MCP Server** workflow (Trigger + tools only, no agent) and a **Parent** workflow (Chat → Agent → Model + Memory + **MCP Client Tool**). The agent uses the MCP server’s tools directly—one point of failure instead of two.

---

## Why MCP Instead of “Call Workflow”?

**Traditional (Call Workflow):**

- **Parent:** Chat → Agent → **Call Workflow** → subworkflow.
- **Subworkflow:** Receives input → **Agent** → tools → response.
- **Two failure points:**  
  1. Does the parent agent pick the **right subworkflow**?  
  2. Does the subworkflow agent pick the **right tool**?
- That depends heavily on prompts and can lead to the wrong actions.

**MCP:**

- **Parent:** Chat → Agent → Model + Memory + **MCP Client Tool**.
- **MCP Server workflow:** **MCP Server Trigger** + **tool nodes** only. **No** agent, **no** system/user prompts.
- **One failure point:** Does the parent agent pick the **right MCP tool**?
- The server only **lists** its tools; the parent agent decides which to use. Simpler prompts, fewer mistakes, more modular.

---

## Overview

| Workflow | Contains | Purpose |
|----------|----------|---------|
| **MCP Server** | MCP Server Trigger + tool nodes (e.g. Google Calendar, Custom n8n Workflow) | Expose tools. No agent. |
| **Parent** | Chat → Agent → Model + Memory + **MCP Client Tool** | User chat + agent that calls MCP tools |

You’ll build the **MCP Server** first, then the **Parent** workflow, and connect them via the **MCP Client Tool** (SSE endpoint = MCP Server Production URL).

---

## Part 1: Build the MCP Server Workflow

### Step 1.1: Create the workflow and add MCP Server Trigger

1. **Workflows** → **Add workflow**.
2. Name it (e.g. **Calendar MCP Server** or **JARVIS MCP Server**).
3. Add a node → search **MCP** → add **MCP Server Trigger**.
4. In the node you’ll see **Test URL** and **Production URL** (like a webhook).  
   - **Test:** use when testing or workflow inactive.  
   - **Production:** use when workflow is **active** and **published**.
5. (Optional) Set **Authentication** (Bearer or Header) and **Path**. For production, set both.

**✓ Check:** MCP Server Trigger is on the canvas; Test and Production URLs are visible.

---

### Step 1.2: Add tool nodes and connect them to the trigger

Add **tool** nodes and connect **each** to the **MCP Server Trigger**. The trigger only connects to tools—no other nodes.

**Example A – Google Calendar (like the video)**

1. Add **Google Calendar** node (or equivalent tool) → connect **MCP Server Trigger** → **Google Calendar**.
2. Configure:
   - **Resource:** Events  
   - **Operation:** Create event  
   - **Calendar:** your calendar (e.g. Demo)  
   - **Start / End time:** set so the **agent** can provide them (e.g. from expressions).  
   - **Summary**, **Description:** allow agent to fill them.
3. **Name the tool:** in the node, set **Name** to something clear (e.g. **Create event**).
4. Add more tools as needed (e.g. **Delete event**):
   - **Operation:** Delete  
   - **Event ID:** agent-provided  
   - **Name:** **Delete event**.

**Example B – JARVIS (or any workflow)**

1. Add **Custom n8n Workflow Tool** → connect **MCP Server Trigger** → **Custom n8n Workflow Tool**.
2. Configure:
   - **Workflow:** e.g. **JARVIS Cartesia Voice**.
   - **Name:** e.g. **Run JARVIS voice**.
   - **Description:** e.g. *Use for voice/chat with JARVIS. Handles text and audio.*
   - **Parameters:** match what the JARVIS workflow expects (e.g. message, etc.).

**✓ Check:** Every tool you want exposed is connected **to** the MCP Server Trigger. Tools have clear **names**.

---

### Step 1.3: Activate and save

1. Turn the workflow **Active** (toggle top right).
2. **Save** the workflow.
3. Open the **MCP Server Trigger** again → switch to **Production URL** → **copy** it.  
   You’ll paste this into the **MCP Client Tool** in the parent workflow.

**✓ Check:** Workflow is active and saved; you have the **Production URL** copied.

---

## Part 2: Build the Parent Workflow (Agent + MCP Client Tool)

### Step 2.1: Chat trigger and Agent

1. **Workflows** → **Add workflow** (or use an existing agent workflow).
2. Add **Chat** trigger (or **Chat Trigger**).
3. Add **Agent** node → connect **Chat** → **Agent**.
4. Add **Model** and **Memory** (or your usual AI setup) and connect them to the Agent.

**✓ Check:** Chat → Agent → Model + Memory.

---

### Step 2.2: Add MCP Client Tool

1. Add **MCP Client Tool** node (search “MCP Client Tool”).
2. Connect it to the **Agent** (as a tool input).
3. Configure:
   - **SSE Endpoint:** paste the **Production URL** from your MCP Server Trigger (Step 1.3).  
     This connects the parent agent to your MCP Server workflow.
   - **Authentication** / **Path:** match what you set on the MCP Server Trigger (if any). Use them in production.

**✓ Check:** MCP Client Tool is connected to the Agent and uses the MCP Server **Production** URL.

---

### Step 2.3: Choose which tools the agent can use

In the **MCP Client Tool**:

- **Tools to Include:**
  - **All** – agent can use every tool the MCP server exposes.
  - **Selected** – pick specific tools (e.g. only **Create event**).
  - **All Except** – exclude specific tools (e.g. allow create but not delete).

Use this to put **guardrails** on each agent: e.g. one agent only creates events, another can create and delete.

**✓ Check:** You’ve chosen All, Selected, or All Except and configured any selected/excluded tools.

---

### Step 2.4: Add the Agent system message

1. Open the **Agent** node.
2. Set **System Message** (or equivalent). Keep it short; the MCP server already defines what each tool does.

**Example (Calendar MCP):**

```
You are a helpful assistant.

Calendar MCP: use this tool for all scheduling and calendar-related queries.

Please note today's date and time: {{ $now }}.
```

**Example (JARVIS + Calendar):**

```
You are a helpful assistant.

- Calendar MCP: use for scheduling and calendar queries.
- JARVIS MCP: use for voice/chat with JARVIS (text or audio).

Note today's date and time: {{ $now }}.
```

**✓ Check:** System message tells the agent **when** to use which MCP tool; no need to describe tool parameters in detail.

---

### Step 2.5: Save the parent workflow

1. **Save** the workflow.

**✓ Check:** Parent workflow is saved.

---

## Part 3: Test

1. Open the **parent** workflow.
2. Use the **Chat** panel (or test UI).
3. Send a message that matches your MCP tools, e.g.:
   - **Calendar:** *“Please add a dinner to my calendar for 6 p.m. tonight.”*
   - **JARVIS:** *“Send a message to JARVIS: Hello.”*
4. Confirm:
   - The agent uses the **MCP Client Tool**.
   - The **MCP Server** workflow runs (tool executed).
   - **Executions** in n8n show both the parent and the MCP server run.

**✓ Check:** The agent calls the right MCP tool and the action succeeds (e.g. event created, JARVIS replied).

---

## Summary

| Part | What you do |
|------|-------------|
| **1. MCP Server** | New workflow → **MCP Server Trigger** → add **tool nodes** (Calendar, Custom n8n Workflow, etc.) → **name** tools → **Activate** & **Save** → copy **Production URL**. |
| **2. Parent** | **Chat** → **Agent** → **Model** + **Memory** → **MCP Client Tool** (SSE = Production URL, choose **Tools to Include**) → **System message** (when to use which MCP) → **Save**. |
| **3. Test** | Chat a request that requires an MCP tool; confirm the agent uses it and the MCP server runs. |

---

## Tips from the video

- **No agent in the MCP Server:** Only Trigger + tools. The parent agent does all the “thinking.”
- **Name your tools** in the MCP server so they’re clear in the MCP Client Tool (e.g. **Create event**, **Delete event**, **Run JARVIS voice**).
- **Use “Tools to Include”** to limit what each agent can do (e.g. create-only vs create+delete).
- **Simple system message:** Point the agent at the right MCP tool and add context like `{{ $now }}`; tool descriptions live in the MCP server.

---

## References

- [MCP Server Trigger node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/)
- [MCP Client Tool node](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp)
- `docs/n8n MCP.md` (overview and Instance-level vs MCP Server)
