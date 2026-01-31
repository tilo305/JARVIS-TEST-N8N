# Development Server Setup

## Quick Start

Run both servers with a single command:

```bash
npm run dev
```

This will:
1. ✅ Clear ports 8080 and 3001
2. ✅ Start the frontend dev server (Vite) on port 8080
3. ✅ Start the WebSocket proxy server on port 3001
4. ✅ Show both servers' output with color-coded labels

## What You'll See

```
🔍 Clearing ports 8080 and 3001...
✅ Ports cleared

[FRONTEND] 🚀 Starting Vite dev server...
[WEBSOCKET] 🚀 WebSocket proxy server running on port 3001
[FRONTEND] VITE v5.4.21  ready in 500 ms
[FRONTEND] ➜  Local:   http://localhost:8080/
```

## Individual Server Commands

If you need to run servers separately:

**Frontend only:**
```bash
npm run dev:frontend
```

**WebSocket proxy only:**
```bash
npm run websocket:dev
```

## Stopping Servers

Press `Ctrl+C` in the terminal to stop both servers.

## Troubleshooting

### Port Already in Use

The script automatically kills processes on ports 8080 and 3001 before starting. If you still see port errors:

1. **Check what's using the port:**
   ```bash
   netstat -ano | findstr :8080
   netstat -ano | findstr :3001
   ```

2. **Manually kill the process:**
   ```bash
   taskkill /F /PID <process_id>
   ```

### WebSocket Connection Errors

If you see WebSocket errors in the browser console:
- ✅ Check that the `[WEBSOCKET]` server started successfully
- ✅ Verify it shows: `🚀 WebSocket proxy server running on port 3001`
- ✅ Check the health endpoint: `curl http://localhost:3001/health`

### Environment Variables

Make sure `websocket-proxy/.env` is configured:
```env
CARTESIA_API_KEY=your_key_here
N8N_WEBHOOK_URL=your_webhook_url
PORT=3001
```

## Benefits

- ✅ **One command** to start everything
- ✅ **Color-coded output** - easy to see which server is logging
- ✅ **Automatic port cleanup** - no manual port killing needed
- ✅ **Better debugging** - see both servers' logs in one place
