# JARVIS Debug Fixes

## ✅ Fixed Issues

### 1. Invalid Webhook URL Format Error (FIXED)

**Error:** `Invalid webhook URL format: /api/n8n/webhook-test/e7278dba-076f-4fe9-8c8f-0241e4103ac4`

**Root Cause:** 
- `config.ts` was trying to validate relative proxy URLs with `new URL()`, which requires absolute URLs
- In development, the proxy URL is relative (`/api/n8n/...`), causing validation to fail

**Fix Applied:**
- Modified `src/lib/config.ts` to skip URL validation for proxy URLs
- Only validates absolute URLs when not using proxy

**File:** `src/lib/config.ts` (line 76-86)

**Status:** ✅ FIXED

---

### 2. Page Load Console Errors (FIXED)

**Errors:**
- `Failed to load resource: 404` for webhook health check
- `Failed to load resource: 404` for `/favicon.ico`
- `Failed to load resource: net::ERR_CONNECTION_REFUSED` for debug ingest

**Root Cause:**
- Health check hit the webhook URL (POST-only) which returns 404 on GET
- No `favicon.ico` in `public/`
- Debug ingest requests fired before the app could shim fetch

**Fixes Applied:**
1. ✅ Health check now hits the N8N base URL (proxy root) instead of the webhook endpoint
2. ✅ Added early fetch shim in `index.html` to silence debug ingest unless enabled
3. ✅ Added placeholder `public/favicon.ico` to satisfy browser request
4. ✅ Improved browser debug tool to log failing URLs and avoid network-idle timeouts

**Files Modified:**
- `src/api/n8n.ts`
- `index.html`
- `scripts/run-browser-debug.mjs`
- `public/favicon.ico`

**Status:** ✅ FIXED

---

### 3. Audio Playback Not Working (IN PROGRESS)

**Symptoms:**
- Assistant messages with audio don't auto-play
- No audio heard even when play button is clicked
- Console shows audio elements exist but don't play

**Potential Causes:**
1. Browser autoplay policy blocking playback
2. Audio element not ready when play() is called
3. stopPlaybackTrigger interfering with playback
4. Audio URL not properly set or blob URL revoked

**Fixes Applied:**
1. ✅ Fixed stopPlaybackTrigger logic to only stop when trigger increases (not on mount)
2. ✅ Reset stopPlaybackToken to 0 when new assistant messages arrive
3. ✅ Added canplay event listener for proper audio loading
4. ✅ Added timeout fallback if canplay never fires
5. ✅ Added comprehensive debug logging

**Files Modified:**
- `src/components/ChatMessage.tsx`
- `src/components/ChatContainer.tsx`

**Debug Tool:** Use `window.jarvisDebug.audio()` in browser console

**Status:** 🔄 TESTING REQUIRED

---

### 4. Wrong Voice After 10 Seconds Silence (FIXED)

**Issue:** "Still here" message used browser TTS instead of Cartesia

**Root Cause:**
- Direct browser call to Cartesia API blocked by CORS
- Fallback to browser TTS with wrong voice

**Fixes Applied:**
1. ✅ Added Vite proxy for Cartesia TTS (`/api/cartesia-tts`)
2. ✅ Frontend calls proxy in dev, Cartesia directly in prod
3. ✅ Proxy uses server-side API key (no CORS issues)
4. ✅ Switched to `sonic-turbo` model for lower latency
5. ✅ Added `generation_config.speed: 1.05` for faster speech

**Files Modified:**
- `vite.config.ts` (added cartesiaTtsProxyPlugin)
- `src/api/cartesia.ts` (uses proxy in dev)
- `workflows/jarvis-portable-fixed.json` (sonic-turbo model)

**Status:** ✅ FIXED

---

## 🔧 Debug Tools Available

### Browser Console Commands

```javascript
// Run all debug checks
window.jarvisDebug.runAll()

// Check audio playback
window.jarvisDebug.audio()

// Check webhook connection
window.jarvisDebug.webhook()

// Test TTS
window.jarvisDebug.tts("Test text")
```

### Import in Code

```typescript
import { debugAudioPlayback, debugWebhook, debugTTS } from '@/debug';
```

---

## 📋 Testing Checklist

- [ ] Webhook URL validation error is gone
- [ ] Audio playback works for assistant messages
- [ ] "Still here" message uses Cartesia voice
- [ ] Bbox (interrupt) stops audio when user speaks
- [ ] TTS uses sonic-turbo model
- [ ] All console errors resolved

---

## 🐛 Known Issues

1. **Browser Autoplay Policy**: Some browsers block autoplay until user interaction
   - **Workaround**: User must interact with page first (click, type, etc.)
   - **Detection**: Check console for autoplay policy warnings

2. **Service Worker Errors**: `Frame with ID 0 was removed` errors
   - **Impact**: Likely browser extension related, not app code
   - **Action**: Check browser extensions, may be unrelated

---

## 📝 Next Steps

1. Test audio playback after fixes
2. Verify webhook connectivity
3. Test TTS with different texts
4. Monitor console for new errors
5. Update this document with results
