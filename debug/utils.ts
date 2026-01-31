/**
 * Shared utility functions for debug tools
 * Consolidates duplicate helper functions across debug tools
 */

/**
 * Get Cartesia API key from environment
 */
export async function getCartesiaApiKey(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const metaEnv = typeof import.meta !== "undefined" && 'env' in import.meta
      ? (import.meta as { env?: Record<string, unknown> }).env
      : undefined;
    
    return metaEnv?.VITE_CARTESIA_API_KEY as string | undefined || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get WebSocket proxy URL from environment
 */
export async function getWebSocketUrl(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const metaEnv = typeof import.meta !== "undefined" && 'env' in import.meta
      ? (import.meta as { env?: Record<string, unknown> }).env
      : undefined;
    
    const wsUrl = metaEnv?.VITE_WEBSOCKET_PROXY_URL as string | undefined;
    
    if (wsUrl) {
      return wsUrl;
    }

    // Default to localhost proxy
    return 'ws://localhost:3001';
  } catch (error) {
    console.error('Failed to get WebSocket URL:', error);
    return null;
  }
}

/**
 * Test AudioWorklet support
 * Synchronous version for quick checks
 */
export function testAudioWorkletSupport(): { supported: boolean; error?: string } {
  try {
    const ctx = new AudioContext();
    
    if (!('audioWorklet' in ctx)) {
      ctx.close();
      return { supported: false, error: 'AudioWorklet not supported in this browser' };
    }

    ctx.close();
    return { supported: true };
  } catch (error) {
    return {
      supported: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test AudioContext creation
 */
export function testAudioContext(): { success: boolean; error?: string; sampleRate?: number } {
  try {
    const ctx = new AudioContext();
    const sampleRate = ctx.sampleRate;
    ctx.close();
    return { success: true, sampleRate };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check microphone permission
 */
export async function checkMicrophonePermission(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return false;
      }
    }
    return null;
  }
}
