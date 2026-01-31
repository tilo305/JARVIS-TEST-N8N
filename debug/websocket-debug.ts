/**
 * WebSocket Connection Debug Tool
 * Live debugging for WebSocket connection issues in JARVIS
 * 
 * Based on zEn DeBuGgEr.md requirements:
 * - Comprehensive research on all WebSocket issues
 * - LIVE testing and debugging
 * - 100% working fixes
 * 
 * Usage: Import and call debugWebSocket() in browser console
 */

import { getWebSocketUrl } from './utils';

export interface WebSocketDebugState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: 'closed' | 'connecting' | 'open' | 'error';
  url: string | null;
  readyState: number | null;
  error: string | null;
  lastMessage: unknown;
  messageCount: number;
  reconnectAttempts: number;
  latency: number | null;
  sessionId: string | null;
  conversationId: string | null;
}

export interface WebSocketDiagnostics {
  timestamp: number;
  state: WebSocketDebugState;
  checks: Array<{
    check: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: Record<string, unknown>;
  }>;
  recommendations: string[];
  canConnect: boolean;
}

/**
 * Test WebSocket connection
 */
export async function debugWebSocket(): Promise<WebSocketDiagnostics> {
  console.group('🔍 WebSocket Connection Debug');
  console.log('Starting comprehensive WebSocket diagnostics...\n');

  const diagnostics: WebSocketDiagnostics = {
    timestamp: Date.now(),
    state: {
      isConnected: false,
      isConnecting: false,
      connectionState: 'closed',
      url: null,
      readyState: null,
      error: null,
      lastMessage: null,
      messageCount: 0,
      reconnectAttempts: 0,
      latency: null,
      sessionId: null,
      conversationId: null,
    },
    checks: [],
    recommendations: [],
    canConnect: false,
  };

  // 1. Check browser support
  const hasWebSocket = typeof WebSocket !== 'undefined';
  diagnostics.checks.push({
    check: 'WebSocket Support',
    status: hasWebSocket ? 'pass' : 'fail',
    message: hasWebSocket ? 'WebSocket API available' : 'WebSocket API not available',
  });

  if (!hasWebSocket) {
    diagnostics.recommendations.push('Upgrade browser to support WebSocket');
    console.groupEnd();
    return diagnostics;
  }

  // 2. Check proxy URL
  const wsUrl = await getWebSocketUrl();
  diagnostics.state.url = wsUrl;
  diagnostics.checks.push({
    check: 'WebSocket URL',
    status: wsUrl ? 'pass' : 'fail',
    message: wsUrl ? `URL configured: ${wsUrl}` : 'WebSocket URL not configured',
    details: { url: wsUrl },
  });

  if (!wsUrl) {
    diagnostics.recommendations.push('Set VITE_WEBSOCKET_PROXY_URL in .env file');
    console.groupEnd();
    return diagnostics;
  }

  // 3. Test proxy server health
  try {
    const healthUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace(':3001', ':3001/health');
    const healthResponse = await fetch(healthUrl, { method: 'GET' });
    const healthOk = healthResponse.ok;
    
    diagnostics.checks.push({
      check: 'Proxy Server Health',
      status: healthOk ? 'pass' : 'fail',
      message: healthOk ? 'Proxy server is running' : 'Proxy server is not responding',
      details: {
        status: healthResponse.status,
        statusText: healthResponse.statusText,
      },
    });

    if (!healthOk) {
      diagnostics.recommendations.push('Start the WebSocket proxy server: cd websocket-proxy && npm run dev');
    }
  } catch (error) {
    diagnostics.checks.push({
      check: 'Proxy Server Health',
      status: 'fail',
      message: 'Failed to check proxy server health',
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    diagnostics.recommendations.push('Start the WebSocket proxy server: cd websocket-proxy && npm run dev');
  }

  // 4. Test WebSocket connection
  if (wsUrl) {
    try {
      console.log('🔌 Testing WebSocket connection...');
      diagnostics.state.isConnecting = true;
      diagnostics.state.connectionState = 'connecting';

      const testWs = new WebSocket(wsUrl);
      const connectStartTime = performance.now();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          testWs.close();
          reject(new Error('Connection timeout after 5 seconds'));
        }, 5000);

        testWs.onopen = () => {
          clearTimeout(timeout);
          const latency = performance.now() - connectStartTime;
          diagnostics.state.isConnected = true;
          diagnostics.state.isConnecting = false;
          diagnostics.state.connectionState = 'open';
          diagnostics.state.readyState = testWs.readyState;
          diagnostics.state.latency = latency;
          diagnostics.canConnect = true;

          diagnostics.checks.push({
            check: 'WebSocket Connection',
            status: 'pass',
            message: `Connected successfully (${latency.toFixed(2)}ms)`,
            details: {
              readyState: testWs.readyState,
              latency,
            },
          });

          // Send test message
          testWs.send(JSON.stringify({ type: 'ping' }));

          // Wait for response or close
          setTimeout(() => {
            testWs.close();
            resolve();
          }, 1000);
        };

        testWs.onerror = (error) => {
          clearTimeout(timeout);
          diagnostics.state.isConnecting = false;
          diagnostics.state.connectionState = 'error';
          diagnostics.state.error = 'Connection error occurred';
          
          diagnostics.checks.push({
            check: 'WebSocket Connection',
            status: 'fail',
            message: 'Connection failed',
            details: { error },
          });

          diagnostics.recommendations.push('Check proxy server is running');
          diagnostics.recommendations.push('Verify WebSocket URL is correct');
          diagnostics.recommendations.push('Check firewall/network settings');
          
          testWs.close();
          reject(error);
        };

        testWs.onclose = () => {
          clearTimeout(timeout);
          resolve();
        };
      });

    } catch (error) {
      diagnostics.state.isConnecting = false;
      diagnostics.state.connectionState = 'error';
      diagnostics.state.error = error instanceof Error ? error.message : String(error);
      
      diagnostics.checks.push({
        check: 'WebSocket Connection',
        status: 'fail',
        message: 'Connection test failed',
        details: { error: diagnostics.state.error },
      });
    }
  }

  // 5. Check existing connections in useWebSocketVoice
  try {
    // Try to access the hook's state if available
    const reactRoot = document.getElementById('root');
    if (reactRoot) {
      diagnostics.checks.push({
        check: 'React App Loaded',
        status: 'pass',
        message: 'React app is loaded',
      });
    } else {
      diagnostics.checks.push({
        check: 'React App Loaded',
        status: 'warning',
        message: 'React app may not be fully loaded',
      });
    }
  } catch (error) {
    diagnostics.checks.push({
      check: 'React App Loaded',
      status: 'warning',
      message: 'Could not verify React app state',
    });
  }

  // Summary
  const passed = diagnostics.checks.filter(c => c.status === 'pass').length;
  const failed = diagnostics.checks.filter(c => c.status === 'fail').length;
  const warnings = diagnostics.checks.filter(c => c.status === 'warning').length;

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  
  if (diagnostics.canConnect) {
    console.log('✅ WebSocket connection is working');
  } else {
    console.log('❌ WebSocket connection has issues');
    if (diagnostics.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      diagnostics.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  }

  console.groupEnd();
  return diagnostics;
}

