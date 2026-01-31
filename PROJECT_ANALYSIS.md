# JARVIS-TEST-N8N - Complete Project Analysis

## Project Overview

**JARVIS** is a voice-enabled AI assistant built with React + TypeScript frontend and n8n workflows as the backend. It implements a sophisticated voice bot with speech-to-text (STT), text-to-speech (TTS), and conversational AI capabilities.

### Key Technologies
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend Integration**: n8n workflows (webhook-based)
- **Audio Processing**: Cartesia STT/TTS, Web Audio API, AudioWorklet
- **AI**: OpenAI (via n8n), with agentic design patterns
- **Voice Features**: Voice Activity Detection (VAD), hands-free mode, bidirectional turn-taking

---

## Architecture

### Frontend Architecture

```
src/
├── main.tsx              # React app entry point
├── App.tsx               # Root component with routing
├── pages/
│   ├── Index.tsx         # Main chat interface page
│   └── NotFound.tsx      # 404 page
├── components/
│   ├── ChatContainer.tsx # Main chat orchestrator
│   ├── ChatHeader.tsx    # Status bar with connection indicator
│   ├── ChatInput.tsx     # Input area (text + voice + attachments)
│   ├── ChatMessage.tsx   # Message display with audio playback
│   └── ui/               # 48 shadcn/ui components
├── hooks/
│   ├── useAudioRecorder.ts  # Audio capture + VAD
│   └── useTextToSpeech.ts   # Browser TTS fallback
├── api/
│   ├── n8n.ts            # N8N webhook communication
│   └── cartesia.ts       # Cartesia TTS for "still here" prompt
├── lib/
│   ├── config.ts         # Environment configuration
│   └── utils.ts          # Utility functions
└── types/
    └── chat.ts           # TypeScript types
```

### Backend Integration (n8n)

The frontend communicates with n8n workflows via webhooks. The workflow structure:

```
Webhook → IF (audio vs text) → 
  ├─ TRUE: PCM→MP3 → Cartesia STT → transcript
  └─ FALSE: Use text message
→ Merge → OpenAI Chat → Cartesia TTS → Build Response → Respond to Webhook
```

**Key n8n Workflow Files:**
- `workflows/jarvis-cartesia-voice.json` - Complete workflow
- `workflows/code-pcm-to-mp3.js` - Audio format conversion
- `workflows/code-build-tts-response.js` - Response formatting

---

## Core Features

### 1. Voice Input (STT)
- **Audio Capture**: Web Audio API with AudioWorklet
- **Format**: Records at 48kHz, converts to PCM S16LE @ 16kHz, then MP3
- **VAD**: Voice Activity Detection auto-finalizes on silence (configurable threshold/duration)
- **Hands-free Mode**: Continuous conversation with auto-restart after responses

### 2. Voice Output (TTS)
- **Primary**: Cartesia TTS via n8n (returns MP3 audio)
- **Fallback**: Browser Web Speech API for "still here" prompt
- **Auto-play**: Assistant messages auto-play audio when available
- **Interruption**: User speech stops assistant audio playback

### 3. Conversational Features
- **Session Management**: Stable session ID for conversation history
- **Intent Classification**: Client-side routing (`booker` | `info` | `general`)
- **Inactivity Handling**: "Still here" prompt after 10s of silence
- **Error Handling**: Friendly, non-blaming error messages
- **Status Indicators**: `idle` | `listening` | `thinking`

### 4. Agentic Design Patterns
Implements patterns from *Agentic Design Patterns: A Hands-On Guide*:
- **Routing**: Intent-based branching in n8n
- **Prompt Chaining**: Multi-step workflows
- **Parallelization**: Concurrent sub-tasks with merge
- **Memory/RAG**: Session-based conversation history

---

## Key Components

### ChatContainer (`src/components/ChatContainer.tsx`)
**Purpose**: Main orchestrator for chat functionality

**Responsibilities**:
- Manages message state and conversation flow
- Handles N8N webhook communication
- Manages inactivity timer (10s → "still here" prompt)
- Coordinates audio playback and TTS
- Error handling with user-friendly messages

**Key State**:
- `messages`: Array of Message objects
- `isLoading`: Request in progress
- `conversationStatus`: Current state (`idle` | `listening` | `thinking`)
- `sessionId`: Stable UUID for conversation history

### ChatInput (`src/components/ChatInput.tsx`)
**Purpose**: User input interface

