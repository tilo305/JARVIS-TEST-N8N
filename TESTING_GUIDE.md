# Complete Testing Guide

## 🧪 Testing Checklist

### Prerequisites
1. ✅ All dependencies installed (`npm install` in both root and `websocket-proxy/`)
2. ✅ Environment variables configured (`.env` files)
3. ✅ TypeScript compiles without errors
4. ✅ No linter errors

### Test Steps

#### 1. TypeScript Compilation Test
```bash
# Test proxy service
cd websocket-proxy
npx tsc --noEmit

# Test frontend (from root)
npx tsc --noEmit
```
**Expected:** No errors

#### 2. Health Endpoint Test
```bash
cd websocket-proxy
npm run test:health
```
**Expected:** `{ status: 'ok', service: 'jarvis-websocket-proxy' }`

#### 3. WebSocket Connection Test
```bash
cd websocket-proxy
npm run test:connection
```
**Expected:**
- ✅ WebSocket connected
- ✅ Messages received
- ✅ No errors

#### 4. Integration Test
```bash
cd websocket-proxy
npm run test:integration
```
**Expected:**
- ✅ Connection established
- ✅ Text sent
- ✅ Transcript received
- ✅ Audio chunks received

#### 5. Frontend Build Test
```bash
# From root directory
npm run build
```
**Expected:** Build succeeds without errors

#### 6. Runtime Test (Manual)

**Start Proxy:**
```bash
cd websocket-proxy
npm run dev
```

**Start Frontend:**
```bash
# From root
npm run dev
```

**Test in Browser:**
1. Open browser console
2. Navigate to frontend URL
3. Check WebSocket connection (should see connection messages)
4. Send a text message
5. Verify:
   - Transcript appears
   - Audio plays
   - No errors in console

## 🔍 Debugging Tests

### Test 1: Environment Variables
```bash
cd websocket-proxy
node -e "require('dotenv').config(); console.log('API Key:', process.env.CARTESIA_API_KEY ? 'Set' : 'Missing');"
```

### Test 2: Port Availability
```bash
# Check if port 3001 is available
netstat -an | findstr :3001
```

### Test 3: WebSocket URL Construction
```javascript
// In browser console
const wsUrl = 'ws://localhost:3001/ws';
const sessionId = 'test-123';
const url = new URL(wsUrl);
url.searchParams.set('sessionId', sessionId);
console.log('Final URL:', url.toString());
```

### Test 4: Audio Context
```javascript
// In browser console
const ctx = new AudioContext({ sampleRate: 24000 });
console.log('AudioContext created:', ctx.state);
console.log('Sample rate:', ctx.sampleRate);
```

## ✅ Verification Checklist

- [ ] TypeScript compiles without errors
- [ ] No linter errors
- [ ] Health endpoint responds
- [ ] WebSocket connection works
- [ ] Text input is received
- [ ] Transcripts are displayed
- [ ] Audio chunks are received
- [ ] Audio playback works
- [ ] No console errors
- [ ] Error handling works
- [ ] Fallback to HTTP works (if WebSocket fails)

## 🐛 Common Issues & Fixes

### Issue: TypeScript Errors
**Fix:** Check import paths, ensure `.js` extensions for ES modules

### Issue: WebSocket Connection Fails
**Fix:** 
1. Verify proxy is running
2. Check port number
3. Verify CORS settings

### Issue: No Audio Playback
**Fix:**
1. Check browser audio permissions
2. Verify AudioContext is created
3. Check audio format (PCM F32LE)

### Issue: Transcripts Not Appearing
**Fix:**
1. Verify STT WebSocket is connected
2. Check audio format sent to STT
3. Verify N8N webhook is working

## 📊 Expected Performance

- **Connection time:** < 500ms
- **Time to first transcript:** < 200ms
- **Time to first audio:** < 400ms
- **Total latency:** 200-400ms

## 🎯 Success Criteria

All tests pass when:
1. ✅ TypeScript compiles
2. ✅ Health check responds
3. ✅ WebSocket connects
4. ✅ Messages are exchanged
5. ✅ Audio plays correctly
6. ✅ Transcripts appear
7. ✅ No errors in logs

---

*Last updated: 2025-01-25*
