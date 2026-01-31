import { useState, useRef, useCallback, useEffect } from 'react';
import { diagnoseAudioWorkletConnection, logAudioWorkletDiagnostics } from '../utils/audioworklet-diagnostics';

// Expose diagnostics to window for debugging
if (typeof window !== 'undefined') {
  interface WindowWithAudioWorkletDebug extends Window {
    debugAudioWorklet?: () => Promise<unknown>;
  }
  const win = window as WindowWithAudioWorkletDebug;
  win.debugAudioWorklet = async () => {
    const diagnostics = await diagnoseAudioWorkletConnection();
    logAudioWorkletDiagnostics(diagnostics);
    return diagnostics;
  };
}
// Lazy load lamejs - only import when convertPCMToMP3 is actually called
// This prevents any module resolution issues during app initialization
const loadLamejs = async () => {
  try {
    // Use dynamic import with explicit path to avoid resolution issues
    const lameModule = await import('lamejs');
    // Handle both default export and named export
    const loaded = lameModule.default || lameModule;
    // Ensure Mp3Encoder is available
    if (!loaded || !loaded.Mp3Encoder) {
      console.error('lamejs.Mp3Encoder not found. Module structure:', Object.keys(lameModule));
      throw new Error('lamejs.Mp3Encoder not available');
    }
    return loaded;
  } catch (error) {
    console.error('Failed to load lamejs:', error);
    throw error; // Re-throw so caller knows encoding failed
  }
};

interface AudioRecorderState {
  isRecording: boolean;
  audioData: ArrayBuffer | null;
  error: string | null;
  speechActive: boolean;
  vadEnabled: boolean;
}

// Callback for real-time audio streaming
export type AudioChunkCallback = (audioData: ArrayBuffer, format: string, sampleRate: number) => void;

interface VADConfig {
  silenceThreshold?: number;
  silenceDuration?: number;
  minSpeechDuration?: number;
}

