# WebSocket Connection Error - Quick Fix

## The Problem

You're seeing WebSocket connection errors because **the WebSocket proxy server is not running**.

**Good news:** AudioWorklet is working fine! ✅ (The `debugAudioWorklet()` showed `success: true`)

## The Solution

Start the WebSocket proxy server:

### Option 1: Quick Start (Recommended)
```bash
cd websocket-proxy
npm run dev
```

You should see:
```
🚀 WebSocket proxy server running on port 3001
```

### Option 2: Check if Already Running
```bash
# Check if port 3001 is in use
netstat -an | findstr :3001
```

If it's already running, the issue might be:
- Wrong port configuration
- Firewall blocking the connection
- CORS issues

## Verify It's Working

1. **Check health endpoint:**
   ```bash
   curl http://localhost:3001/health
   ```
   Should return: `{"status":"ok","service":"jarvis-websocket-proxy"}`

2. **Check browser console:**
   - Errors should stop appearing
   - You should see: `✅ WebSocket connected`

## Environment Setup

Make sure you have a `.env` file in `websocket-proxy/` with:
```env
CARTESIA_API_KEY=your_api_key_here
N8N_WEBHOOK_URL=your_webhook_url_here
PORT=3001
```

## Running Both Servers

You need **two terminals** running:

**Terminal 1 - Frontend:**
```bash
npm run dev
# Runs on http://localhost:8080
```

**Terminal 2 - WebSocket Proxy:**
```bash
cd websocket-proxy
npm run dev
# Runs on ws://localhost:3001
```

## Improved Error Handling

The code now:
- ✅ Only logs errors once per 10 seconds (reduces spam)
- ✅ Shows helpful fix message: "Start the WebSocket proxy server"
- ✅ Automatically attempts reconnection when server becomes available
- ✅ Stops trying after 10 failed attempts

## Still Having Issues?

1. **Check the proxy server logs** - Look for startup errors
2. **Verify environment variables** - Make sure `.env` is configured
3. **Check port conflicts** - Make sure nothing else is using port 3001
4. **Test the health endpoint** - `curl http://localhost:3001/health`

The WebSocket errors will stop once the proxy server is running!
