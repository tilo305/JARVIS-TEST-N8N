# Environment Variables Setup Guide

## Current Status

**❌ No .env files found** - You need to create them with your API keys.

## Required Environment Variables

### 1. Frontend (.env in root directory)

**Required:**
- `VITE_CARTESIA_API_KEY` - Your Cartesia API key (get from https://www.cartesia.ai/)

**Optional:**
- `VITE_CARTESIA_VOICE_ID` - Voice ID (default: `95131c95-525c-463b-893d-803bafdf93c4`)
- `VITE_CARTESIA_TTS_MODEL` - Model name (default: `sonic-turbo`)
- `VITE_CARTESIA_TTS_SPEED` - Speed (default: `1.05`)
- `VITE_WEBSOCKET_PROXY_URL` - WebSocket URL (default: `ws://localhost:3001/ws`)
- `VITE_N8N_WEBHOOK_URL` - Override N8N webhook (optional, has default)

### 2. Backend (websocket-proxy/.env)

**Required:**
- `CARTESIA_API_KEY` - Your Cartesia API key (same as frontend)
- `N8N_WEBHOOK_URL` - Your N8N webhook URL (default: `https://n8n.hempstarai.com/webhook/170d9a22-bac0-438c-9755-dc79b961d36e`)

**Optional:**
- `CARTESIA_VOICE_ID` - Voice ID (default: `95131c95-525c-463b-893d-803bafdf93c4`)
- `CARTESIA_TTS_MODEL` - Model name (default: `sonic-turbo`)
- `PORT` - Server port (default: `3001`)

## Quick Setup

### Option 1: Manual Setup

1. **Create frontend .env:**
   ```bash
   # In root directory
   cp .env.example .env
   # Edit .env and add your VITE_CARTESIA_API_KEY
   ```

2. **Create backend .env:**
   ```bash
   # In websocket-proxy directory
   cp .env.example .env
   # Edit .env and add:
   # - CARTESIA_API_KEY (same as frontend)
   # - N8N_WEBHOOK_URL (if different from default)
   ```

### Option 2: Use Setup Script

```bash
# From root directory
node setup-env.mjs
# Then edit the created .env files with your API keys
```

## What You Need

1. **Cartesia API Key:**
   - Sign up at https://www.cartesia.ai/
   - Get your API key (starts with `sk_car_`)
   - Add to both `.env` files:
     - Frontend: `VITE_CARTESIA_API_KEY=sk_car_...`
     - Backend: `CARTESIA_API_KEY=sk_car_...`

2. **N8N Webhook URL:**
   - Default is already configured: `https://n8n.hempstarai.com/webhook/170d9a22-bac0-438c-9755-dc79b961d36e`
   - If you need a different one, add to `websocket-proxy/.env`:
     - `N8N_WEBHOOK_URL=your_webhook_url_here`

## Verification

After creating .env files, verify they're set up correctly:

```bash
# Check frontend .env
cat .env | grep VITE_CARTESIA_API_KEY

# Check backend .env
cat websocket-proxy/.env | grep CARTESIA_API_KEY
```

## Important Notes

- ⚠️ **Never commit .env files to git** (they're in .gitignore)
- ✅ **Do commit .env.example files** (they're templates)
- 🔑 **Keep your API keys secure** - don't share them
- 📝 **Use the same Cartesia API key** in both frontend and backend

## Current Configuration

Based on the code, I can see:
- **Default N8N Webhook:** `https://n8n.hempstarai.com/webhook/170d9a22-bac0-438c-9755-dc79b961d36e`
- **Default Voice ID:** `95131c95-525c-463b-893d-803bafdf93c4`
- **Default Model:** `sonic-turbo`
- **Default Port:** `3001`

These defaults are already in the code, but you still need to add your **Cartesia API key** to make everything work.

---

**Next Step:** Create the .env files and add your Cartesia API key!