export const useAudioRecorder = (
  vadConfig?: VADConfig,
  onAudioChunk?: AudioChunkCallback // Real-time streaming callback
) => {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    audioData: null,
    error: null,
    speechActive: false,
    vadEnabled: true, // VAD is always enabled by default
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const isHandsFreeModeRef = useRef(false);

  // VAD Configuration
  const vadConfigRef = useRef<VADConfig>({
    silenceThreshold: vadConfig?.silenceThreshold ?? 0.01,
    silenceDuration: vadConfig?.silenceDuration ?? 1500,
    minSpeechDuration: vadConfig?.minSpeechDuration ?? 300,
  });

  const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to 16-bit signed integer (little-endian)
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    
    return buffer;
  };

  const resampleAudio = (
    audioData: Float32Array,
    fromSampleRate: number,
    toSampleRate: number
  ): Float32Array => {
    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
      const fraction = srcIndex - srcIndexFloor;
      
      // Linear interpolation
      result[i] = audioData[srcIndexFloor] * (1 - fraction) + audioData[srcIndexCeil] * fraction;
    }
    
    return result;
  };

  const convertToPCMS16LE = useCallback(async (audioData: Float32Array, sampleRate: number): Promise<ArrayBuffer> => {
    // Resample to 16kHz if necessary
    const targetSampleRate = 16000;
    const resampledData = sampleRate !== targetSampleRate
      ? resampleAudio(audioData, sampleRate, targetSampleRate)
      : audioData;
    
    // Convert to PCM S16LE
    return floatTo16BitPCM(resampledData);
  }, []);

  // Real-time streaming: process and send audio chunks immediately
  const processAndStreamChunk = useCallback(async (audioChunk: Float32Array, sampleRate: number) => {
    try {
      // Convert to PCM S16LE format (16kHz) for Cartesia STT
      const pcmData = await convertToPCMS16LE(audioChunk, sampleRate);
      
      // Stream chunk immediately via callback for optimal latency
      if (onAudioChunk) {
        onAudioChunk(pcmData, 'pcm_s16le', 16000);
      }
    } catch (error) {
      console.error('Failed to process audio chunk for streaming:', error);
    }
  }, [convertToPCMS16LE, onAudioChunk]);

  const convertPCMToMP3 = useCallback(async (pcmData: ArrayBuffer, sampleRate: number = 16000): Promise<ArrayBuffer> => {
    // Lazy load lamejs - only when this function is actually called
    let lame: { Mp3Encoder: new (channels: number, sampleRate: number, bitrate: number) => {
      encodeBuffer: (left: Int16Array) => Int8Array;
      flush: () => Int8Array;
    } };
    try {
      lame = await loadLamejs();
      if (!lame || !lame.Mp3Encoder) {
        throw new Error('lamejs.Mp3Encoder not available. MP3 encoding is required for Cartesia STT.');
      }
    } catch (error) {
      console.error('Failed to load or initialize lamejs:', error);
      throw new Error(`MP3 encoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Convert ArrayBuffer to Int16Array (PCM S16LE)
    const samples = new Int16Array(pcmData);
    
    // Create MP3 encoder: channels (1=mono), sampleRate (16000 Hz), bitrate (128 kbps)
    // Cartesia STT accepts MP3 files - no specific encoding requirements, but 16kHz mono is standard for speech
    const mp3encoder = new lame.Mp3Encoder(1, sampleRate, 128);
    const sampleBlockSize = 1152; // MP3 frame size (standard for MPEG-1 Layer 3)
    const mp3Data: Int8Array[] = [];
    
    // Encode in chunks
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    
    // Flush remaining data
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    // Combine all MP3 chunks into a single ArrayBuffer
    const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of mp3Data) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result.buffer;
  }, []);

  const handleAutoFinalize = useCallback(async () => {
    if (audioChunksRef.current.length === 0) return;

    try {
      // Combine all audio chunks
      const totalLength = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedAudio = new Float32Array(totalLength);
      let offset = 0;
      
      for (const chunk of audioChunksRef.current) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert to PCM S16LE (16kHz)
      const pcmData = await convertToPCMS16LE(combinedAudio, 48000);
      
      // Encode PCM to MP3 for Cartesia STT compatibility
      // Cartesia STT accepts MP3 files - standard format: mono, 16kHz, 128kbps
      let finalAudioData: ArrayBuffer;
      try {
        const mp3Data = await convertPCMToMP3(pcmData, 16000);
        console.log('Audio converted to MP3. PCM size:', pcmData.byteLength, 'bytes, MP3 size:', mp3Data.byteLength, 'bytes');
        finalAudioData = mp3Data;
      } catch (error) {
        console.error('MP3 encoding failed, using PCM as fallback:', error);
        // Fallback to PCM if MP3 encoding fails (Cartesia STT also accepts PCM via WAV)
        finalAudioData = pcmData;
      }
      
      setState((prev) => ({ 
        ...prev, 
        audioData: finalAudioData,
        isRecording: false,
        speechActive: false
      }));

      // Clear chunks
      audioChunksRef.current = [];
    } catch (error) {
      console.error('Failed to process audio:', error);
      setState((prev) => ({ 
        ...prev, 
        error: 'Failed to process audio', 
        isRecording: false 
      }));
    }
  }, [convertToPCMS16LE, convertPCMToMP3]);

  const setupAudioWorklet = useCallback(async (stream: MediaStream) => {
    try {
      // Run diagnostics first if in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Running AudioWorklet diagnostics...');
        const diagnostics = await diagnoseAudioWorkletConnection();
        logAudioWorkletDiagnostics(diagnostics);
        
        if (!diagnostics.success && diagnostics.error) {
          // Use diagnostic error if available
          throw new Error(diagnostics.error);
        }
      }

      // Check secure context (AudioWorklet requires HTTPS or localhost)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error("I can't access your microphone because this page isn't secure. Please use HTTPS or localhost to enable voice features.");
      }

      // Create AudioContext with 48kHz sample rate (matches AudioWorklet)
      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;
      
      // Resume AudioContext if suspended (required after user gesture)
      if (audioContext.state === 'suspended') {
        console.log('⏸️ AudioContext is suspended, resuming...');
        try {
          await audioContext.resume();
          console.log('✅ AudioContext resumed, state:', audioContext.state);
        } catch (resumeError) {
          console.error('❌ Failed to resume AudioContext:', resumeError);
          throw new Error("I couldn't activate the audio system. Please interact with the page first (click or tap).");
        }
      }

      // Check AudioWorklet support
      if (!('audioWorklet' in audioContext)) {
        throw new Error("Your browser doesn't support voice recording. Please update to Chrome, Firefox, Edge, or Safari (latest versions).");
      }

      const processorUrl = '/audio-capture-processor.js';
      
      // Verify the processor file exists and is accessible
      console.log('🔍 Checking AudioWorklet processor file:', processorUrl);
      let fileCheckPassed = false;
      try {
        const response = await fetch(processorUrl, { method: 'HEAD', cache: 'no-cache' });
        console.log('📡 File check response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url,
        });
        
        if (response.ok) {
          fileCheckPassed = true;
          console.log('✅ Processor file is accessible');
        } else {
          // Try GET request as fallback (some servers don't support HEAD)
          const getResponse = await fetch(processorUrl, { method: 'GET', cache: 'no-cache' });
          if (getResponse.ok) {
            fileCheckPassed = true;
            console.log('✅ Processor file is accessible (via GET)');
          } else {
            throw new Error(`File check failed: ${response.status} ${response.statusText}`);
          }
        }
      } catch (fetchError) {
        const fetchErrorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        console.error('❌ File check failed:', fetchErrorMsg);
        
        // Don't throw immediately - try to load anyway (might be CORS issue with HEAD/GET but AudioWorklet can still load)
        console.warn('⚠️ Continuing with AudioWorklet load despite file check failure...');
      }

      // Load AudioWorklet processor
      console.log('📦 Loading AudioWorklet module:', processorUrl);
      try {
        await audioContext.audioWorklet.addModule(processorUrl);
        console.log('✅ AudioWorklet module loaded successfully');
      } catch (addModuleError) {
        const errorMessage = addModuleError instanceof Error ? addModuleError.message : String(addModuleError);
        const errorStack = addModuleError instanceof Error ? addModuleError.stack : undefined;
        
        console.error('❌ AudioWorklet addModule failed:', {
          message: errorMessage,
          stack: errorStack,
          error: addModuleError,
        });
        
        // Provide specific error messages based on common issues (using conversational language per Heuristic #16)
        if (errorMessage.includes('404') || errorMessage.includes('Failed to fetch') || errorMessage.includes('not found')) {
          throw new Error("I couldn't find the audio processing file. The development server might not be running, or the file might be missing.");
        } else if (errorMessage.includes('CORS') || errorMessage.includes('Cross-Origin') || errorMessage.includes('Access-Control')) {
          throw new Error("There's a security restriction preventing audio access. The file needs to be served from the same origin.");
        } else if (errorMessage.includes('SyntaxError') || errorMessage.includes('Unexpected token') || errorMessage.includes('parse')) {
          throw new Error("There's an error in the audio processing code. Please check the console for details.");
        } else if (errorMessage.includes('NetworkError') || errorMessage.includes('network') || errorMessage.includes('ERR_')) {
          throw new Error("I couldn't connect to load the audio processor. Check your connection and make sure the server is running.");
        } else if (errorMessage.includes('TypeError') || errorMessage.includes('undefined')) {
          throw new Error("The audio processor couldn't be loaded. Try refreshing the page or check if your browser supports AudioWorklet.");
        } else {
          // Log the full error for debugging
          console.error('🔍 Full AudioWorklet error details:', {
            message: errorMessage,
            stack: errorStack,
            name: addModuleError instanceof Error ? addModuleError.name : 'Unknown',
          });
          throw new Error(`Something went wrong while setting up voice recording: ${errorMessage}. Try refreshing the page.`);
        }
      }

      // CRITICAL: Add small delay to ensure module is fully registered
      // This prevents "AudioWorklet does not have a valid AudioWorkletGlobalScope" errors
      // See: aUdiOwOrKLeT dOcS.md for details
      console.log('⏳ Waiting for module registration...');
      await new Promise(resolve => setTimeout(resolve, 100)); // Increased delay for better reliability
      console.log('✅ Module registration delay complete');

      // Create AudioWorklet node
      let audioWorkletNode: AudioWorkletNode;
      try {
        audioWorkletNode = new AudioWorkletNode(
          audioContext,
          'audio-capture-processor'
        );
      } catch (nodeError) {
        const errorMessage = nodeError instanceof Error ? nodeError.message : String(nodeError);
        
        if (errorMessage.includes('AudioWorkletGlobalScope') || errorMessage.includes('not have a valid')) {
          throw new Error("The audio processor didn't load correctly. Try refreshing the page - this usually fixes it.");
        } else if (errorMessage.includes('not found') || errorMessage.includes('Unknown')) {
          throw new Error("The audio processor module couldn't be found. Refreshing the page should help.");
        } else {
          throw new Error("I couldn't set up the audio processor. Try refreshing the page.");
        }
      }
      
      audioWorkletNodeRef.current = audioWorkletNode;

      // Configure VAD settings (always enabled)
      audioWorkletNode.port.postMessage({
        type: 'set-threshold',
        threshold: vadConfigRef.current.silenceThreshold,
      });
      audioWorkletNode.port.postMessage({
        type: 'set-duration',
        duration: vadConfigRef.current.silenceDuration,
      });
      audioWorkletNode.port.postMessage({ type: 'enable-vad' });

      // Setup error handler for processor errors (using conversational language per Heuristic #16)
      audioWorkletNode.onprocessorerror = (event) => {
        console.error('AudioWorklet processor error:', event);
        setState((prev) => ({ 
          ...prev, 
          error: "The audio processor encountered an error. Refreshing the page usually fixes this." 
        }));
      };

      // Handle messages from AudioWorklet
      audioWorkletNode.port.onmessage = (event) => {
        switch (event.data.type) {
          case 'speech-started':
            console.log('🗣️ VAD: Speech started at', event.data.timestamp);
            setState((prev) => ({ ...prev, speechActive: true }));
            break;

          case 'speech-ended':
            console.log('🤫 VAD: Speech ended - silence detected for', event.data.silenceDuration, 'ms');
            setState((prev) => ({ ...prev, speechActive: false }));
            
            // Auto-finalize when VAD detects silence (this is the purpose of VAD!)
            if (audioChunksRef.current.length > 0) {
              console.log('✅ VAD: Auto-finalizing speech after silence detection');
              // Use setTimeout to avoid calling handleAutoFinalize during render
              setTimeout(() => {
                handleAutoFinalize();
              }, 0);
            }
            break;

          case 'audio':
            // For real-time streaming: process and send chunks immediately
            // This enables true bidirectional flow with minimal latency
            if (onAudioChunk) {
              // Stream chunk immediately without accumulation for optimal latency
              processAndStreamChunk(event.data.audio, event.data.sampleRate || 48000)
                .catch((error) => {
                  console.error('Failed to stream audio chunk:', error);
                });
            }
            // Also accumulate for final processing (VAD auto-finalize)
            audioChunksRef.current.push(event.data.audio);
            break;

          case 'stats':
            console.log('VAD Stats:', event.data);
            break;
        }
      };

      // Connect audio graph
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(audioWorkletNode);

      return audioWorkletNode;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to setup AudioWorklet:', error);
      console.error('Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        secureContext: typeof window !== 'undefined' ? window.isSecureContext : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      });
      
      // Set user-friendly error message in state (using conversational language per Heuristic #16)
      // Don't blame the user, provide helpful guidance
      setState((prev) => ({
        ...prev,
        error: errorMessage || "I couldn't set up voice recording. Try refreshing the page, or check if your browser supports voice features.",
      }));
      
      throw error;
    }
  }, [handleAutoFinalize, processAndStreamChunk, onAudioChunk]);

  const checkMicrophonePermission = useCallback(async (): Promise<{ granted: boolean; error?: string }> => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          granted: false,
          error: 'Microphone access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.'
        };
      }

      // Check permission status (if available)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (permissionStatus.state === 'denied') {
            return {
              granted: false,
              error: 'Microphone permission is denied. Please enable it in your browser settings.'
            };
          }
        } catch {
          // Permission query API might not be supported, continue with getUserMedia attempt
        }
      }

      return { granted: true };
    } catch (error) {
      return {
        granted: false,
        error: error instanceof Error ? error.message : 'Failed to check microphone permission.'
      };
    }
  }, []);

  const startRecording = useCallback(async (handsFreeMode: boolean = false) => {
    try {
      isHandsFreeModeRef.current = handsFreeMode;
      audioChunksRef.current = [];
      
      // VAD is always enabled - it's the core feature
      // handsFreeMode just controls whether to auto-restart after sending

      // Check permissions first (optional, but helpful for better error messages)
      const permissionCheck = await checkMicrophonePermission();
      if (!permissionCheck.granted && permissionCheck.error) {
        throw new Error(permissionCheck.error);
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Setup AudioWorklet with VAD
      await setupAudioWorklet(stream);

      // Start capturing
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.port.postMessage({ type: 'start' });
      }

      setState({ 
        isRecording: true, 
        audioData: null, 
        error: null,
        speechActive: false,
        vadEnabled: state.vadEnabled
      });

      console.log('🎙️ Audio recording started with VAD');
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      // Handle specific error types with user-friendly messages
      let errorMessage = 'Failed to access microphone.';
      
      if (error instanceof Error) {
        const errorName = error.name;
        const errorMessage_lower = error.message.toLowerCase();
        
        // Permission denied errors
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || 
            errorMessage_lower.includes('permission denied') || 
            errorMessage_lower.includes('not allowed')) {
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings and try again.';
        }
        // No microphone found
        else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError' ||
                 errorMessage_lower.includes('not found') ||
                 errorMessage_lower.includes('no microphone')) {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        }
        // Microphone already in use
        else if (errorName === 'NotReadableError' || errorName === 'TrackStartError' ||
                 errorMessage_lower.includes('not readable') ||
                 errorMessage_lower.includes('already in use')) {
          errorMessage = 'Microphone is already in use by another application. Please close other apps using the microphone and try again.';
        }
        // Security/HTTPS errors
        else if (errorName === 'SecurityError' || 
                 errorMessage_lower.includes('secure context') ||
                 errorMessage_lower.includes('https required')) {
          errorMessage = 'Microphone access requires a secure connection (HTTPS). Please use HTTPS or localhost.';
        }
        // Generic error
        else {
          errorMessage = error.message || 'Failed to access microphone. Please check your browser settings.';
        }
      }
      
      setState({
        isRecording: false,
        audioData: null,
        error: errorMessage,
        speechActive: false,
        vadEnabled: state.vadEnabled
      });
    }
  }, [setupAudioWorklet, state.vadEnabled, checkMicrophonePermission]);

  const stopRecording = useCallback(async () => {
    if (audioWorkletNodeRef.current && state.isRecording) {
      // Stop capturing
      audioWorkletNodeRef.current.port.postMessage({ type: 'stop' });
      
      // Process accumulated audio
      if (audioChunksRef.current.length > 0) {
        await handleAutoFinalize();
      } else {
        setState((prev) => ({ ...prev, isRecording: false, speechActive: false }));
      }
    }

    // Stop all tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioWorkletNodeRef.current = null;
    isHandsFreeModeRef.current = false;
  }, [state.isRecording, handleAutoFinalize]);

  const clearAudioData = useCallback(() => {
    setState((prev) => ({ ...prev, audioData: null, error: null }));
    audioChunksRef.current = [];
  }, []);

  const updateVADConfig = useCallback((config: Partial<VADConfig>) => {
    vadConfigRef.current = { ...vadConfigRef.current, ...config };
    
    if (audioWorkletNodeRef.current) {
      if (config.silenceThreshold !== undefined) {
        audioWorkletNodeRef.current.port.postMessage({
          type: 'set-threshold',
          threshold: config.silenceThreshold,
        });
      }
      if (config.silenceDuration !== undefined) {
        audioWorkletNodeRef.current.port.postMessage({
          type: 'set-duration',
          duration: config.silenceDuration,
        });
      }
    }
  }, []);

  const toggleVAD = useCallback((enabled: boolean) => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.port.postMessage({
        type: enabled ? 'enable-vad' : 'disable-vad',
      });
    }
    setState((prev) => ({ ...prev, vadEnabled: enabled }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isRecording: state.isRecording,
    audioData: state.audioData,
    error: state.error,
    speechActive: state.speechActive,
    vadEnabled: state.vadEnabled,
    startRecording,
    stopRecording,
    clearAudioData,
    updateVADConfig,
    toggleVAD,
    checkMicrophonePermission,
  };
};
