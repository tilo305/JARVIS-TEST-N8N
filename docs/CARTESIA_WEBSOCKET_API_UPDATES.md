# Cartesia WebSocket API Implementation Updates

## Overview

This document details the updates made to align the WebSocket implementation with the [official Cartesia WebSocket TTS API documentation](https://docs.cartesia.ai/api-reference/tts/websocket).

## Key Updates

### 1. Message Format Corrections

**Before:**
```typescript
{
  type: 'generate',
  transcript: text,
  continue: continueFlag
}
```

**After (per official API):**
```typescript
{
  transcript: text,
  continue: continueFlag,
  flush: flushFlag,
  context_id?: string,
  flush_id?: string
}
```

The official API doesn't require a `type: 'generate'` field - the message structure itself indicates the intent.

### 2. Flush ID Support

Added support for flush IDs to track which audio chunks correspond to specific transcript submissions, as documented in [Context Flushing and Flush IDs](https://docs.cartesia.ai/api-reference/tts/working-with-web-sockets/context-flushing-and-flush-i-ds).

**Features:**
- Generate unique flush IDs for each transcript submission
- Track flush completion via `flush_done` messages
- Map audio chunks back to specific transcripts

**Implementation:**
```typescript
const flushId = `flush-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
await this.ttsClient.generateSpeech(sentence, continueFlag, flushFlag, flushId);
```

### 3. Flush Flag Support

Added `flush` parameter to explicitly control when to flush the audio buffer:

- `flush: true` - Finalize the current transcript and flush audio
- `flush: false` - Continue streaming (more text coming)

This is essential for maintaining proper conversation boundaries.

### 4. Enhanced Message Types

Updated `CartesiaTTSMessage` interface to include:
- `flush_done` message type
- `flush_id` field for tracking
- `step_time` for performance metrics

### 5. Context Management

Improved context handling:
- Context IDs are maintained across multiple requests
- Proper use of `continue` flag for streaming inputs
- Context expiration handling (1 second after last audio output per docs)

## API Reference

### WebSocket Connection

**URL:** `wss://api.cartesia.ai/tts/websocket`

**Query Parameters:**
- `api_key` - Your Cartesia API key
- `cartesia_version` - API version (e.g., `2025-04-16`)

### Initial Configuration

On connection, send configuration message:
```json
{
  "model_id": "sonic-turbo",
  "voice": { "mode": "id", "id": "your-voice-id" },
  "output_format": {
    "container": "raw",
    "encoding": "pcm_f32le",
    "sample_rate": 24000
  },
  "language": "en"
}
```

### Generate Speech

Send transcript message:
```json
{
  "transcript": "Hello, how are you?",
  "continue": false,
  "flush": true,
  "context_id": "optional-context-id",
  "flush_id": "optional-flush-id"
}
```

### Response Messages

**Audio Chunk (Binary):**
- Raw PCM audio data (pcm_f32le format)
- Received as binary WebSocket messages

**Control Messages (JSON):**
- `flush_done` - Flush completed
  ```json
  {
    "type": "flush_done",
    "flush_id": "flush-123"
  }
  ```
- `error` - Error occurred
  ```json
  {
    "type": "error",
    "error": "Error message"
  }
  ```

## Benefits of These Updates

1. **Proper Flush Tracking** - Can map audio chunks to specific transcripts
2. **Better Context Management** - Maintains prosody across streaming inputs
3. **API Compliance** - Matches official Cartesia WebSocket API specification
4. **Performance Metrics** - Can track `step_time` for latency monitoring

## References

- [Cartesia TTS WebSocket API](https://docs.cartesia.ai/api-reference/tts/websocket)
- [Context Flushing and Flush IDs](https://docs.cartesia.ai/api-reference/tts/working-with-web-sockets/context-flushing-and-flush-i-ds)
- [Contexts Documentation](https://docs.cartesia.ai/api-reference/tts/working-with-web-sockets/contexts)
- [Compare TTS Endpoints](https://docs.cartesia.ai/api-reference/tts/compare-tts-endpoints)

---

*Updated: 2025-01-25*
