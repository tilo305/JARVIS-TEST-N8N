# n8n MCP: Creating and Using MCP Servers in n8n

This guide shows how to **create an MCP (Model Context Protocol) server in n8n**—i.e. how n8n can act as an MCP server so that AI clients (e.g. Claude Desktop, Lovable) can discover and run your workflows. It uses [docs.n8n.io](https://docs.n8n.io) and concepts from the MCP implementation guide.

---

## What is MCP?

The **Model Context Protocol (MCP)** is a standard way to connect LLMs to external services. MCP defines:

- **Tools**: Functions an AI can call (e.g. run a workflow, search data).
- **Resources**: Data sources the AI can read.
- **Prompts**: Reusable prompt templates.

When n8n acts as an **MCP server**, it exposes **tools** (and related metadata) that MCP **clients** (Claude Desktop, Lovable, etc.) can list and invoke. Those tools are backed by your n8n workflows.

---

## Two Ways to Create an MCP Server in n8n

n8n gives you two main options:

| Approach | What it does | Best for |
|----------|--------------|----------|
| **Instance-level MCP** | One MCP server per n8n instance. You enable MCP, then choose which **published** workflows to expose. Clients connect once and see all enabled workflows. | Centralized access, many workflows, simple setup. |
| **MCP Server Trigger node** | You build a **single workflow** that acts as an MCP server. You add an MCP Server Trigger plus **tool nodes** (e.g. Custom n8n Workflow Tool, Code). That workflow exposes a dedicated MCP URL. | Custom MCP behavior per workflow, explicit control over which tools are exposed. |

---

## Option 1: Instance-Level MCP Server

This turns your **n8n instance** into an MCP server. Clients connect to your instance URL and can search, list, and trigger workflows you’ve enabled.

### 1. Enable MCP Access

1. Open **Settings** → **Instance-level MCP**.
2. Turn **Enable MCP access** **On** (instance owner/admin only).

You’ll see:

- Workflows exposed to MCP
- Connected OAuth clients (if using OAuth)
- Main MCP toggle
- **Connection details** (for connecting clients)

### 2. Expose Workflows

A workflow is available to MCP only if it:

1. Is **published**.
2. Has one of these **trigger** nodes: **Webhook**, **Schedule**, **Chat**, **Form**.

Then **enable MCP** for each workflow you want to expose:

- **From MCP settings**: Use **Enable workflows** → search → **Enable**.
- **From workflow editor**: Workflow menu (⋮) → **Settings** → toggle **Available in MCP**.
- **From workflows list**: Workflow card menu → **Enable MCP access**.

Add a **workflow description** (workflow menu → **Edit description**) so clients can identify it.

### 3. Configure Authentication

In **Connection details** you can use:

- **OAuth2**: Clients use your instance URL and are redirected to n8n to authorize.
- **Access Token**: Use your instance URL + **MCP Access Token** (created automatically; **copy it immediately**—later you only see a redacted value).

### 4. Connect Clients to Your n8n MCP Server

**Claude Desktop (OAuth2):**

1. **Settings** → **Connectors** → **Add custom connector**.
2. **Name**: e.g. `n8n MCP`.
3. **Remote MCP Server URL**: Your n8n base URL (from Instance-level MCP).
4. Save and authorize when prompted.

**Claude Desktop (Access Token):**  
Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--streamableHttp",
        "https://<your-n8n-domain>/mcp-server/http",
        "--header",
        "authorization:Bearer <YOUR_N8N_MCP_TOKEN>"
      ]
    }
  }
}
```

Replace `<your-n8n-domain>` and `<YOUR_N8N_MCP_TOKEN>` with your n8n URL and token.

**Lovable:**

1. **Settings** → **Integrations** → **MCP Servers** → **n8n** → **Connect**.
2. Enter your n8n server URL (from MCP Access page).
3. Save; you’ll be redirected to n8n to authorize.

### 5. Limitations (Instance-Level)

- MCP is for **running** workflows, not editing them.
- Only **enabled** workflows are visible.
- All connected clients see the same set of enabled workflows.
- Workflow execution via MCP has a **5-minute** timeout.
- **Binary** input isn’t supported; only text-like inputs.

### 6. Disable MCP

- **Toggle off**: In **Instance-level MCP**, turn the main MCP switch **Off**.
- **Fully disable (self‑hosted)**: Set `N8N_DISABLED_MODULES=mcp` so MCP is removed entirely.

---

## Option 2: MCP Server Trigger Workflow

Here you **create a workflow** that **is** an MCP server. You define exactly which tools are exposed and how they map to n8n logic.

### 1. Create a New Workflow

Start an empty workflow.

### 2. Add the MCP Server Trigger Node

1. Add the **MCP Server Trigger** node (search “MCP Server Trigger” or “MCP”).
2. This node **does not** pass data to a linear chain like a normal trigger. It **only** connects to **tool** nodes. Clients call those tools over MCP.

### 3. Configure the MCP Server Trigger

- **MCP URL**: The node shows **Test** and **Production** URLs.
  - **Test**: Used when the workflow is in test mode (e.g. “Listen for Test Event”) or not active. Calls appear in the workflow UI.
  - **Production**: Used when the workflow is **published**. Executions show in **Executions**.
- **Authentication**: Optionally use **Bearer** or **Header** auth (via HTTP Request–style credentials).
- **Path**: By default, a random path is used. You can set a custom path if you need a stable URL.

The node supports **SSE** and **streamable HTTP** (not stdio).

### 4. Add Tool Nodes

Connect **tool** nodes to the MCP Server Trigger. For example:

- **Custom n8n Workflow Tool**: Exposes **another** n8n workflow as an MCP tool. Configure the sub-workflow and parameters.
- **Code** node: Implement custom logic and expose it as a tool (when used in an MCP/tool context).
- Other nodes that behave as tools in this setup.

Design each tool so it does one clear thing. Tool **names** and **descriptions** are what the AI sees—make them clear and specific.

### 5. Publish and Use the MCP URL

1. **Publish** the workflow.
2. Use the **Production** MCP URL from the MCP Server Trigger in your MCP client.

### 6. Connect Claude Desktop to Your MCP Server Trigger

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "<MCP_URL>",
        "--header",
        "Authorization: Bearer ${AUTH_TOKEN}"
      ],
      "env": {
        "AUTH_TOKEN": "<MCP_BEARER_TOKEN>"
      }
    }
  }
}
```

