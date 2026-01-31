/**
 * STT (Speech-to-Text) Debug Tool
 * Live debugging for STT transcription issues in JARVIS
 * 
 * Based on zEn DeBuGgEr.md requirements:
 * - Comprehensive research on all STT issues
 * - LIVE testing and debugging
 * - 100% working fixes
 * 
 * Usage: Import and call debugSTT() in browser console
 */

export interface STTDebugState {
  isConnected: boolean;
  conversationId: string | null;
  transcript: string | null;
  partialTranscript: string | null;
  isPartial: boolean;
  error: string | null;
  messageCount: number;
  audioFormat: string | null;
  sampleRate: number | null;
}

export interface STTDiagnostics {
  timestamp: number;
  state: STTDebugState;
  checks: Array<{
    check: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: Record<string, unknown>;
  }>;
  recommendations: string[];
  canTranscribe: boolean;
}

import { getCartesiaApiKey, getWebSocketUrl } from './utils';

/**
 * Test STT WebSocket connection
 */
async function testSTTConnection(): Promise<{
  success: boolean;
  error?: string;
  conversationId?: string;
}> {
  try {
    // Get WebSocket proxy URL
    const wsUrl = await getWebSocketUrl();
    if (!wsUrl) {
      return { success: false, error: 'WebSocket URL not configured' };
    }

    return new Promise((resolve) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ success: false, error: 'Connection timeout' });
      }, 5000);

      ws.onopen = () => {
        // Send start_conversation
        ws.send(JSON.stringify({ type: 'start_conversation' }));
        
        setTimeout(() => {
          clearTimeout(timeout);
          ws.close();
          resolve({ success: true });
        }, 2000);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        resolve({ success: false, error: 'WebSocket error' });
      };

      ws.onclose = () => {
        clearTimeout(timeout);
      };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Comprehensive STT diagnostics
 */