**Features**:
- Text input with Enter to send
- Voice recording with VAD
- File attachments
- Hands-free mode toggle
- Recording status indicators

**Note**: Audio recording is currently **disabled** (commented out) for debugging.

### useAudioRecorder (`src/hooks/useAudioRecorder.ts`)
**Purpose**: Audio capture with Voice Activity Detection

**Capabilities**:
- Records at 48kHz sample rate
- Converts to PCM S16LE @ 16kHz
- Encodes to MP3 (lamejs) for Cartesia STT
- VAD with configurable silence threshold/duration
- Auto-finalizes on silence detection
- Hands-free mode support

**Audio Processing Pipeline**:
```
Microphone → AudioWorklet (VAD) → Float32Array chunks → 
PCM S16LE (16kHz) → MP3 encoding → ArrayBuffer
```

### N8N API (`src/api/n8n.ts`)
**Purpose**: Communication bridge to n8n webhooks

**Key Functions**:
- `sendToN8N()`: Sends message/audio/attachments with retry logic
- `normalizeN8NResponse()`: Extracts message text from various response formats
- `extractAudioFromResponse()`: Gets playable audio URL from response
- `extractTranscriptFromResponse()`: Gets STT transcript
- `classifyIntent()`: Keyword-based intent classification

**Payload Structure**:
```typescript
{
  message: string;
  text, input, prompt, query, userMessage, user_message: string; // Compatibility fields
  body: { ... }; // Nested compatibility
  timestamp: string;
  intent?: "booker" | "info" | "general";
  sessionId?: string;
  audio?: { format, sampleRate, channels, data, size };
  attachments?: Array<{ name, type, size, data }>;
}
```

**Response Handling**:
- Supports multiple response formats (JSON, string, arrays)
- Unwraps nested structures (`json`, `body`, `data`, `items`)
- Extracts audio from `audio.data` (base64) or `audio.url`
- Handles empty responses with helpful error messages

---

## Configuration

### Environment Variables

```env
# N8N Webhook (optional - uses default if not set)
VITE_N8N_WEBHOOK_URL=https://n8n.hempstarai.com/webhook/...

# Cartesia TTS (for "still here" prompt)
VITE_CARTESIA_API_KEY=your_key_here
VITE_CARTESIA_TTS_MODEL=sonic-3
VITE_CARTESIA_VOICE_ID=95131c95-525c-463b-893d-803bafdf93c4
VITE_CARTESIA_TTS_SPEED=1.05
```

### Default Webhook
- **Production**: `https://n8n.hempstarai.com/webhook/170d9a22-bac0-438c-9755-dc79b961d36e`
- **Development**: Uses Vite proxy `/api/n8n/...` to avoid CORS

### Vite Configuration
- **Dev Server**: `127.0.0.1:8080`
- **Proxy**: `/api/n8n` → n8n server (CORS handling)
- **Cartesia Proxy**: `/api/cartesia-tts` → Cartesia API (keeps API key server-side)

---

## Audio Processing Details

### Recording Pipeline

1. **Capture**: `getUserMedia()` → MediaStream (48kHz, mono)
2. **Processing**: AudioWorklet processor (`audio-capture-processor.js`)
   - VAD: RMS energy calculation
   - Buffers audio chunks
   - Detects speech start/end
3. **Conversion**:
   - Float32Array → PCM S16LE (16-bit signed integer)
   - Resample: 48kHz → 16kHz (linear interpolation)
   - Encode: PCM → MP3 (lamejs, 128kbps)
4. **Transmission**: MP3 ArrayBuffer → FormData → n8n webhook

### Playback Pipeline

1. **Receive**: N8N returns `{ message, audio: { data: base64, format: "mp3" } }`
2. **Decode**: Base64 → ArrayBuffer → Blob → Object URL
3. **Play**: HTML5 `<audio>` element with auto-play
4. **Interruption**: User speech triggers `stopPlaybackTrigger` → pause audio

---

## Voice Bot Design Principles

Based on *Design Principles for Voice User Interfaces*:

- **S2**: Clear system status (`idle` | `listening` | `thinking`)
- **S6**: Spoken-friendly language (short sentences, discourse markers)
- **S7**: One idea per turn, back-and-forth conversation
- **S11**: Short, conversational loading text ("One moment, sir.")
- **S12**: Explicit confirmations for critical actions
- **S15-S16**: Friendly error messages, no blame
- **S17**: Allow users to cancel/escape (AbortSignal support)

