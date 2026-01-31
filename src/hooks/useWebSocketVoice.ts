import { useEffect, useRef, useState, useCallback } from 'react';
import { config } from '@/lib/config';

interface WebSocketMessage {
  type: 'transcript' | 'audio_chunk' | 'error' | 'conversation_started' | 'done';
  conversationId?: string;
  transcript?: string;
  audio?: {
    data: string;
    format: string;
  };
  error?: string;
  isPartial?: boolean;
}

interface UseWebSocketVoiceOptions {
  onTranscript?: (text: string, isPartial: boolean) => void;
  onAudioChunk?: (audioData: ArrayBuffer) => void;
  onError?: (error: string) => void;
  sessionId?: string;
}

export function useWebSocketVoice(options: UseWebSocketVoiceOptions = {}) {
  const { onTranscript, onAudioChunk, onError, sessionId } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBufferSourceNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set()); // Track all active sources for cancellation
  const nextPlayTimeRef = useRef<number>(0); // For seamless chunk playback
  
  // Retry logic with exponential backoff
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const baseReconnectDelay = 1000; // Start with 1 second
  const maxReconnectDelay = 30000; // Max 30 seconds
  
  // Connection storm prevention - prevent rapid reconnections
  const lastConnectionAttemptRef = useRef<number>(0);
  const minConnectionInterval = 2000; // Minimum 2 seconds between connection attempts
  const connectionStormThreshold = 5; // Max 5 connections in 10 seconds
  const recentConnectionAttemptsRef = useRef<number[]>([]);
  
  // Error rate limiting to prevent console spam
  const errorLogRef = useRef<Array<{ timestamp: number; error: string }>>([]);
  const maxErrorLogSize = 10;
  const errorRateLimitWindow = 5000; // 5 seconds

  const handleAudioChunk = useCallback((audio: { data: string; format: string }) => {
    try {
      // Decode base64 to ArrayBuffer
      const binary = atob(audio.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      // Convert PCM F32LE to Float32Array
      // PCM F32LE means 32-bit float little-endian (4 bytes per float)
      // For optimal latency, process chunks immediately without waiting
      const bytesPerFloat = 4;
      const floatCount = Math.floor(bytes.byteLength / bytesPerFloat);
      
      if (floatCount === 0) {
        console.warn('Received empty audio chunk, skipping');
        return;
      }
      
      // Create Float32Array view of the buffer
      const float32Array = new Float32Array(bytes.buffer, bytes.byteOffset, floatCount);
      
      const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      // Play audio chunk immediately for real-time streaming
      // This provides the lowest latency - audio plays as it arrives
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      // Schedule playback for seamless chunk concatenation
      // If this is the first chunk, start immediately
      // Otherwise, schedule to start when previous chunk ends
      const currentTime = audioContextRef.current.currentTime;
      const startTime = nextPlayTimeRef.current === 0 
        ? currentTime + 0.01 // Small delay for first chunk to ensure smooth start
        : Math.max(currentTime, nextPlayTimeRef.current);
      
      source.start(startTime);
      
      // Update next play time for seamless playback
      const duration = audioBuffer.duration;
      nextPlayTimeRef.current = startTime + duration;
      
      // Track source for potential interruption (bidirectional flow)
      audioBufferRef.current = source;
      activeSourcesRef.current.add(source);
      
      // Remove source when it finishes playing
      source.onended = () => {
        activeSourcesRef.current.delete(source);
        if (audioBufferRef.current === source) {
          audioBufferRef.current = null;
        }
      };

      // Also call callback for external handling
      onAudioChunk?.(bytes.buffer);
    } catch (error) {
      console.error('Failed to handle audio chunk:', error);
    }
  }, [onAudioChunk]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'conversation_started':
        conversationIdRef.current = message.conversationId || null;
        break;

      case 'transcript':
        if (message.transcript) {
          onTranscript?.(message.transcript, message.isPartial || false);
        }
        break;

      case 'audio_chunk':
        if (message.audio) {
          handleAudioChunk(message.audio);
        }
        break;

      case 'error':
        onError?.(message.error || 'Unknown error');
        break;

      case 'done':
        // Conversation complete
        break;
    }
  }, [onTranscript, onError, handleAudioChunk]);

  const connect = useCallback(async () => {
    // Prevent connection storms - check if we're connecting too frequently
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;
    
    // Remove old attempts (older than 10 seconds)
    recentConnectionAttemptsRef.current = recentConnectionAttemptsRef.current.filter(
      timestamp => now - timestamp < 10000
    );
    
    // Check for connection storm
    if (recentConnectionAttemptsRef.current.length >= connectionStormThreshold) {
      const waitTime = 10000 - (now - recentConnectionAttemptsRef.current[0]);
      console.warn(`⚠️ Connection storm detected (${recentConnectionAttemptsRef.current.length} attempts in 10s). Waiting ${waitTime}ms before next attempt...`);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect().catch(console.error);
      }, waitTime);
      return;
    }
    
    // Enforce minimum interval between connection attempts
    if (timeSinceLastAttempt < minConnectionInterval && timeSinceLastAttempt > 0) {
      const waitTime = minConnectionInterval - timeSinceLastAttempt;
      console.log(`⏳ Waiting ${waitTime}ms before connection attempt (storm prevention)...`);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect().catch(console.error);
      }, waitTime);
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected, skipping connection attempt');
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('⏳ WebSocket already connecting, skipping duplicate attempt');
      return;
    }

    // Record this connection attempt
    lastConnectionAttemptRef.current = now;
    recentConnectionAttemptsRef.current.push(now);
    
    console.log(`🔌 Attempting WebSocket connection (attempt ${recentConnectionAttemptsRef.current.length}/${connectionStormThreshold} in last 10s)...`);
    setIsConnecting(true);

    // Add connection timeout to prevent hanging
    let connectionTimeout: NodeJS.Timeout | undefined;
    
    try {
      // Use config for consistency, fallback to env or default
      const wsUrl = config.websocketProxyUrl || import.meta.env.VITE_WEBSOCKET_PROXY_URL || 'ws://localhost:3001/ws';
      
      // Connection timeout - only trigger if connection is still in progress
      connectionTimeout = setTimeout(() => {
        const currentWs = wsRef.current;
        if (currentWs && currentWs.readyState !== WebSocket.OPEN && currentWs.readyState !== WebSocket.CLOSED) {
          // Connection is still in CONNECTING state after timeout
          console.warn('WebSocket connection timeout - proxy server may not be running');
          setIsConnecting(false);
          // Close the connection to trigger onclose handler
          currentWs.close();
          // The onclose handler will call onError with proper error message
        }
      }, 5000); // 5 second timeout
      
      // Construct URL with session ID if provided
      let finalUrl = wsUrl;
      if (sessionId) {
        try {
          const url = new URL(wsUrl);
          url.searchParams.set('sessionId', sessionId);
          finalUrl = url.toString();
        } catch (urlError) {
          // If URL construction fails, append as query string
          console.warn('Failed to construct URL with sessionId, appending manually:', urlError);
          const separator = wsUrl.includes('?') ? '&' : '?';
          finalUrl = `${wsUrl}${separator}sessionId=${encodeURIComponent(sessionId)}`;
        }
      }

      const ws = new WebSocket(finalUrl);

      // Reconnection function with exponential backoff (defined before use)
      const attemptReconnect = () => {
        // Don't reconnect if already connected or connecting
        if (wsRef.current?.readyState === WebSocket.OPEN || 
            wsRef.current?.readyState === WebSocket.CONNECTING ||
            isConnecting) {
          return;
        }
        
        // Don't reconnect if max attempts reached
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error(`❌ Max reconnection attempts (${maxReconnectAttempts}) reached. Stopping.`);
          onError?.('WebSocket connection failed after multiple attempts. Please refresh the page.');
          return;
        }
        
        reconnectAttemptsRef.current++;
        const delay = Math.min(
          baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1),
          maxReconnectDelay
        );
        
        console.log(`🔄 Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect().catch((err) => {
            console.error('Reconnection attempt failed:', err);
          });
        }, delay);
      };

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;
        errorLogRef.current = []; // Clear error log on successful connection
        
        console.log('✅ WebSocket connected - pre-establishing STT/TTS connections for optimal latency');
        setIsConnected(true);
        setIsConnecting(false);
        
        // Pre-establish conversation connections (STT + TTS) for optimal latency
        // This eliminates ~200ms connection overhead per turn
        ws.send(JSON.stringify({
          type: 'start_conversation',
          conversationId: conversationIdRef.current
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        // Note: ws.onerror doesn't provide detailed error info in browsers
        // We'll handle actual errors in ws.onclose with close codes
        // This handler just logs for debugging - rate limited to prevent spam
        const now = Date.now();
        const recentErrors = errorLogRef.current.filter(
          e => now - e.timestamp < errorRateLimitWindow
        );
        
        // Only log once per error window to prevent console spam
        if (recentErrors.length === 0) {
          console.error('❌ WebSocket error event - connection failed');
          console.log('💡 To fix: Start the WebSocket proxy server with: cd websocket-proxy && npm run dev');
          errorLogRef.current.push({ timestamp: now, error: 'WebSocket error event' });
          if (errorLogRef.current.length > maxErrorLogSize) {
            errorLogRef.current.shift();
          }
        }
        
        // Don't call onError here - wait for onclose to get the actual error code
        // This prevents duplicate error messages
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        
        // Log close reason for debugging
        const closeReason = event.code === 1000 ? 'normal' : `abnormal (code: ${event.code})`;
        const wasClean = event.wasClean;
        console.log(`🔌 WebSocket closed: ${closeReason}, wasClean: ${wasClean}, reason: ${event.reason || 'none'}`);
        
        setIsConnected(false);
        setIsConnecting(false);
        
        // Don't attempt reconnection if this was a normal closure (code 1000)
        // Normal closures are intentional disconnects, not errors
        if (event.code === 1000) {
          console.log('✅ WebSocket closed normally (intentional disconnect)');
          return;
        }
        
        // Not a normal closure - determine error message based on close code
        let errorMessage = 'WebSocket connection error';
        
        // WebSocket close codes: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
        switch (event.code) {
          case 1006:
            // Abnormal closure (no close frame received)
            errorMessage = 'WebSocket connection failed. Please ensure the proxy server is running on port 3001.';
            break;
          case 1002:
            errorMessage = 'WebSocket protocol error.';
            break;
          case 1003:
            errorMessage = 'WebSocket received unsupported data type.';
            break;
          case 1005:
            // No status code received
            errorMessage = 'WebSocket connection closed unexpectedly.';
            break;
          case 1011:
            errorMessage = 'WebSocket server error.';
            break;
          case 1012:
            errorMessage = 'WebSocket service restarting.';
            break;
          case 1013:
            errorMessage = 'WebSocket service temporarily unavailable.';
            break;
          case 1014:
            errorMessage = 'WebSocket bad gateway.';
            break;
          case 1015:
            errorMessage = 'WebSocket TLS handshake failed.';
            break;
          default:
            if (event.code >= 1000 && event.code < 2000) {
              errorMessage = `WebSocket connection closed (code: ${event.code}).`;
            } else {
              errorMessage = 'WebSocket connection error.';
            }
        }
        
        // Rate limit error logging to prevent console spam
        const now = Date.now();
        const recentErrors = errorLogRef.current.filter(
          e => now - e.timestamp < errorRateLimitWindow
        );
        
        // Only log if we haven't logged this error recently (max 1 per 10 seconds)
        if (recentErrors.length === 0) {
          console.error(`❌ WebSocket connection failed (code: ${event.code}): ${errorMessage}`);
          console.log('💡 To fix: Start the WebSocket proxy server with: cd websocket-proxy && npm run dev');
          errorLogRef.current.push({ timestamp: now, error: errorMessage });
          if (errorLogRef.current.length > maxErrorLogSize) {
            errorLogRef.current.shift();
          }
        } else if (reconnectAttemptsRef.current === 0) {
          // Only show reconnection message on first attempt
          console.log(`🔄 WebSocket will attempt to reconnect when server is available...`);
        } else {
          // Suppress duplicate errors but log once every 5 seconds
          const lastErrorTime = errorLogRef.current[errorLogRef.current.length - 1]?.timestamp || 0;
          if (now - lastErrorTime >= errorRateLimitWindow) {
            console.warn(`⚠️ WebSocket errors suppressed (${recentErrors.length} in last 5s). Code: ${event.code}`);
            errorLogRef.current.push({ timestamp: now, error: errorMessage });
          }
        }
        
        // Only call onError if this is not a normal closure and we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          onError?.(errorMessage);
        }
        
        // Attempt reconnection with exponential backoff
        attemptReconnect();
      };

      wsRef.current = ws;
    } catch (error) {
      // Clear timeout if connection setup failed
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      console.error('Failed to connect WebSocket:', error);
      setIsConnecting(false);
      onError?.(error instanceof Error ? error.message : 'Connection failed');
      
      // Attempt reconnection with exponential backoff
      const attemptReconnect = () => {
        // Don't reconnect if already connected or connecting
        if (wsRef.current?.readyState === WebSocket.OPEN || 
            wsRef.current?.readyState === WebSocket.CONNECTING ||
            isConnecting) {
          return;
        }
        
        // Don't reconnect if max attempts reached
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error(`❌ Max reconnection attempts (${maxReconnectAttempts}) reached. Stopping.`);
          onError?.('WebSocket connection failed after multiple attempts. Please refresh the page.');
          return;
        }
        
        reconnectAttemptsRef.current++;
        const delay = Math.min(
          baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1),
          maxReconnectDelay
        );
        
        console.log(`🔄 Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect().catch((err) => {
            console.error('Reconnection attempt failed:', err);
          });
        }, delay);
      };
      
      attemptReconnect();
    }
  }, [sessionId, onError, handleMessage, isConnecting]);

  const sendAudioChunk = useCallback((audioData: ArrayBuffer, format: string, sampleRate: number) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      // Silently fail during connection - chunks will be sent once connected
      return;
    }

    // For optimal latency, convert ArrayBuffer to base64 efficiently
    // Using Uint8Array for faster conversion
    const bytes = new Uint8Array(audioData);
    
    // Optimized base64 encoding for smaller chunks (better performance)
    let binary = '';
    const chunkSize = 8192; // Process in chunks to avoid blocking
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);

    // Send immediately for real-time streaming
    try {
      wsRef.current.send(JSON.stringify({
        type: 'audio_chunk',
        conversationId: conversationIdRef.current,
        audio: {
          data: base64,
          format,
          sampleRate
        }
      }));
    } catch (error) {
      console.error('Failed to send audio chunk:', error);
    }
  }, []);

  const endAudio = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'end_audio',
        conversationId: conversationIdRef.current
      }));
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text_input',
        conversationId: conversationIdRef.current,
        text
      }));
    }
  }, []);

  const cancel = useCallback(() => {
    // Stop all audio playback immediately for true bidirectional interruption
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch (error) {
        // Source may already be stopped, ignore
      }
    });
    activeSourcesRef.current.clear();
    audioBufferRef.current = null;
    nextPlayTimeRef.current = 0; // Reset playback timing
    
    // Cancel backend processing
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cancel',
        conversationId: conversationIdRef.current
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    // Stop all active sources
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch (error) {
        // Source may already be stopped, ignore
      }
    });
    activeSourcesRef.current.clear();
    audioBufferRef.current = null;
    // Reset playback timing
    nextPlayTimeRef.current = 0;
    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendAudioChunk,
    endAudio,
    sendText,
    cancel
  };
}
