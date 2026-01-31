# JARVIS WebSocket Proxy Service

WebSocket proxy service for streaming Cartesia STT/TTS with N8N integration.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run in development:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

See `.env.example` for required variables:
- `CARTESIA_API_KEY` - Your Cartesia API key
- `CARTESIA_VOICE_ID` - Voice ID for TTS
- `CARTESIA_TTS_MODEL` - TTS model (e.g., `sonic-turbo`)
- `N8N_WEBHOOK_URL` - Your N8N webhook URL
- `PORT` - Server port (default: 3001)

## API

- **WebSocket:** `ws://localhost:3001/ws`
- **Health Check:** `GET http://localhost:3001/health`

## Architecture

The proxy service:
1. Manages WebSocket connections to Cartesia (STT and TTS)
2. Handles audio streaming between frontend and Cartesia
3. Integrates with N8N for LLM processing
4. Manages conversation sessions

See `docs/CARTESIA_STREAMING.md` for complete documentation.
