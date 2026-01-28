# n8n TTS Node: "JSON parameter needs to be valid JSON" Fix

## Problem

The HTTP Request (TTS) node in n8n 2.4.x throws:

- **"JSON parameter needs to be valid JSON"** when the body parameter doesn’t resolve to valid JSON, or
- **"invalid syntax"** when the expression starts with `=={{` (double equals).

## Cause

- The node expects the **JSON body** parameter to be (or resolve to) **valid JSON**.
- Using an **expression for the entire body** (e.g. `={{ { model_id: '...', transcript: ... } }}`) can fail because:
  - The node may validate the parameter and require a **string** that parses as JSON, not an object.
  - If `transcript` is an object or undefined, the result may not be valid JSON.
- Using **Expression** mode and typing `={{` yourself can produce `=={{` if the UI also adds `={{`, causing "invalid syntax".

## Fix (recommended)

Use a **fixed JSON body** and put **only the transcript** in an expression. That way the parameter is always valid JSON and only one value is dynamic.

### In the TTS node

1. Set **Body Content Type** to **JSON**.
2. For **JSON Body**, use **Fixed** (not Expression).
3. Paste this as the value (one expression only, inside `transcript`):

```json
{
  "model_id": "sonic-3",
  "transcript": "={{ (typeof $json.output === 'string' ? $json.output : ($json.output?.text ?? $json.output?.message ?? $json.output?.content ?? $json.textToSpeak ?? $json.message ?? $json.text ?? 'No response.')) }}",
  "voice": {
    "mode": "id",
    "id": "95131c95-525c-463b-893d-803bafdf93c4"
  },
  "output_format": {
    "container": "mp3",
    "sample_rate": 44100
  },
  "language": "en",
  "generation_config": {
    "speed": 1,
    "volume": 1
  }
}
```

4. If your upstream node sets **textToSpeak** (like in `jarvis-portable-fixed`), you can use this shorter transcript expression:

```json
"transcript": "={{ ($json.textToSpeak && String($json.textToSpeak).trim()) ? $json.textToSpeak : 'No response.' }}"
```

### Rules

- **Do not** use Expression mode for the **whole** body with an object/JSON.stringify expression if the node keeps failing validation.
- **Do** use Fixed mode and a JSON string where only `transcript` (or other single fields) are `={{ ... }}` expressions.
- Use **one** `={{` at the start of each expression; if the UI adds `={{` automatically, type only the inner part (e.g. `$json.textToSpeak`).

## Reference

- Working example: `workflows/jarvis-portable-fixed.json` (TTS node `jsonBody`).
- n8n HTTP Request node (v4.3) validates the JSON parameter after resolving expressions.