---

## Testing

### Scripts

```bash
# Text-only webhook test
npm run test:webhook

# Audio webhook test
npm run test:webhook:audio

# Generate test audio
npm run test:audio:generate

# JSON + audio test
npm run test:webhook:json-audio
```

### Test Files
- `scripts/test-webhook.mjs` - Text POST test
- `scripts/test-webhook-json-audio.mjs` - Audio POST test
- `scripts/generate-test-audio.mjs` - Generate PCM test file

---

## Documentation Structure

### Core Docs (`docs/`)
- `JARVIS-AI-AGENT-PROMPT-N8N.md` - System prompt for n8n AI node
- `AGENTIC-PATTERNS-IN-JARVIS-N8N.md` - Design pattern mappings
- `CARTESIA_N8N_OPTIMAL_SETUP.md` - Cartesia integration guide
- `N8N_INTEGRATION_VERIFICATION.md` - Webhook setup verification

### Workflow Docs (`workflows/`)
- `README.md` - Workflow overview
- `BUILD-TTS-RESPONSE-SETUP.md` - Response formatting setup
- `IF-PCM-S16LE-AUDIO-TO-STT.md` - Audio routing setup
- `AGENTIC-PROMPT-CHAINING.md` - Multi-step workflow example
- `AGENTIC-PARALLELIZATION.md` - Parallel processing example

### Debug (`debug/`)
- Debug tools and troubleshooting guides
- Site loading fixes
- Audio playback debugging

---

## Current Status & Known Issues

### Disabled Features
- **Audio Recording**: Currently disabled in `ChatInput.tsx` (lines 38-59) for debugging
  - `useAudioRecorder` hook is commented out
  - Hardcoded `isRecording = false`, `audioData = null`

### Active Features
- ✅ Text messaging
- ✅ File attachments
- ✅ Audio playback (from n8n TTS)
- ✅ Connection status indicator
- ✅ Inactivity timer ("still here" prompt)
- ✅ Error handling
- ✅ Session management

### Architecture Strengths
- Clean separation of concerns
- Comprehensive error handling
- Flexible response parsing
- Agentic design pattern support
- Voice bot best practices
- Extensive documentation

---

## Dependencies

### Core
- `react` / `react-dom`: UI framework
- `react-router-dom`: Routing
- `@tanstack/react-query`: Data fetching
- `lamejs`: MP3 encoding

### UI
- `@radix-ui/*`: Accessible component primitives
- `tailwindcss`: Styling
- `lucide-react`: Icons
- `sonner`: Toast notifications

### Development
- `vite`: Build tool
- `typescript`: Type safety
- `vitest`: Testing
- `eslint`: Linting

---

## Build & Deploy

### Development
```bash
npm install
npm run dev  # Starts on http://127.0.0.1:8080
```

### Production
```bash
npm run build  # Outputs to dist/
npm run preview  # Preview production build
```

### Deployment
- Built for Lovable platform (can deploy via Lovable UI)
- Static files in `dist/` can be served by any static host
- Requires n8n webhook to be accessible from client

---

## Future Enhancements

Based on code comments and structure:

1. **Re-enable Audio Recording**: Fix the disabled audio capture
2. **Streaming Responses**: Support partial/streaming responses from n8n
3. **Multi-step Chains**: Frontend support for multi-call workflows
4. **Enhanced RAG**: Better memory/context management
5. **Guardrails**: Content filtering and safety checks
6. **Multi-agent**: Support for multiple specialized agents

---

## Code Quality

- **TypeScript**: Full type coverage
- **Error Boundaries**: React error boundary for graceful failures
- **Logging**: Comprehensive console logging for debugging
- **Comments**: Well-documented code with references to design principles
- **Testing**: Test setup with Vitest (some tests exist)

---

## Summary

JARVIS is a sophisticated voice-enabled AI assistant with:
- **Modern React/TypeScript frontend** with voice capabilities
- **n8n workflow backend** for flexible AI orchestration
- **Cartesia STT/TTS** for high-quality voice processing
- **Agentic design patterns** for intelligent routing and chaining
- **Voice bot best practices** for natural conversation
- **Comprehensive documentation** for setup and extension

The project demonstrates production-ready patterns for voice interfaces, with careful attention to user experience, error handling, and extensibility.
