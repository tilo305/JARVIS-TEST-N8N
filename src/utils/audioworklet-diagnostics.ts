/**
 * AudioWorklet Connection Diagnostics
 * Helps debug AudioWorklet connection errors
 */

export interface AudioWorkletDiagnosticResult {
  success: boolean;
  error?: string;
  details: {
    secureContext: boolean;
    audioWorkletSupported: boolean;
    audioContextState: string;
    fileAccessible: boolean;
    fileUrl?: string;
    errorMessage?: string;
  };
}

/**
 * Comprehensive diagnostic for AudioWorklet connection issues
 */
export async function diagnoseAudioWorkletConnection(): Promise<AudioWorkletDiagnosticResult> {
  const result: AudioWorkletDiagnosticResult = {
    success: false,
    details: {
      secureContext: false,
      audioWorkletSupported: false,
      audioContextState: 'unknown',
      fileAccessible: false,
    },
  };

  try {
    // 1. Check secure context
    result.details.secureContext = typeof window !== 'undefined' && window.isSecureContext;
    if (!result.details.secureContext) {
      result.error = 'Not in secure context (HTTPS or localhost required)';
      return result;
    }

    // 2. Check AudioWorklet support
    const testContext = new AudioContext();
    result.details.audioWorkletSupported = 'audioWorklet' in testContext;
    result.details.audioContextState = testContext.state;

    if (!result.details.audioWorkletSupported) {
      result.error = 'AudioWorklet not supported in this browser';
      testContext.close();
      return result;
    }

    // 3. Check if file is accessible
    const possiblePaths = [
      '/audio-capture-processor.js',
      './audio-capture-processor.js',
      '/public/audio-capture-processor.js',
    ];

    let accessiblePath: string | null = null;
    for (const path of possiblePaths) {
      try {
        const response = await fetch(path, { method: 'HEAD', cache: 'no-cache' });
        if (response.ok) {
          accessiblePath = path;
          result.details.fileAccessible = true;
          result.details.fileUrl = path;
          break;
        }
      } catch (e) {
        // Try next path
        continue;
      }
    }

    if (!accessiblePath) {
      // Try GET as fallback
      for (const path of possiblePaths) {
        try {
          const response = await fetch(path, { method: 'GET', cache: 'no-cache' });
          if (response.ok) {
            accessiblePath = path;
            result.details.fileAccessible = true;
            result.details.fileUrl = path;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    if (!accessiblePath) {
      result.error = 'AudioWorklet processor file not accessible at any expected path';
      testContext.close();
      return result;
    }

    // 4. Try to actually load the module
    try {
      await testContext.audioWorklet.addModule(accessiblePath);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      result.success = true;
      testContext.close();
      return result;
    } catch (loadError) {
      const errorMsg = loadError instanceof Error ? loadError.message : String(loadError);
      result.error = `Failed to load AudioWorklet module: ${errorMsg}`;
      result.details.errorMessage = errorMsg;
      testContext.close();
      return result;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Log diagnostic results to console
 */
export function logAudioWorkletDiagnostics(result: AudioWorkletDiagnosticResult) {
  console.group('🔍 AudioWorklet Connection Diagnostics');
  console.log('Secure Context:', result.details.secureContext ? '✅' : '❌');
  console.log('AudioWorklet Supported:', result.details.audioWorkletSupported ? '✅' : '❌');
  console.log('AudioContext State:', result.details.audioContextState);
  console.log('File Accessible:', result.details.fileAccessible ? '✅' : '❌');
  if (result.details.fileUrl) {
    console.log('File URL:', result.details.fileUrl);
  }
  if (result.error) {
    console.error('Error:', result.error);
    if (result.details.errorMessage) {
      console.error('Error Details:', result.details.errorMessage);
    }
  }
  console.log('Overall Status:', result.success ? '✅ Success' : '❌ Failed');
  console.groupEnd();
}