Replace `<MCP_URL>` with the Test or Production URL from the node, and `<MCP_BEARER_TOKEN>` with your configured token.

### 7. Reverse Proxy (e.g. nginx)

If n8n is behind a reverse proxy, configure the MCP path for SSE/streamable HTTP. For nginx, for example:

```nginx
location /mcp/ {
  proxy_http_version 1.1;
  proxy_buffering off;
  gzip off;
  chunked_transfer_encoding off;
  proxy_set_header Connection '';
  # ... rest of proxy config
}
```

### 8. Queue Mode / Multiple Webhook Replicas

- **Single webhook replica**: MCP Server Trigger works as usual.
- **Multiple webhook replicas**: Route all **/mcp*** traffic to **one** dedicated webhook replica. Otherwise SSE/streamable HTTP can break.

---

## Using External MCP Servers from n8n

n8n can also **consume** MCP servers (act as an MCP **client**):

- **MCP Client** node: Use tools from an external MCP server as **workflow steps** (no AI agent).
- **MCP Client Tool** node: Use tools from an external MCP server **inside an AI Agent** (e.g. Chat model + tools). Connect it to your model and choose which tools to include.

Configure **Server transport**, **MCP endpoint URL**, and **Authentication** (Bearer, header, or OAuth2) as required by the external server.

---

## MCP Concepts (from the Implementation Guide)

When **building** your own MCP servers (e.g. in Python or TypeScript, outside n8n), keep in mind:

- **Tools**: Functions the AI can call. Descriptions (docstrings / metadata) are critical—they tell the model when and how to use each tool.
- **Lifespan**: Initialize shared resources (DB, API clients) once at startup and clean up on shutdown.
- **Transports**: **SSE** or **streamable HTTP** for remote access; **stdio** for local, client-managed processes. n8n’s MCP Server Trigger uses SSE/streamable HTTP.
- **Errors**: Tools should return error messages as strings, not throw; validate and sanitize inputs.

The **MCP implementation guide** you have covers building standalone MCP servers (e.g. FastMCP, TypeScript). Use those when you want a **custom** MCP server. Use **n8n as MCP server** (instance-level or MCP Server Trigger) when you want to expose **n8n workflows** to AI clients.

---

## Quick Reference

| Goal | Approach |
|------|----------|
| Expose **many n8n workflows** to clients with one connection | **Instance-level MCP**: Settings → Instance-level MCP → Enable → Expose workflows → Connect clients. |
| Expose **one custom MCP API** (specific tools) | **MCP Server Trigger** workflow: Trigger + tool nodes (e.g. Custom n8n Workflow Tool, Code) → Publish → Use MCP URL. |
| **Call** external MCP tools from n8n workflows | **MCP Client** node. |
| **Call** external MCP tools from an n8n **AI Agent** | **MCP Client Tool** node. |

---

## References

- [Accessing n8n MCP server](https://docs.n8n.io/advanced-ai/accessing-n8n-mcp-server/) (instance-level)
- [MCP Server Trigger node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/)
- [MCP Client node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcpClient/)
- [MCP Client Tool node](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp)
- [MCP Server Trigger templates](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/#templates-and-examples) (e.g. Google Calendar + Custom Functions, Personal Assistant with Gemini)