export async function debugSTT(): Promise<STTDiagnostics> {
  console.group('🔍 STT (Speech-to-Text) Debug');
  console.log('Starting comprehensive STT diagnostics...\n');

  const diagnostics: STTDiagnostics = {
    timestamp: Date.now(),
    state: {
      isConnected: false,
      conversationId: null,
      transcript: null,
      partialTranscript: null,
      isPartial: false,
      error: null,
      messageCount: 0,
      audioFormat: null,
      sampleRate: null,
    },
    checks: [],
    recommendations: [],
    canTranscribe: false,
  };

  // 1. Check Cartesia API key
  console.log('🔑 Checking Cartesia API key...');
  const apiKey = await getCartesiaApiKey();
  diagnostics.checks.push({
    check: 'Cartesia API Key',
    status: apiKey ? 'pass' : 'fail',
    message: apiKey ? 'API key is configured' : 'API key is not configured',
  });

  if (!apiKey) {
    diagnostics.recommendations.push('Set VITE_CARTESIA_API_KEY in .env file');
    diagnostics.recommendations.push('Get API key from https://cartesia.ai');
  }

  // 2. Check WebSocket proxy URL
  const wsUrl = await getWebSocketUrl();
  
  diagnostics.checks.push({
    check: 'WebSocket Proxy URL',
    status: wsUrl ? 'pass' : 'fail',
    message: wsUrl ? `Proxy URL configured: ${wsUrl}` : 'Proxy URL not configured',
    details: { url: wsUrl },
  });

  if (!wsUrl) {
    diagnostics.recommendations.push('Set VITE_WEBSOCKET_PROXY_URL in .env file');
  }

  // 3. Test WebSocket connection
  if (wsUrl) {
    console.log('🔌 Testing STT WebSocket connection...');
    const connectionTest = await testSTTConnection();
    
    diagnostics.checks.push({
      check: 'STT WebSocket Connection',
      status: connectionTest.success ? 'pass' : 'fail',
      message: connectionTest.success 
        ? 'STT WebSocket connection successful' 
        : `Connection failed: ${connectionTest.error || 'Unknown error'}`,
      details: connectionTest.error ? { error: connectionTest.error } : undefined,
    });

    if (!connectionTest.success) {
      diagnostics.recommendations.push('Start the WebSocket proxy server: cd websocket-proxy && npm run dev');
      diagnostics.recommendations.push('Verify proxy server is running on correct port');
    }
  }

  // 4. Check audio format requirements
  diagnostics.state.audioFormat = 'PCM S16LE';
  diagnostics.state.sampleRate = 16000;
  
  diagnostics.checks.push({
    check: 'Audio Format Requirements',
    status: 'pass',
    message: 'STT requires PCM S16LE at 16kHz',
    details: {
      format: diagnostics.state.audioFormat,
      sampleRate: diagnostics.state.sampleRate,
    },
  });

  // 5. Check if audio recording is available
  try {
    const hasMediaDevices = typeof navigator !== 'undefined' && navigator.mediaDevices !== undefined;
    if (hasMediaDevices) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      diagnostics.checks.push({
        check: 'Microphone Access',
        status: 'pass',
        message: 'Microphone is accessible',
      });
    } else {
      diagnostics.checks.push({
        check: 'Microphone Access',
        status: 'fail',
        message: 'MediaDevices API not available',
      });
    }
  } catch (error) {
    diagnostics.checks.push({
      check: 'Microphone Access',
      status: 'fail',
      message: 'Microphone access denied or unavailable',
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    diagnostics.recommendations.push('Grant microphone permission');
  }

  // 6. Check AudioContext support
  try {
    const ctx = new AudioContext();
    const sampleRate = ctx.sampleRate;
    ctx.close();
    
    diagnostics.checks.push({
      check: 'AudioContext Support',
      status: 'pass',
      message: `AudioContext available (${sampleRate}Hz)`,
      details: { sampleRate },
    });
  } catch (error) {
    diagnostics.checks.push({
      check: 'AudioContext Support',
      status: 'fail',
      message: 'AudioContext not available',
      details: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  // Summary
  const passed = diagnostics.checks.filter(c => c.status === 'pass').length;
  const failed = diagnostics.checks.filter(c => c.status === 'fail').length;
  const warnings = diagnostics.checks.filter(c => c.status === 'warning').length;

  diagnostics.canTranscribe = 
    apiKey !== null &&
    wsUrl !== null &&
    diagnostics.checks.find(c => c.check === 'STT WebSocket Connection')?.status === 'pass' &&
    diagnostics.checks.find(c => c.check === 'Microphone Access')?.status === 'pass';

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  
  if (diagnostics.canTranscribe) {
    console.log('✅ STT is ready');
  } else {
    console.log('❌ STT has issues');
    if (diagnostics.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      diagnostics.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  }

  console.groupEnd();
  return diagnostics;
}

/**
 * Test STT with actual audio
 */
export async function testSTTWithAudio(audioData: ArrayBuffer): Promise<{
  success: boolean;
  transcript: string | null;
  error?: string;
}> {
  try {
    const wsUrl = await getWebSocketUrl();
    if (!wsUrl) {
      return { success: false, transcript: null, error: 'WebSocket URL not configured' };
    }

    return new Promise((resolve) => {
      const ws = new WebSocket(wsUrl);
      let transcript: string | null = null;

      ws.onopen = () => {
        // Send start_conversation
        ws.send(JSON.stringify({ type: 'start_conversation' }));

        // Convert audio to base64
        const bytes = new Uint8Array(audioData);
        const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
        const base64 = btoa(binary);

        // Send audio chunk
        ws.send(JSON.stringify({
          type: 'audio',
          data: base64,
          format: 'pcm_s16le',
        }));

        // End audio
        ws.send(JSON.stringify({ type: 'end_audio' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript' && !data.isPartial) {
            transcript = data.transcript || null;
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        resolve({ success: false, error: 'WebSocket error', transcript: null });
      };

      setTimeout(() => {
        ws.close();
        resolve({ success: transcript !== null, transcript, error: transcript ? undefined : 'No transcript received' });
      }, 5000);
    });
  } catch (error) {
    return {
      success: false,
      transcript: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