/**
 * Monitor WebSocket connection in real-time
 */
export function monitorWebSocket(
  onStateChange?: (state: WebSocketDebugState) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let intervalId: number | null = null;
  let lastState: WebSocketDebugState | null = null;

  const checkState = async () => {
    const diagnostics = await debugWebSocket();
    const state = diagnostics.state;

    if (lastState && JSON.stringify(lastState) !== JSON.stringify(state)) {
      console.log('🔄 WebSocket state changed:', state);
      onStateChange?.(state);
    }

    lastState = state;
  };

  // Check every 5 seconds
  intervalId = window.setInterval(checkState, 5000);
  checkState(); // Initial check

  // Return cleanup function
  return () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  };
}

/**
 * Test WebSocket with actual message
 */
export async function testWebSocketMessage(message: unknown): Promise<boolean> {
  const wsUrl = await getWebSocketUrl();
  if (!wsUrl) {
    console.error('❌ WebSocket URL not configured');
    return false;
  }

  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        ws.send(JSON.stringify(message));
        setTimeout(() => {
          ws.close();
          resolve(true);
        }, 1000);
      };

      ws.onerror = () => {
        resolve(false);
      };

      ws.onclose = () => {
        resolve(false);
      };
    } catch (error) {
      console.error('❌ WebSocket test failed:', error);
      resolve(false);
    }
  });
}
