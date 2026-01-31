/**
 * Audio Recording Debug Tool
 * Live debugging for audio recording issues in JARVIS
 * 
 * Based on zEn DeBuGgEr.md and aUdIoWoRkLeT dOcS.md requirements:
 * - Comprehensive research on all audio recording issues
 * - LIVE testing and debugging
 * - 100% working fixes
 * 
 * Usage: Import and call debugAudioRecording() in browser console
 */

import { checkMicrophonePermission, testAudioContext, testAudioWorkletSupport } from './utils';

export interface AudioRecordingDebugState {
  hasPermission: boolean | null;
  isRecording: boolean;
  audioContext: AudioContext | null;
  mediaStream: MediaStream | null;
  audioWorkletNode: AudioWorkletNode | null;
  sampleRate: number | null;
  channelCount: number | null;
  error: string | null;
  audioChunks: number;
  vadEnabled: boolean;
  speechActive: boolean;
}

export interface AudioRecordingDiagnostics {
  timestamp: number;
  state: AudioRecordingDebugState;
  checks: Array<{
    check: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: Record<string, unknown>;
  }>;
  recommendations: string[];
  canRecord: boolean;
}


/**
 * Comprehensive audio recording diagnostics
 */
export async function debugAudioRecording(): Promise<AudioRecordingDiagnostics> {
  console.group('🔍 Audio Recording Debug');
  console.log('Starting comprehensive audio recording diagnostics...\n');

  const diagnostics: AudioRecordingDiagnostics = {
    timestamp: Date.now(),
    state: {
      hasPermission: null,
      isRecording: false,
      audioContext: null,
      mediaStream: null,
      audioWorkletNode: null,
      sampleRate: null,
      channelCount: null,
      error: null,
      audioChunks: 0,
      vadEnabled: false,
      speechActive: false,
    },
    checks: [],
    recommendations: [],
    canRecord: false,
  };

  // 1. Check browser support
  const hasMediaDevices = typeof navigator !== 'undefined' && navigator.mediaDevices !== undefined;
  diagnostics.checks.push({
    check: 'MediaDevices API',
    status: hasMediaDevices ? 'pass' : 'fail',
    message: hasMediaDevices ? 'MediaDevices API available' : 'MediaDevices API not available',
  });

  if (!hasMediaDevices) {
    diagnostics.recommendations.push('Upgrade browser to support MediaDevices API');
    console.groupEnd();
    return diagnostics;
  }

  // 2. Check microphone permission
  console.log('🎤 Checking microphone permission...');
  const hasPermission = await checkMicrophonePermission();
  diagnostics.state.hasPermission = hasPermission;
  
  diagnostics.checks.push({
    check: 'Microphone Permission',
    status: hasPermission === true ? 'pass' : hasPermission === false ? 'fail' : 'warning',
    message: hasPermission === true 
      ? 'Microphone permission granted' 
      : hasPermission === false 
      ? 'Microphone permission denied' 
      : 'Could not determine permission status',
  });

  if (hasPermission === false) {
    diagnostics.recommendations.push('Grant microphone permission in browser settings');
    diagnostics.recommendations.push('Click the lock icon in address bar and allow microphone access');
  }

  // 3. Test AudioContext
  console.log('🔊 Testing AudioContext...');
  const audioContextTest = testAudioContext();
  if (audioContextTest.success && audioContextTest.sampleRate) {
    diagnostics.state.sampleRate = audioContextTest.sampleRate;
    diagnostics.checks.push({
      check: 'AudioContext',
      status: 'pass',
      message: `AudioContext created successfully (${audioContextTest.sampleRate}Hz)`,
      details: { sampleRate: audioContextTest.sampleRate },
    });
  } else {
    diagnostics.checks.push({
      check: 'AudioContext',
      status: 'fail',
      message: 'Failed to create AudioContext',
      details: { error: audioContextTest.error },
    });
    diagnostics.recommendations.push('Check browser audio support');
  }

  // 4. Test AudioWorklet support
  console.log('🎵 Testing AudioWorklet support...');
  const workletSupport = testAudioWorkletSupport();
  diagnostics.checks.push({
    check: 'AudioWorklet Support',
    status: workletSupport.supported ? 'pass' : 'fail',
    message: workletSupport.supported 
      ? 'AudioWorklet is supported' 
      : `AudioWorklet not supported: ${workletSupport.error || 'Unknown error'}`,
    details: workletSupport.error ? { error: workletSupport.error } : undefined,
  });

  if (!workletSupport.supported) {
    diagnostics.recommendations.push('AudioWorklet requires HTTPS or localhost');
    diagnostics.recommendations.push('Check browser compatibility (Chrome 66+, Firefox 76+, Safari 14.5+)');
  }

  // 5. Test actual microphone access
  if (hasPermission === true) {
    console.log('🎙️ Testing microphone access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // STT requires 16kHz
        },
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        const settings = track.getSettings();
        
        diagnostics.state.mediaStream = stream;
        diagnostics.state.channelCount = settings.channelCount || 1;
        
        diagnostics.checks.push({
          check: 'Microphone Access',
          status: 'pass',
          message: 'Successfully accessed microphone',
          details: {
            deviceId: settings.deviceId,
            channelCount: settings.channelCount,
            sampleRate: settings.sampleRate,
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl,
          },
        });

        // Clean up
        stream.getTracks().forEach(track => track.stop());
      } else {
        diagnostics.checks.push({
          check: 'Microphone Access',
          status: 'fail',
          message: 'No audio tracks available',
        });
      }
    } catch (error) {
      diagnostics.state.error = error instanceof Error ? error.message : String(error);
      diagnostics.checks.push({
        check: 'Microphone Access',
        status: 'fail',
        message: 'Failed to access microphone',
        details: { error: diagnostics.state.error },
      });
      diagnostics.recommendations.push('Check microphone is connected and working');
      diagnostics.recommendations.push('Try a different microphone');
    }
  }

  // 6. Check secure context (required for AudioWorklet)
  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
  diagnostics.checks.push({
    check: 'Secure Context',
    status: isSecureContext ? 'pass' : 'warning',
    message: isSecureContext 
      ? 'Running in secure context (HTTPS/localhost)' 
      : 'Not in secure context - AudioWorklet may not work',
  });

  if (!isSecureContext) {
    diagnostics.recommendations.push('Use HTTPS or localhost for AudioWorklet support');
  }

  // 7. Check if useAudioRecorder hook is available
  try {
    // Check if the hook might be in use
    const reactRoot = document.getElementById('root');
    if (reactRoot) {
      diagnostics.checks.push({
        check: 'React App',
        status: 'pass',
        message: 'React app is loaded',
      });
    }
  } catch (error) {
    // Ignore
  }

  // Summary
  const passed = diagnostics.checks.filter(c => c.status === 'pass').length;
  const failed = diagnostics.checks.filter(c => c.status === 'fail').length;
  const warnings = diagnostics.checks.filter(c => c.status === 'warning').length;

  diagnostics.canRecord = 
    hasPermission === true && 
    audioContextTest.success && 
    workletSupport.supported &&
    diagnostics.state.mediaStream !== null;

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  
  if (diagnostics.canRecord) {
    console.log('✅ Audio recording is ready');
  } else {
    console.log('❌ Audio recording has issues');
    if (diagnostics.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      diagnostics.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  }

  console.groupEnd();
  return diagnostics;
}

/**
 * Monitor audio recording in real-time
 */
export function monitorAudioRecording(
  onStateChange?: (state: AudioRecordingDebugState) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let intervalId: number | null = null;
  let lastState: AudioRecordingDebugState | null = null;

  const checkState = async () => {
    const diagnostics = await debugAudioRecording();
    const state = diagnostics.state;

    if (lastState && JSON.stringify(lastState) !== JSON.stringify(state)) {
      console.log('🔄 Audio recording state changed:', state);
      onStateChange?.(state);
    }

    lastState = state;
  };

  // Check every 3 seconds
  intervalId = window.setInterval(checkState, 3000);
  checkState(); // Initial check

  // Return cleanup function
  return () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  };
}

/**
 * Test audio recording with actual capture
 */
export async function testAudioRecording(durationMs: number = 1000): Promise<{
  success: boolean;
  audioData: ArrayBuffer | null;
  error?: string;
}> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    const chunks: Float32Array[] = [];

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(inputData));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    await new Promise(resolve => setTimeout(resolve, durationMs));

    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach(track => track.stop());
    audioContext.close();

    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return {
      success: true,
      audioData: combined.buffer,
    };
  } catch (error) {
    return {
      success: false,
      audioData: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
