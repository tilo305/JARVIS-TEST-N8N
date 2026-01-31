/**
 * WebSocket LIVE Debugger
 * Real-time monitoring and debugging for WebSocket connection errors
 * 
 * Based on zEn DeBuGgEr.md requirements:
 * - Comprehensive research on all WebSocket issues
 * - LIVE testing and debugging
 * - 100% working fixes
 * 
 * Usage: 
 *   import { startWebSocketLiveDebug } from './debug/websocket-live-debugger';
 *   const stop = startWebSocketLiveDebug();
 *   // Later: stop();
 */

export interface WebSocketErrorEvent {
  timestamp: number;
  type: 'connection_error' | 'message_error' | 'close_error' | 'timeout';
  error: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface WebSocketConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  readyState: number | null;
  url: string | null;
  lastError: WebSocketErrorEvent | null;
  errorCount: number;
  connectionAttempts: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  messageCount: number;
  latency: number | null;
}

export interface WebSocketLiveDebugStats {
  startTime: number;
  totalErrors: number;
  errorRate: number; // errors per minute
  connectionUptime: number; // seconds
  averageLatency: number | null;
  errorTypes: Record<string, number>;
  recentErrors: WebSocketErrorEvent[];
  currentState: WebSocketConnectionState;
}

class WebSocketLiveDebugger {
  private errorLog: WebSocketErrorEvent[] = [];
  private maxErrorLogSize = 100;
  private stats: WebSocketLiveDebugStats;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;
  private errorRateLimiter: Map<string, number> = new Map();
  private monitoringInterval: number | null = null;
  private isMonitoring = false;
  private wsInstance: WebSocket | null = null;
  private wsUrl: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.stats = {
      startTime: Date.now(),
      totalErrors: 0,
      errorRate: 0,
      connectionUptime: 0,
      averageLatency: null,
      errorTypes: {},
      recentErrors: [],
      currentState: {
        isConnected: false,
        isConnecting: false,
        readyState: null,
        url: null,
        lastError: null,
        errorCount: 0,
        connectionAttempts: 0,
        lastConnectedAt: null,
        lastDisconnectedAt: null,
        messageCount: 0,
        latency: null,
      },
    };

