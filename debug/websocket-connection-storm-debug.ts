/**
 * WebSocket Connection Storm Debug Tool
 * Diagnoses and fixes rapid connect/disconnect loops
 * 
 * Based on zEn DeBuGgEr.md requirements:
 * - Comprehensive research on connection storm issues
 * - LIVE testing and debugging
 * - 100% working fixes
 * 
 * Usage: Import and call debugWebSocketConnectionStorm() in browser console
 */

export interface ConnectionStormDiagnostics {
  timestamp: number;
  isStormDetected: boolean;
  connectionAttempts: number;
  connectionAttemptsInLast10s: number;
  averageTimeBetweenAttempts: number;
  lastConnectionTime: number | null;
  lastDisconnectTime: number | null;
  disconnectReasons: Array<{ code: number; reason: string; timestamp: number }>;
  recommendations: string[];
}

class WebSocketConnectionStormDebugger {
  private connectionLog: Array<{ type: 'connect' | 'disconnect'; timestamp: number; code?: number; reason?: string }> = [];
  private maxLogSize = 100;
  private monitoringInterval: number | null = null;
  private isMonitoring = false;
  private originalWebSocket: typeof WebSocket;

  constructor() {
    this.originalWebSocket = window.WebSocket;
  }

  /**
   * Start monitoring WebSocket connections
   */
  start(): () => void {
    if (this.isMonitoring) {
      console.warn('⚠️ Connection storm debugger is already running');
      return this.stop.bind(this);
    }

    console.log('🔍 Starting WebSocket Connection Storm Debugger...');
    this.isMonitoring = true;

    // Hook into WebSocket constructor
    this.hookWebSocket();

    // Monitor every 2 seconds
    this.monitoringInterval = window.setInterval(() => {
      this.checkForStorm();
    }, 2000);

    console.log('✅ Connection Storm Debugger started');
    console.log('📊 Use diagnoseConnectionStorm() to see diagnostics');

    return this.stop.bind(this);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping Connection Storm Debugger...');
    this.isMonitoring = false;

    // Restore original WebSocket
    window.WebSocket = this.originalWebSocket;

    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('✅ Connection Storm Debugger stopped');
  }

  /**
   * Hook into WebSocket constructor to track all connections
   */
  private hookWebSocket(): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const debuggerInstance = this;
    
    window.WebSocket = class extends this.originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        debuggerInstance.logConnection('connect', this);
      }
    } as typeof WebSocket;

    // Copy static properties
    Object.setPrototypeOf(window.WebSocket, this.originalWebSocket);
    Object.setPrototypeOf(window.WebSocket.prototype, this.originalWebSocket.prototype);
  }

  /**
   * Log a connection event
   */
  private logConnection(type: 'connect' | 'disconnect', ws: WebSocket, code?: number, reason?: string): void {
    this.connectionLog.push({
      type,
      timestamp: Date.now(),
      code,
      reason,
    });

    if (this.connectionLog.length > this.maxLogSize) {
      this.connectionLog.shift();
    }

    if (type === 'connect') {
      // Track disconnect when connection closes
      ws.addEventListener('close', (event) => {
        this.logConnection('disconnect', ws, event.code, event.reason);
      }, { once: true });
    }
  }

  /**
   * Check for connection storm
   */
  private checkForStorm(): void {
    const now = Date.now();
    const recentConnections = this.connectionLog.filter(
      entry => entry.type === 'connect' && now - entry.timestamp < 10000
    );

    if (recentConnections.length >= 5) {
      console.warn(`⚠️ Connection storm detected: ${recentConnections.length} connections in last 10 seconds`);
      console.log('💡 Run diagnoseConnectionStorm() for detailed analysis');
    }
  }

  /**
   * Diagnose connection storm issues
   */
  diagnose(): ConnectionStormDiagnostics {
    const now = Date.now();
    const last10s = now - 10000;
    
    const recentConnections = this.connectionLog.filter(
      entry => entry.type === 'connect' && entry.timestamp > last10s
    );
    
    const recentDisconnects = this.connectionLog.filter(
      entry => entry.type === 'disconnect' && entry.timestamp > last10s
    );

    const disconnectReasons = recentDisconnects
      .map(entry => ({
        code: entry.code || 0,
        reason: entry.reason || 'unknown',
        timestamp: entry.timestamp,
      }))
      .slice(-10); // Last 10 disconnects

    // Calculate average time between attempts
    let averageTimeBetween = 0;
    if (recentConnections.length > 1) {
      const times = [];
      for (let i = 1; i < recentConnections.length; i++) {
        times.push(recentConnections[i].timestamp - recentConnections[i - 1].timestamp);
      }
      averageTimeBetween = times.reduce((a, b) => a + b, 0) / times.length;
    }

    const isStormDetected = recentConnections.length >= 5;
    
    const recommendations: string[] = [];
    if (isStormDetected) {
      recommendations.push('Connection storm detected - too many rapid connections');
      recommendations.push('Check useEffect dependencies in ChatContainer.tsx');
      recommendations.push('Verify disconnect() is not being called unnecessarily');
      recommendations.push('Check if WebSocket is being closed immediately after opening');
    }

    // Analyze disconnect reasons
    const normalClosures = disconnectReasons.filter(r => r.code === 1000).length;
    const abnormalClosures = disconnectReasons.filter(r => r.code !== 1000 && r.code !== 0).length;

    if (normalClosures > abnormalClosures && isStormDetected) {
      recommendations.push('Most closures are normal (code 1000) - likely useEffect cleanup loop');
      recommendations.push('Fix: Use refs for connect/disconnect functions in useEffect dependencies');
    }

    if (abnormalClosures > 0) {
      recommendations.push(`Found ${abnormalClosures} abnormal closures - check server logs`);
    }

    return {
      timestamp: now,
      isStormDetected,
      connectionAttempts: this.connectionLog.filter(e => e.type === 'connect').length,
      connectionAttemptsInLast10s: recentConnections.length,
      averageTimeBetweenAttempts: averageTimeBetween,
      lastConnectionTime: recentConnections[recentConnections.length - 1]?.timestamp || null,
      lastDisconnectTime: recentDisconnects[recentDisconnects.length - 1]?.timestamp || null,
      disconnectReasons,
      recommendations,
    };
  }

  /**
   * Get connection log
   */
  getLog(): typeof this.connectionLog {
    return [...this.connectionLog];
  }

  /**
   * Clear log
   */
  clearLog(): void {
    this.connectionLog = [];
    console.log('🧹 Connection log cleared');
  }
}

