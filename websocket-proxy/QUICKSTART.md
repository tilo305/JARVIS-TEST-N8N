# WebSocket Proxy Quick Start

## Prerequisites

- Node.js 18+ installed
- Cartesia API key
- N8N webhook URL

## Setup Steps

1. **Install dependencies:**
   ```bash
   cd websocket-proxy
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add:
   - `CARTESIA_API_KEY` - Your Cartesia API key
   - `CARTESIA_VOICE_ID` - Voice ID (default provided)
   - `CARTESIA_TTS_MODEL` - Model name (default: `sonic-turbo`)
   - `N8N_WEBHOOK_URL` - Your N8N webhook URL
   - `PORT` - Server port (default: 3001)

3. **Start the service:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   🚀 WebSocket proxy server running on port 3001
   ```

4. **Test the health endpoint:**
   ```bash
   curl http://localhost:3001/health
   ```

   Should return: `{"status":"ok","service":"jarvis-websocket-proxy"}`

5. **Configure frontend:**
   
   Add to your frontend `.env`:
   ```env
   VITE_WEBSOCKET_PROXY_URL=ws://localhost:3001/ws
   ```

6. **Start frontend:**
   ```bash
   npm run dev
   ```

## Testing

1. Open the frontend in your browser
2. Check browser console for "✅ WebSocket connected"
3. Send a voice or text message
4. Verify streaming responses

## Troubleshooting

- **Connection fails:** Check that the proxy service is running
- **No audio:** Verify Cartesia API key is correct
- **No transcript:** Check audio format (PCM S16LE, 16kHz)
- **N8N errors:** Verify N8N webhook URL is correct

See `docs/CARTESIA_STREAMING.md` for complete documentation.
