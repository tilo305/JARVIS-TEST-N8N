# JARVIS Debug Tools

Comprehensive live debugging tools for JARVIS Voice AI development and troubleshooting.

## 🚀 Quick Start

### In Browser Console

Open browser DevTools (F12) and use:

```javascript
// Comprehensive system check (recommended)
await window.jarvisDebug.master()

// Quick health check
await window.jarvisDebug.quickHealth()

// Individual checks
window.jarvisDebug.audio()      // Check audio playback
window.jarvisDebug.webhook()     // Test N8N webhook
window.jarvisDebug.tts("text")   // Test TTS
```

### In Code

```typescript
import { 
  debugAudioPlayback, 
  debugWebhook, 
  debugTTS 
} from '@/debug';
```

## 🚀 Quick Start

### Master Debug (Recommended)

```javascript
// Comprehensive check of all systems
await window.jarvisDebug.master()
```

### Quick Health Check

```javascript
// Fast health check
await window.jarvisDebug.quickHealth()
```

## 📁 Tools

### Master Debug Tool

**`master-debug.ts`** - Comprehensive system-wide diagnostics
- Checks all 9 systems in one run
- Provides overall health status
- Lists critical issues and recommendations

### New Comprehensive Tools

**`websocket-debug.ts`** - WebSocket connection debugging
- Tests proxy server connectivity
- Measures connection latency
- Monitors connection state

**`audio-recording-debug.ts`** - Audio recording debugging
- Checks microphone permissions
- Tests AudioContext and AudioWorklet
- Validates audio format requirements

**`stt-debug.ts`** - Speech-to-Text debugging
- Checks Cartesia API key
- Tests STT WebSocket connection
- Validates audio format

**`audioworklet-debug.ts`** - AudioWorklet debugging
- Checks secure context
- Tests AudioWorklet API support
- Validates module loading

### Core Tools

### 1. Audio Playback Debug (`audio-playback-debug.ts`)

**Purpose:** Debug audio playback issues

**Features:**
- Check all audio elements in DOM
- Monitor ready state, network state, errors
- Test autoplay policy
- Real-time event monitoring
- Programmatic playback testing

**Usage:**
```typescript
import { debugAudioPlayback, monitorAudioPlayback } from '@/debug/audio-playback-debug';

// Check current audio state
debugAudioPlayback();

// Monitor events in real-time
monitorAudioPlayback((event, data) => {
  console.log('Audio event:', event, data);
});

// Test specific audio URL
testAudioPlayback('blob:...').then(success => {
  console.log('Playback test:', success ? 'PASS' : 'FAIL');
});
```

### 2. Webhook Debug (`webhook-debug.ts`)

**Purpose:** Debug N8N webhook connectivity and responses

**Features:**
- Test webhook reachability
- Check CORS configuration
- Measure response times
- Test with audio payloads
- Inspect response headers and body

**Usage:**
```typescript
import { debugWebhook, testWebhookWithAudio } from '@/debug/webhook-debug';

// Test basic webhook
const result = await debugWebhook();
console.log('Webhook status:', result.reachable ? 'OK' : 'FAILED');

// Test with audio
const audioBuffer = /* ... */;
await testWebhookWithAudio(audioBuffer);
```

### 3. TTS Debug (`tts-debug.ts`)

**Purpose:** Debug Cartesia TTS (Text-to-Speech)

**Features:**
- Test TTS API calls
- Check API key configuration
- Verify proxy vs direct calls
- Test playback of generated audio
- Run variation tests

**Usage:**
```typescript
import { debugTTS, testTTSVariations } from '@/debug/tts-debug';

// Test single TTS call
const result = await debugTTS("Hello, this is a test.");
console.log('TTS result:', result.success ? 'OK' : 'FAILED');

// Test multiple variations
await testTTSVariations();
```

### 4. Site Loading Debug (`site-loading-debug.ts`)

**Purpose:** Comprehensive diagnostics for site loading issues

**Features:**
- 12 comprehensive async checks
- DOM readiness, React imports, module resolution
- CSS loading, network requests, build artifacts
- Browser compatibility, environment variables

