# N8N "Respond to Webhook" Node - Exact Configuration

## ✅ Required Settings

### 1. Respond With
**Setting:** `Respond With`  
**Value:** `First Incoming Item` ✅

This passes through the JSON from your AI Agent node directly as the response.

### 2. Response Body
**Setting:** `Response Body`  
**Value:** Leave **empty** or set to `{{ $json }}` ✅

Since you're using "First Incoming Item", the response body will automatically use the incoming item's JSON.

### 3. Response Code
**Setting:** `Response Code`  
**Value:** `200` (default) ✅

This is the standard success code.

### 4. Response Headers (Optional)
**Setting:** `Response Headers`  
**Value:** Leave default or add:
```
Content-Type: application/json
```

## 📋 What the Node Must Return

The proxy expects a **JSON response** with this structure:

```json
{
  "message": "Your LLM response text here"
}
```

### Required Field:
- ✅ **`message`** (string) - **REQUIRED** - The LLM response text

### Optional Fields:
- `transcript` (string) - Optional, ignored by proxy
- Any other fields - Optional, ignored by proxy

## 🔗 Node Chain Setup

Your workflow should look like this:

```
AI Agent → Respond to Webhook
```

### AI Agent Node Output
Make sure your AI Agent node outputs JSON with a `message` field:

**Example AI Agent output:**
```json
{
  "message": "Hello! How can I help you today?",
  "output": "Hello! How can I help you today?",
  "text": "Hello! How can I help you today?"
}
```

The proxy will extract the `message` field from this.

### If Your AI Agent Doesn't Output `message`

If your AI Agent outputs the response in a different field (like `output`, `text`, `reply`, etc.), add a **Set** node before "Respond to Webhook":

```
AI Agent → Set → Respond to Webhook
```

**Set Node Configuration:**
- **Name:** `Set message`
- **Fields to Set:**
  - **Name:** `message`
  - **Value:** `{{ $json.output || $json.text || $json.reply || $json.message || 'No response' }}`

This ensures the `message` field exists for the proxy.

## ✅ Complete Example

### Minimal Workflow:
```
1. Webhook
   └─ Respond: "Using 'Respond to Webhook' Node"
   
2. AI Agent (OpenAI, Anthropic, etc.)
   └─ Input: {{ $json.message }}
   └─ Output: { "output": "Response text" }
   
3. Set (Optional - if AI doesn't output "message")
   └─ Set: message = {{ $json.output }}
   
4. Respond to Webhook
   └─ Respond With: "First Incoming Item"
   └─ Response Body: (empty - uses incoming item)
   └─ Response Code: 200
```

### What Gets Returned:
```json
{
  "message": "Response text"
}
```

## 🔍 Verification

### Test the Response Format

You can test your webhook response format:

```bash
curl -X POST https://your-n8n-webhook-url \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "text": "test"}'
```

**Expected Response:**
```json
{
  "message": "LLM response here"
}
```

### Common Issues

#### ❌ Issue: Empty Response
**Cause:** Webhook node set to "Immediately" instead of "Using 'Respond to Webhook' Node"  
**Fix:** Change Webhook node "Respond" setting

#### ❌ Issue: Binary Response
**Cause:** Respond to Webhook receiving binary data  
**Fix:** Ensure AI Agent outputs JSON, not binary

#### ❌ Issue: Missing `message` Field
**Cause:** AI Agent outputs response in different field  
**Fix:** Add Set node to create `message` field

#### ❌ Issue: Wrong JSON Structure
**Cause:** Response is array or nested object  
**Fix:** Ensure response is flat JSON object with `message` field

## 📝 Summary

**Respond to Webhook Node Settings:**
- ✅ **Respond With:** `First Incoming Item`
- ✅ **Response Body:** Empty (or `{{ $json }}`)
- ✅ **Response Code:** `200`
- ✅ **Response Headers:** Default (or add `Content-Type: application/json`)

**Required Response Format:**
```json
{
  "message": "LLM response text"
}
```

**That's it!** The proxy will take the `message` field and send it to Cartesia TTS automatically.

---

*Last updated: 2025-01-25*