// Singleton instance
let debuggerInstance: WebSocketConnectionStormDebugger | null = null;

/**
 * Start connection storm debugging
 */
export function startConnectionStormDebug(): () => void {
  if (!debuggerInstance) {
    debuggerInstance = new WebSocketConnectionStormDebugger();
  }
  return debuggerInstance.start();
}

/**
 * Stop connection storm debugging
 */
export function stopConnectionStormDebug(): void {
  if (debuggerInstance) {
    debuggerInstance.stop();
  }
}

/**
 * Diagnose connection storm
 */
export function diagnoseConnectionStorm(): ConnectionStormDiagnostics {
  if (!debuggerInstance) {
    console.warn('⚠️ Connection storm debugger is not running. Call startConnectionStormDebug() first.');
    return {
      timestamp: Date.now(),
      isStormDetected: false,
      connectionAttempts: 0,
      connectionAttemptsInLast10s: 0,
      averageTimeBetweenAttempts: 0,
      lastConnectionTime: null,
      lastDisconnectTime: null,
      disconnectReasons: [],
      recommendations: ['Start the debugger first: startConnectionStormDebug()'],
    };
  }
  return debuggerInstance.diagnose();
}

/**
 * Print comprehensive report
 */
export function printConnectionStormReport(): void {
  if (!debuggerInstance) {
    console.warn('⚠️ Connection storm debugger is not running. Call startConnectionStormDebug() first.');
    return;
  }

  const diagnostics = debuggerInstance.diagnose();

  console.group('📊 WebSocket Connection Storm Diagnostics');
  console.log('═══════════════════════════════════════');
  console.log(`Storm Detected: ${diagnostics.isStormDetected ? '❌ YES' : '✅ NO'}`);
  console.log(`Total Connection Attempts: ${diagnostics.connectionAttempts}`);
  console.log(`Attempts in Last 10s: ${diagnostics.connectionAttemptsInLast10s}`);
  console.log(`Average Time Between Attempts: ${diagnostics.averageTimeBetweenAttempts.toFixed(0)}ms`);
  
  if (diagnostics.lastConnectionTime) {
    console.log(`Last Connection: ${new Date(diagnostics.lastConnectionTime).toLocaleTimeString()}`);
  }
  if (diagnostics.lastDisconnectTime) {
    console.log(`Last Disconnect: ${new Date(diagnostics.lastDisconnectTime).toLocaleTimeString()}`);
  }

  if (diagnostics.disconnectReasons.length > 0) {
    console.log('\n📋 Recent Disconnect Reasons:');
    diagnostics.disconnectReasons.forEach((reason, index) => {
      const codeName = reason.code === 1000 ? 'Normal' : `Abnormal (${reason.code})`;
      console.log(`  ${index + 1}. ${codeName}: ${reason.reason} at ${new Date(reason.timestamp).toLocaleTimeString()}`);
    });
  }

  if (diagnostics.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    diagnostics.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  console.log('═══════════════════════════════════════');
  console.groupEnd();
}

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  interface WindowWithConnectionStormDebug extends Window {
    startConnectionStormDebug?: typeof startConnectionStormDebug;
    stopConnectionStormDebug?: typeof stopConnectionStormDebug;
    diagnoseConnectionStorm?: typeof diagnoseConnectionStorm;
    printConnectionStormReport?: typeof printConnectionStormReport;
  }
  const win = window as WindowWithConnectionStormDebug;
  win.startConnectionStormDebug = startConnectionStormDebug;
  win.stopConnectionStormDebug = stopConnectionStormDebug;
  win.diagnoseConnectionStorm = diagnoseConnectionStorm;
  win.printConnectionStormReport = printConnectionStormReport;
}