**Usage:**
```typescript
import { debugSiteLoading, monitorSiteLoading, testSiteLoading } from '@/debug/site-loading-debug';

// Comprehensive async diagnostics
const diagnostics = await debugSiteLoading();

// Quick test
const passed = await testSiteLoading();
```

**Note:** Use this for comprehensive, thorough diagnostics. For immediate troubleshooting when the app won't load, use `app-not-loading-live-debugger.ts` instead.

### 5. App Not Loading Debug (`app-not-loading-live-debugger.ts`)

**Purpose:** Quick synchronous diagnostics when app fails to load

**Features:**
- Immediate synchronous checks (no async operations)
- Quick diagnosis of critical issues
- Helper functions to try loading the app
- Common error pattern detection

**Usage:**
```typescript
import { liveDebugAppLoading, tryLoadApp, checkCommonErrors } from '@/debug/app-not-loading-live-debugger';

// Quick synchronous check
const result = liveDebugAppLoading();

// Try to manually load app
tryLoadApp();

// Check for common errors
checkCommonErrors();
```

**Note:** Use this for immediate troubleshooting when the app won't load. For comprehensive diagnostics, use `site-loading-debug.ts` instead.

**Difference from Site Loading Debug:**
- `site-loading-debug.ts`: Comprehensive async diagnostics (12 checks, thorough)
- `app-not-loading-live-debugger.ts`: Quick sync diagnostics (immediate troubleshooting)

## 🔍 Common Issues & Solutions

### Audio Not Playing

1. **Check autoplay policy:**
   ```javascript
   window.jarvisDebug.audio()
   ```
   Look for "Autoplay blocked" warnings

2. **Verify audio element:**
   - Check if audio URL is set
   - Verify readyState >= 2 (HAVE_CURRENT_DATA)
   - Check for errors in console

3. **Test manually:**
   ```javascript
   const audio = document.querySelector('audio');
   audio.play().then(() => console.log('OK')).catch(e => console.error(e));
   ```

### Webhook Connection Issues

1. **Check connectivity:**
   ```javascript
   await window.jarvisDebug.webhook()
   ```

2. **CORS errors:**
   - In dev: Use proxy (`/api/n8n/...`)
   - In prod: Configure CORS headers on N8N server

3. **Timeout errors:**
   - Check N8N workflow is active
   - Verify webhook URL is correct
   - Check network connectivity

### TTS Not Working

1. **Check API key:**
   ```javascript
   console.log('API Key:', import.meta.env.VITE_CARTESIA_API_KEY ? 'SET' : 'MISSING');
   ```

2. **Test TTS:**
   ```javascript
   await window.jarvisDebug.tts("Test")
   ```

3. **Check proxy:**
   - In dev: Should use `/api/cartesia-tts` proxy
   - In prod: Needs `VITE_CARTESIA_API_KEY` in env

## 📊 Debug Output

All tools provide detailed console output with:
- ✅ Success indicators
- ❌ Error messages
- ⚠️ Warnings
- 💡 Helpful tips
- 📊 Performance metrics

## 🛠️ Integration

Debug tools are automatically loaded in development mode. They're available globally via `window.jarvisDebug` and can be imported in code.

## 📝 Adding New Debug Tools

1. Create new file in `debug/` folder
2. Export debug functions
3. Add to `debug/index.ts` exports
4. Add to `window.jarvisDebug` if needed
5. Document in this README and `COMPREHENSIVE_DEBUG_SYSTEM.md`

## 📚 Complete Documentation

See `COMPREHENSIVE_DEBUG_SYSTEM.md` for:
- Complete tool reference
- Usage examples
- Common issues & solutions
- Integration guide

## 🔗 Related Documentation

- `../docs/LATENCY-OPTIMIZATION.md` - TTS/STT optimization
- `../docs/CARTESIA_N8N_OPTIMAL_SETUP.md` - Cartesia setup
- `../docs/N8N_INTEGRATION_VERIFICATION.md` - N8N testing
- `../aUdIoWoRkLeT dOcS.md` - AudioWorklet details
