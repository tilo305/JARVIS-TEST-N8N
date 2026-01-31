import express from 'express';
import { WebSocketServer, WebSocket as WSWebSocket } from 'ws';
import { ConversationSession } from './websocket.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables
const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY || '';
const CARTESIA_VOICE_ID = process.env.CARTESIA_VOICE_ID || '95131c95-525c-463b-893d-803bafdf93c4';
const CARTESIA_MODEL = process.env.CARTESIA_TTS_MODEL || 'sonic-turbo';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

if (!CARTESIA_API_KEY) {
  console.error('❌ CARTESIA_API_KEY is required');
  process.exit(1);
}

if (!N8N_WEBHOOK_URL) {
  console.error('❌ N8N_WEBHOOK_URL is required');
  process.exit(1);
}

// CORS middleware for HTTP endpoints
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow localhost and common development origins
  const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.ALLOWED_ORIGIN
  ].filter(Boolean);
  
  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// HTTP server for health checks
app.use(express.json());
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'ok', 
    service: 'jarvis-websocket-proxy',
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.size,
    environment: {
      hasCartesiaKey: !!CARTESIA_API_KEY,
      hasN8NWebhook: !!N8N_WEBHOOK_URL,
      voiceId: CARTESIA_VOICE_ID,
      model: CARTESIA_MODEL
    }
  });
});

// Connection status endpoint
app.get('/status', (_req: express.Request, res: express.Response) => {
  const sessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
    conversationId: id,
    // Note: We can't directly access private properties, but we can log session info
    active: true
  }));

  res.json({
    status: 'ok',
    service: 'jarvis-websocket-proxy',
    timestamp: new Date().toISOString(),
    connections: {
      activeSessions: activeSessions.size,
      sessions: sessions
    },
    configuration: {
      port: PORT,
      cartesiaConfigured: !!CARTESIA_API_KEY,
      n8nConfigured: !!N8N_WEBHOOK_URL,
      voiceId: CARTESIA_VOICE_ID,
      model: CARTESIA_MODEL
    }
  });
});

// WebSocket server
const server = app.listen(PORT, () => {
  console.log(`🚀 WebSocket proxy server running on port ${PORT}`);
});

const wss = new WebSocketServer({ 
  server, 
  path: '/ws',
  // Verify client origin for security (optional but recommended)
  verifyClient: (info) => {
    const origin = info.origin;
    // In development, allow all origins; in production, validate against allowed list
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
      if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
        console.warn(`⚠️ WebSocket connection rejected from origin: ${origin}`);
        return false;
      }
    }
    return true;
  }
});

const activeSessions = new Map<string, ConversationSession>();

wss.on('connection', (ws: WSWebSocket, req: { url?: string; headers: { host?: string; origin?: string } }) => {
  const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`✅ New WebSocket connection: ${conversationId}`);

  // Extract session ID from query params if present
  let sessionId: string | undefined;
  try {
    if (req.url) {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      sessionId = url.searchParams.get('sessionId') || undefined;
    }
  } catch (error) {
    console.warn('Failed to parse WebSocket URL:', error);
  }

  const session = new ConversationSession(
    ws,
    conversationId,
    CARTESIA_API_KEY,
    CARTESIA_VOICE_ID,
    CARTESIA_MODEL,
    N8N_WEBHOOK_URL,
    sessionId
  );

  activeSessions.set(conversationId, session);

  ws.on('close', () => {
    console.log(`🔌 WebSocket closed: ${conversationId}`);
    activeSessions.delete(conversationId);
  });

  ws.on('error', (error: Error) => {
    console.error(`❌ WebSocket error for ${conversationId}:`, error);
    activeSessions.delete(conversationId);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, closing server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});
