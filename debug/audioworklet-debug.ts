/**
 * AudioWorklet Debug Tool
 * Live debugging for AudioWorklet issues in JARVIS
 * 
 * Based on aUdIoWoRkLeT dOcS.md requirements:
 * - Comprehensive research on all AudioWorklet issues
 * - LIVE testing and debugging
 * - 100% working fixes
 * 
 * Usage: Import and call debugAudioWorklet() in browser console
 */

import { testAudioWorkletSupport } from './utils';

export interface AudioWorkletDebugState {
  isSupported: boolean;
  isSecureContext: boolean;
  audioContext: AudioContext | null;
  workletNode: AudioWorkletNode | null;
  processorLoaded: boolean;
  sampleRate: number | null;
  error: string | null;
  processorErrors: string[];
}

export interface AudioWorkletDiagnostics {
  timestamp: number;
  state: AudioWorkletDebugState;
  checks: Array<{
    check: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: Record<string, unknown>;
  }>;
  recommendations: string[];
  canUseAudioWorklet: boolean;
}

/**
 * Test AudioWorklet module loading
 */
async function testAudioWorkletModule(moduleUrl: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const ctx = new AudioContext();
    
    if (!('audioWorklet' in ctx)) {
      ctx.close();
      return { success: false, error: 'AudioWorklet not supported' };
    }

    try {
      await ctx.audioWorklet.addModule(moduleUrl);
      
      // Add small delay to ensure module is fully registered
      await new Promise(resolve => setTimeout(resolve, 50));
      
      ctx.close();
      return { success: true };
    } catch (error) {
      ctx.close();
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Comprehensive AudioWorklet diagnostics
 */
export async function debugAudioWorklet(): Promise<AudioWorkletDiagnostics> {
  console.group('🔍 AudioWorklet Debug');
  console.log('Starting comprehensive AudioWorklet diagnostics...\n');

  const diagnostics: AudioWorkletDiagnostics = {
    timestamp: Date.now(),
    state: {
      isSupported: false,
      isSecureContext: false,
      audioContext: null,
      workletNode: null,
      processorLoaded: false,
      sampleRate: null,
      error: null,
      processorErrors: [],
    },
    checks: [],
    recommendations: [],
    canUseAudioWorklet: false,
  };

  // 1. Check secure context
  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
  diagnostics.state.isSecureContext = isSecureContext;
  
  diagnostics.checks.push({
    check: 'Secure Context',
    status: isSecureContext ? 'pass' : 'fail',
    message: isSecureContext 
      ? 'Running in secure context (HTTPS/localhost)' 
      : 'Not in secure context - AudioWorklet requires HTTPS or localhost',
  });

  if (!isSecureContext) {
    diagnostics.recommendations.push('Use HTTPS or localhost for AudioWorklet support');
    diagnostics.recommendations.push('AudioWorklet will not work on HTTP (except localhost)');
  }

  // 2. Check AudioWorklet support
  console.log('🎵 Checking AudioWorklet support...');
  const supportTest = testAudioWorkletSupport();
  diagnostics.state.isSupported = supportTest.supported;
  
  diagnostics.checks.push({
    check: 'AudioWorklet API',
    status: supportTest.supported ? 'pass' : 'fail',
    message: supportTest.supported 
      ? 'AudioWorklet API is available' 
      : `AudioWorklet not supported: ${supportTest.error || 'Unknown error'}`,
    details: supportTest.error ? { error: supportTest.error } : undefined,
  });

  if (!supportTest.supported) {
    diagnostics.recommendations.push('Upgrade browser to support AudioWorklet');
    diagnostics.recommendations.push('Chrome 66+, Firefox 76+, Safari 14.5+ required');
    console.groupEnd();
    return diagnostics;
  }

  // 3. Test AudioContext creation
  console.log('🔊 Testing AudioContext...');
  try {
    const ctx = new AudioContext({ sampleRate: 48000 });
    diagnostics.state.audioContext = ctx;
    diagnostics.state.sampleRate = ctx.sampleRate;
    
    diagnostics.checks.push({
      check: 'AudioContext',
      status: 'pass',
      message: `AudioContext created successfully (${ctx.sampleRate}Hz)`,
      details: {
        sampleRate: ctx.sampleRate,
        state: ctx.state,
        baseLatency: ctx.baseLatency,
      },
    });

    // Resume if suspended
    if (ctx.state === 'suspended') {
      await ctx.resume();
      diagnostics.checks.push({
        check: 'AudioContext State',
        status: 'pass',
        message: 'AudioContext resumed from suspended state',
      });
    }
  } catch (error) {
    diagnostics.state.error = error instanceof Error ? error.message : String(error);
    diagnostics.checks.push({
      check: 'AudioContext',
      status: 'fail',
      message: 'Failed to create AudioContext',
      details: { error: diagnostics.state.error },
    });
    diagnostics.recommendations.push('Check browser audio support');
  }

  // 4. Test AudioWorklet module loading (if processor file exists)
  if (diagnostics.state.audioContext && diagnostics.state.isSupported) {
    console.log('📦 Testing AudioWorklet module loading...');
    
    // Try to find audio-capture-processor.js
    const processorUrl = '/audio-capture-processor.js';
    
    try {
      // First check if file exists
      const response = await fetch(processorUrl, { method: 'HEAD' });
      if (response.ok) {
        const moduleTest = await testAudioWorkletModule(processorUrl);
        
        diagnostics.checks.push({
          check: 'AudioWorklet Module',
          status: moduleTest.success ? 'pass' : 'fail',
          message: moduleTest.success 
            ? `Module loaded successfully: ${processorUrl}` 
            : `Failed to load module: ${moduleTest.error || 'Unknown error'}`,
          details: moduleTest.error ? { error: moduleTest.error } : undefined,
        });

        if (moduleTest.success) {
          diagnostics.state.processorLoaded = true;
        } else {
          diagnostics.recommendations.push('Check AudioWorklet processor file exists and is accessible');
          diagnostics.recommendations.push('Verify file path is correct');
          diagnostics.recommendations.push('Check CORS settings if loading from different origin');
        }
      } else {
        diagnostics.checks.push({
          check: 'AudioWorklet Module',
          status: 'warning',
          message: `Processor file not found: ${processorUrl}`,
        });
        diagnostics.recommendations.push('Create AudioWorklet processor file');
      }
    } catch (error) {
      diagnostics.checks.push({
        check: 'AudioWorklet Module',
        status: 'warning',
        message: 'Could not check processor file',
        details: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  // 5. Check Cross-Origin Isolation (for SharedArrayBuffer)
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isCrossOriginIsolated = typeof window !== 'undefined' && 
    (window as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
  
  diagnostics.checks.push({
    check: 'SharedArrayBuffer Support',
    status: hasSharedArrayBuffer && isCrossOriginIsolated ? 'pass' : 'warning',
    message: hasSharedArrayBuffer && isCrossOriginIsolated
      ? 'SharedArrayBuffer available (Cross-Origin Isolated)'
      : 'SharedArrayBuffer not available (not required for basic AudioWorklet)',
    details: {
      hasSharedArrayBuffer,
      isCrossOriginIsolated,
    },
  });

  if (!isCrossOriginIsolated && hasSharedArrayBuffer) {
    diagnostics.recommendations.push('Add Cross-Origin headers for SharedArrayBuffer support');
    diagnostics.recommendations.push('COOP: same-origin, COEP: require-corp');
  }

  // 6. Browser compatibility check
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isEdge = /Edge/.test(userAgent);
  
  diagnostics.checks.push({
    check: 'Browser Compatibility',
    status: (isChrome || isFirefox || isSafari || isEdge) ? 'pass' : 'warning',
    message: `Browser detected: ${isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : isEdge ? 'Edge' : 'Unknown'}`,
    details: { userAgent },
  });

  // Summary
  const passed = diagnostics.checks.filter(c => c.status === 'pass').length;
  const failed = diagnostics.checks.filter(c => c.status === 'fail').length;
  const warnings = diagnostics.checks.filter(c => c.status === 'warning').length;

  diagnostics.canUseAudioWorklet = 
    isSecureContext &&
    supportTest.supported &&
    diagnostics.state.audioContext !== null;

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  
  if (diagnostics.canUseAudioWorklet) {
    console.log('✅ AudioWorklet is ready');
  } else {
    console.log('❌ AudioWorklet has issues');
    if (diagnostics.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      diagnostics.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  }

  // Cleanup
  if (diagnostics.state.audioContext) {
    await diagnostics.state.audioContext.close();
  }

  console.groupEnd();
  return diagnostics;
}

/**
 * Monitor AudioWorklet in real-time
 */
export function monitorAudioWorklet(
  onStateChange?: (state: AudioWorkletDebugState) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let intervalId: number | null = null;
  let lastState: AudioWorkletDebugState | null = null;

  const checkState = async () => {
    const diagnostics = await debugAudioWorklet();
    const state = diagnostics.state;

    if (lastState && JSON.stringify(lastState) !== JSON.stringify(state)) {
      console.log('🔄 AudioWorklet state changed:', state);
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
