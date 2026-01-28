import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  audioData: ArrayBuffer | null;
  error: string | null;
  speechActive: boolean;
  vadEnabled: boolean;
}

interface VADConfig {
  silenceThreshold?: number;
  silenceDuration?: number;
  minSpeechDuration?: number;
}

export const useAudioRecorder = (vadConfig?: VADConfig) => {
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

  const convertToPCMS16LE = async (audioData: Float32Array, sampleRate: number): Promise<ArrayBuffer> => {
    // Resample to 16kHz if necessary
    const targetSampleRate = 16000;
    const resampledData = sampleRate !== targetSampleRate
      ? resampleAudio(audioData, sampleRate, targetSampleRate)
      : audioData;
    
    // Convert to PCM S16LE
    return floatTo16BitPCM(resampledData);
  };

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
      
      console.log('Audio converted to PCM. Size:', pcmData.byteLength, 'bytes');
      
      setState((prev) => ({ 
        ...prev, 
        audioData: pcmData, 
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
  }, []);

  const setupAudioWorklet = useCallback(async (stream: MediaStream) => {
    try {
      // Create AudioContext with 48kHz sample rate (matches AudioWorklet)
      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      // Load AudioWorklet processor
      await audioContext.audioWorklet.addModule('/audio-capture-processor.js');

      // Create AudioWorklet node
      const audioWorkletNode = new AudioWorkletNode(
        audioContext,
        'audio-capture-processor'
      );
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
            // Accumulate audio chunks
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
      console.error('Failed to setup AudioWorklet:', error);
      throw error;
    }
  }, [handleAutoFinalize]);

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
