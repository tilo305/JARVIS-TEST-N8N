# N8N Workflow - Simplified for WebSocket Streaming

## ✅ You're Absolutely Correct!

With WebSocket streaming implemented, your N8N workflow is now **much simpler**. Here's why:

## Architecture Overview

### What Each Component Handles:

1. **Frontend/Browser** 🎤🔊
   - Audio capture (microphone input)
   - Audio playback (TTS output)
   - UI updates

2. **WebSocket Proxy** 🔄
   - Receives audio from frontend
   - Sends to **Cartesia STT** (gets transcript)
   - Sends transcript to **N8N webhook** (gets LLM response)
   - Sends LLM response to **Cartesia TTS** (gets audio)
   - Sends audio chunks back to frontend

3. **N8N Workflow** 🤖
   - Receives **text transcript** (not audio!)
   - Processes with **AI Agent/LLM**
   - Returns **text response** (not audio!)

## ✅ Simplified N8N Workflow Structure

Your workflow now only needs **3 nodes**:

```
Webhook → AI Agent → Respond to Webhook
```

### 1. Webhook Node
**Settings:**
- **HTTP Method:** `POST`
- **Path:** Your webhook path
- **Respond:** `Using 'Respond to Webhook' Node` ⚠️ Important!
- **Raw Body:** Enabled (to receive JSON)

**What it receives:**
```json
{
  "message": "user transcript text here",
  "text": "user transcript text here",
  "input": "user transcript text here",
  "timestamp": "2025-01-25T...",
  "sessionId": "optional-session-id"
}
```

**Note:** The proxy sends the transcript as **text only** - no audio!

### 2. AI Agent Node
**Settings:**
- Use your LLM/AI agent (OpenAI, Anthropic, etc.)
- Input: `{{ $json.message }}` or `{{ $json.text }}`
- Process the user's transcript
- Generate response

**Output:** LLM response text (e.g., `"Here's my response to the user"`)

### 3. Respond to Webhook Node
**Settings:**
- **Respond With:** `First Incoming Item`
- **Response Body:** Leave empty (uses incoming item)

**What it must return:**
```json
{
  "message": "LLM response text here"
}
```

**That's it!** The proxy will:
1. Take the `message` field
2. Send it to Cartesia TTS
3. Stream audio back to frontend

## ❌ What N8N NO LONGER Needs

You can **remove** these from your workflow:
- ❌ Cartesia STT node (proxy handles this)
- ❌ Cartesia TTS node (proxy handles this)
- ❌ Audio processing nodes
- ❌ Base64 encoding/decoding
- ❌ Audio format conversion
- ❌ Build TTS response node
- ❌ Any audio-related processing

## 📋 Complete Workflow Example

### Minimal Workflow:
```
1. Webhook
   └─ Receives: { message: "Hello", text: "Hello", ... }
   
2. AI Agent (OpenAI, Anthropic, etc.)
   └─ Input: {{ $json.message }}
   └─ Output: "Hello! How can I help you today?"
   
3. Respond to Webhook
   └─ Returns: { message: "Hello! How can I help you today?" }
```

### With Session Management (Optional):
```
1. Webhook
   └─ Receives: { message: "...", sessionId: "abc123" }
   
2. Set (Optional - to preserve sessionId)
   └─ Set: sessionId = {{ $json.sessionId }}
   
3. AI Agent
   └─ Input: {{ $json.message }}
   └─ Context: Use sessionId for conversation history
   └─ Output: "Response text"
   
4. Respond to Webhook
   └─ Returns: { message: "Response text" }
```

## 🔍 Verification

### What the Proxy Sends to N8N:
```typescript
// From websocket-proxy/src/n8n.ts
{
  message: transcript,      // User's transcript text
  text: transcript,          // Same (for compatibility)
  input: transcript,         // Same (for compatibility)
  timestamp: ISO string,    // Current timestamp
  sessionId: sessionId      // Optional session ID
}
```

### What N8N Must Return:
```typescript
// From websocket-proxy/src/types.ts
{
  message: string;  // REQUIRED: LLM response text
  [key: string]: unknown;  // Other fields ignored
}
```

### What Happens Next:
1. Proxy receives `{ message: "..." }` from N8N
2. Proxy sends `message` to Cartesia TTS
3. Cartesia streams audio chunks back
4. Proxy forwards audio chunks to frontend
5. Frontend plays audio in real-time

## ✅ Summary

**Your understanding is 100% correct!**

- ✅ **Browser/Frontend:** Handles audio (capture & playback)
- ✅ **WebSocket Proxy:** Handles STT & TTS (Cartesia)
- ✅ **N8N:** Handles LLM only (text in, text out)

**N8N Workflow:** `Webhook → AI Agent → Respond to Webhook`

**That's it!** Much simpler than before. 🎉

---

*Last updated: 2025-01-25*
