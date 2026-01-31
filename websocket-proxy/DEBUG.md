# Debugging Guide

## Quick Debug Checklist

### 1. Verify Environment Variables
```bash
cd websocket-proxy
cat .env
```

Required variables:
- `CARTESIA_API_KEY` - Your Cartesia API key
- `CARTESIA_VOICE_ID` - Voice ID (default provided)
- `CARTESIA_TTS_MODEL` - Model name (default: sonic-turbo)
- `N8N_WEBHOOK_URL` - Your N8N webhook URL
- `PORT` - Server port (default: 3001)

### 2. Test Health Endpoint
```bash
npm run test:health
```

Should return: `{ status: 'ok', service: 'jarvis-websocket-proxy' }`

### 3. Test WebSocket Connection
```bash
npm run test:connection
```

This will:
- Connect to WebSocket
- Send start_conversation
- Send test text
- Verify responses

### 4. Test Full Integration
```bash
npm run test:integration
```

This tests the complete flow:
- Connection
- Text input
- Transcript reception
- Audio chunk reception

### 5. Check Logs

**Proxy Service:**
- Look for: `✅ New WebSocket connection`
- Look for: `✅ Cartesia STT WebSocket connected`
- Look for: `✅ Cartesia TTS WebSocket connected`
- Watch for errors: `❌`

**Frontend:**
- Open browser console
- Look for WebSocket connection messages
- Check for audio playback errors
- Verify transcript updates

## Common Issues

### Issue: WebSocket Connection Fails
**Symptoms:** Frontend can't connect to proxy
**Solutions:**
1. Verify proxy is running: `npm run dev` in `websocket-proxy/`
2. Check port: Default is 3001
3. Verify CORS if needed
4. Check firewall settings

### Issue: Cartesia API Errors
**Symptoms:** `❌ Cartesia TTS WebSocket error` or STT errors
**Solutions:**
1. Verify `CARTESIA_API_KEY` is set correctly
2. Check API key is valid and has credits
3. Verify voice ID exists
4. Check model name is correct

### Issue: No Audio Playback
**Symptoms:** Audio chunks received but no sound
**Solutions:**
1. Check browser console for AudioContext errors
2. Verify browser allows audio autoplay
3. Check audio format (should be PCM F32LE)
4. Verify sample rate (24000 Hz)

### Issue: Transcripts Not Updating
**Symptoms:** No transcript messages received
**Solutions:**
1. Verify STT WebSocket is connected
2. Check audio format sent to STT (PCM S16LE, 16kHz)
3. Verify N8N webhook is responding
4. Check message handlers in frontend

### Issue: N8N Not Responding
**Symptoms:** Text sent but no response
**Solutions:**
1. Verify `N8N_WEBHOOK_URL` is correct
2. Test N8N webhook directly with curl
3. Check N8N workflow is active
4. Verify webhook accepts POST requests

## Debug Commands

```bash
# Check TypeScript compilation
cd websocket-proxy
npm run build

# Check for syntax errors
npx tsc --noEmit

# Run health check
npm run test:health

# Test connection
npm run test:connection

# Full integration test
npm run test:integration

# Verify setup
npm run verify
```

## Logging Levels

The proxy service logs:
- `✅` - Success messages
- `❌` - Error messages
- `📤` - Outgoing messages
- `📥` - Incoming messages
- `🔌` - Connection events

Enable verbose logging by setting:
```bash
DEBUG=* npm run dev
```

## Network Debugging

### Check WebSocket Connection
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.onerror = (e) => console.error('Error:', e);
```

### Check Cartesia Connections
The proxy logs Cartesia connection status. If connections fail:
1. Check API key
2. Verify network connectivity
3. Check Cartesia service status

## Performance Debugging

### Measure Latency
```javascript
// In browser console
const start = performance.now();
// ... perform action
const end = performance.now();
console.log('Latency:', end - start, 'ms');
```

### Check Audio Buffer Sizes
The proxy logs audio chunk sizes. Monitor for:
- Very small chunks (may indicate connection issues)
- Very large chunks (may cause playback delays)
- Missing chunks (may indicate network issues)

## Getting Help

If issues persist:
1. Check all logs (proxy + frontend)
2. Verify environment variables
3. Test each component individually
4. Check network connectivity
5. Verify API keys and credentials