    // Store original console methods
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
  }

  /**
   * Start LIVE monitoring of WebSocket errors
   */
  start(): () => void {
    if (this.isMonitoring) {
      console.warn('⚠️ WebSocket LIVE debugger is already running');
      return this.stop.bind(this);
    }

    console.log('🔍 Starting WebSocket LIVE Debugger...');
    this.isMonitoring = true;

    // Intercept console errors related to WebSocket
    this.interceptConsoleErrors();

    // Monitor WebSocket state every 2 seconds
    this.monitoringInterval = window.setInterval(() => {
      this.updateStats();
      this.checkConnectionHealth();
    }, 2000);

    // Try to hook into existing WebSocket connections
    this.hookIntoWebSocket();

    // Initial check
    this.updateStats();

    console.log('✅ WebSocket LIVE Debugger started');
    console.log('📊 Use getWebSocketStats() to view current statistics');
    console.log('🛑 Call stop() to stop monitoring');

    return this.stop.bind(this);
  }

  /**
   * Stop LIVE monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping WebSocket LIVE Debugger...');
    this.isMonitoring = false;

    // Restore original console methods
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;

    // Clear monitoring interval
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Clear reconnect timeout
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close test connection if exists
    if (this.wsInstance) {
      this.wsInstance.close();
      this.wsInstance = null;
    }

    console.log('✅ WebSocket LIVE Debugger stopped');
  }

  /**
   * Intercept console errors to catch WebSocket errors
   */
  private interceptConsoleErrors(): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const debuggerInstance = this;

    console.error = function(...args: unknown[]) {
      const message = args.join(' ');
      if (message.includes('WebSocket') || message.includes('websocket')) {
        debuggerInstance.logError({
          timestamp: Date.now(),
          type: 'connection_error',
          error: message,
          details: { args },
        });
      }
      // Still call original console.error
      debuggerInstance.originalConsoleError.apply(console, args);
    };

    console.warn = function(...args: unknown[]) {
      const message = args.join(' ');
      if (message.includes('WebSocket') || message.includes('websocket')) {
        // Warnings are less critical but still track them
        debuggerInstance.logError({
          timestamp: Date.now(),
          type: 'connection_error',
          error: message,
          details: { args, severity: 'warning' },
        });
      }
      // Still call original console.warn
      debuggerInstance.originalConsoleWarn.apply(console, args);
    };
  }

  /**
   * Hook into WebSocket constructor to monitor all connections
   */
  private hookIntoWebSocket(): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const debuggerInstance = this;
    const OriginalWebSocket = window.WebSocket;

    // Override WebSocket constructor
    window.WebSocket = class extends OriginalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        debuggerInstance.trackWebSocket(this, url.toString());
      }
    } as typeof WebSocket;

    // Copy static properties
    Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
    Object.setPrototypeOf(window.WebSocket.prototype, OriginalWebSocket.prototype);
  }

  /**
   * Track a WebSocket instance
   */
  private trackWebSocket(ws: WebSocket, url: string): void {
    this.wsInstance = ws;
    this.wsUrl = url;
    this.stats.currentState.url = url;
    this.stats.currentState.connectionAttempts++;

    const connectStartTime = performance.now();

    ws.addEventListener('open', () => {
      const latency = performance.now() - connectStartTime;
      this.stats.currentState.isConnected = true;
      this.stats.currentState.isConnecting = false;
      this.stats.currentState.readyState = ws.readyState;
      this.stats.currentState.latency = latency;
      this.stats.currentState.lastConnectedAt = Date.now();
      this.stats.currentState.errorCount = 0;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000; // Reset delay

      // Update average latency
      if (this.stats.averageLatency === null) {
        this.stats.averageLatency = latency;
      } else {
        this.stats.averageLatency = (this.stats.averageLatency + latency) / 2;
      }

      console.log(`✅ WebSocket connected (${latency.toFixed(2)}ms)`);
    });

    ws.addEventListener('error', (event) => {
      this.stats.currentState.isConnecting = false;
      this.stats.currentState.readyState = ws.readyState;

      const errorEvent: WebSocketErrorEvent = {
        timestamp: Date.now(),
        type: 'connection_error',
        error: 'WebSocket connection error',
        details: {
          readyState: ws.readyState,
          url,
          event,
        },
      };

      this.logError(errorEvent);
    });

    ws.addEventListener('close', (event) => {
      this.stats.currentState.isConnected = false;
      this.stats.currentState.isConnecting = false;
      this.stats.currentState.readyState = ws.readyState;
      this.stats.currentState.lastDisconnectedAt = Date.now();

      if (event.code !== 1000) {
        // Not a normal closure
        const errorEvent: WebSocketErrorEvent = {
          timestamp: Date.now(),
          type: 'close_error',
          error: `WebSocket closed unexpectedly (code: ${event.code})`,
          details: {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            url,
          },
        };

        this.logError(errorEvent);

        // Attempt reconnection with exponential backoff
        this.attemptReconnect();
      } else {
        console.log('🔌 WebSocket closed normally');
      }
    });

    ws.addEventListener('message', () => {
      this.stats.currentState.messageCount++;
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    if (!this.wsUrl) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);

    this.reconnectTimeout = setTimeout(() => {
      this.stats.currentState.isConnecting = true;
      try {
        const ws = new WebSocket(this.wsUrl!);
        this.trackWebSocket(ws, this.wsUrl!);
      } catch (error) {
        this.logError({
          timestamp: Date.now(),
          type: 'connection_error',
          error: 'Failed to create WebSocket during reconnection',
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    }, delay);
  }

  /**
   * Log an error with rate limiting
   */
  private logError(error: WebSocketErrorEvent): void {
    // Rate limiting: Only log same error type once per 5 seconds
    const errorKey = `${error.type}:${error.error}`;
    const lastLogged = this.errorRateLimiter.get(errorKey);
    const now = Date.now();

    if (lastLogged && now - lastLogged < 5000) {
      // Skip duplicate errors within 5 seconds
      return;
    }

    this.errorRateLimiter.set(errorKey, now);

    // Add to error log
    this.errorLog.push(error);
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }

    // Update stats
    this.stats.totalErrors++;
    this.stats.currentState.errorCount++;
    this.stats.currentState.lastError = error;

    // Update error types count
    this.stats.errorTypes[error.type] = (this.stats.errorTypes[error.type] || 0) + 1;

    // Update recent errors (last 10)
    this.stats.recentErrors = this.errorLog.slice(-10);

    // Log with context
    console.group(`🔴 WebSocket Error [${error.type}]`);
    console.error('Error:', error.error);
    if (error.details) {
      console.error('Details:', error.details);
    }
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    console.log(`Total errors: ${this.stats.totalErrors}`);
    console.log(`Error rate: ${this.stats.errorRate.toFixed(2)} errors/min`);
    console.groupEnd();
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const elapsed = (Date.now() - this.stats.startTime) / 1000 / 60; // minutes
    this.stats.errorRate = elapsed > 0 ? this.stats.totalErrors / elapsed : 0;

    if (this.stats.currentState.isConnected && this.stats.currentState.lastConnectedAt) {
      const uptime = (Date.now() - this.stats.currentState.lastConnectedAt) / 1000;
      this.stats.connectionUptime = uptime;
    }
  }

  /**
   * Check connection health and log warnings
   */
  private checkConnectionHealth(): void {
    const state = this.stats.currentState;

    // Check for high error rate
    if (this.stats.errorRate > 10) {
      console.warn(`⚠️ High error rate detected: ${this.stats.errorRate.toFixed(2)} errors/min`);
    }

    // Check for connection issues
    if (!state.isConnected && !state.isConnecting && state.errorCount > 0) {
      const timeSinceLastError = state.lastError
        ? (Date.now() - state.lastError.timestamp) / 1000
        : Infinity;

      if (timeSinceLastError > 30) {
        // No errors in last 30 seconds, connection might be stable
        console.log('✅ WebSocket connection appears stable');
      }
    }

    // Check for message flow
    if (state.isConnected && state.messageCount === 0) {
      const timeSinceConnect = state.lastConnectedAt
        ? (Date.now() - state.lastConnectedAt) / 1000
        : 0;

      if (timeSinceConnect > 10) {
        console.warn('⚠️ WebSocket connected but no messages received in 10+ seconds');
      }
    }
  }

  /**
   * Get current statistics
   */
  getStats(): WebSocketLiveDebugStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get error log
   */
  getErrorLog(): WebSocketErrorEvent[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    this.stats.totalErrors = 0;
    this.stats.errorTypes = {};
    this.stats.recentErrors = [];
    this.stats.currentState.errorCount = 0;
    this.stats.currentState.lastError = null;
    console.log('🧹 Error log cleared');
  }

  /**
   * Print comprehensive report
   */
  printReport(): void {
    this.updateStats();
    const stats = this.getStats();

    console.group('📊 WebSocket LIVE Debug Report');
    console.log('═══════════════════════════════════════');
    console.log(`Monitoring Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);
    console.log(`Total Errors: ${stats.totalErrors}`);
    console.log(`Error Rate: ${stats.errorRate.toFixed(2)} errors/min`);
    console.log(`Connection Uptime: ${stats.connectionUptime.toFixed(1)}s`);
    console.log(`Average Latency: ${stats.averageLatency?.toFixed(2) || 'N/A'}ms`);
    console.log('\n📈 Error Types:');
    Object.entries(stats.errorTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('\n🔌 Connection State:');
    console.log(`  Connected: ${stats.currentState.isConnected}`);
    console.log(`  Connecting: ${stats.currentState.isConnecting}`);
    console.log(`  Ready State: ${stats.currentState.readyState}`);
    console.log(`  URL: ${stats.currentState.url || 'N/A'}`);
    console.log(`  Connection Attempts: ${stats.currentState.connectionAttempts}`);
    console.log(`  Messages Received: ${stats.currentState.messageCount}`);
    console.log(`  Reconnect Attempts: ${this.reconnectAttempts}`);
    if (stats.currentState.lastError) {
      console.log('\n❌ Last Error:');
      console.log(`  Type: ${stats.currentState.lastError.type}`);
      console.log(`  Message: ${stats.currentState.lastError.error}`);
      console.log(`  Time: ${new Date(stats.currentState.lastError.timestamp).toLocaleTimeString()}`);
    }
    console.log('\n📋 Recent Errors (last 10):');
    stats.recentErrors.forEach((error, index) => {
      console.log(`  ${index + 1}. [${error.type}] ${error.error}`);
    });
    console.log('═══════════════════════════════════════');
    console.groupEnd();
  }
}

// Singleton instance
let debuggerInstance: WebSocketLiveDebugger | null = null;

/**
 * Start WebSocket LIVE debugging
 */
export function startWebSocketLiveDebug(): () => void {
  if (!debuggerInstance) {
    debuggerInstance = new WebSocketLiveDebugger();
  }
  return debuggerInstance.start();
}

/**
 * Stop WebSocket LIVE debugging
 */
export function stopWebSocketLiveDebug(): void {
  if (debuggerInstance) {
    debuggerInstance.stop();
  }
}

/**
 * Get current WebSocket statistics
 */
export function getWebSocketStats(): WebSocketLiveDebugStats | null {
  if (!debuggerInstance) {
    console.warn('⚠️ WebSocket LIVE debugger is not running. Call startWebSocketLiveDebug() first.');
    return null;
  }
  return debuggerInstance.getStats();
}

/**
 * Get error log
 */
export function getWebSocketErrorLog(): WebSocketErrorEvent[] {
  if (!debuggerInstance) {
    return [];
  }
  return debuggerInstance.getErrorLog();
}

/**
 * Clear error log
 */
export function clearWebSocketErrorLog(): void {
  if (!debuggerInstance) {
    console.warn('⚠️ WebSocket LIVE debugger is not running.');
    return;
  }
  debuggerInstance.clearErrorLog();
}

/**
 * Print comprehensive report
 */
export function printWebSocketReport(): void {
  if (!debuggerInstance) {
    console.warn('⚠️ WebSocket LIVE debugger is not running. Call startWebSocketLiveDebug() first.');
    return;
  }
  debuggerInstance.printReport();
}

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    startWebSocketLiveDebug: typeof startWebSocketLiveDebug;
    stopWebSocketLiveDebug: typeof stopWebSocketLiveDebug;
    getWebSocketStats: typeof getWebSocketStats;
    getWebSocketErrorLog: typeof getWebSocketErrorLog;
    clearWebSocketErrorLog: typeof clearWebSocketErrorLog;
    printWebSocketReport: typeof printWebSocketReport;
  }).startWebSocketLiveDebug = startWebSocketLiveDebug;
  (window as unknown as { stopWebSocketLiveDebug: typeof stopWebSocketLiveDebug }).stopWebSocketLiveDebug = stopWebSocketLiveDebug;
  (window as unknown as { getWebSocketStats: typeof getWebSocketStats }).getWebSocketStats = getWebSocketStats;
  (window as unknown as { getWebSocketErrorLog: typeof getWebSocketErrorLog }).getWebSocketErrorLog = getWebSocketErrorLog;
  (window as unknown as { clearWebSocketErrorLog: typeof clearWebSocketErrorLog }).clearWebSocketErrorLog = clearWebSocketErrorLog;
  (window as unknown as { printWebSocketReport: typeof printWebSocketReport }).printWebSocketReport = printWebSocketReport;
}
