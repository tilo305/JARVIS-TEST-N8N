// AudioWorklet Processor for Voice Activity Detection (VAD)
// Based on RMS (Root Mean Square) energy calculation
// Processes audio every 128 samples (~2.67ms @ 48kHz)

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Audio buffering - optimized for low latency streaming
    // Smaller buffer = more frequent chunks = lower latency
    this.bufferSize = 9600; // 200ms @ 48kHz (optimal for real-time streaming)
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.isCapturing = false;
    
    // Voice Activity Detection (VAD) configuration
    this.vadEnabled = true;
    this.silenceThreshold = 0.01; // RMS threshold for silence detection
    this.silenceDuration = 3000; // ms of silence before auto-finalize (3 seconds)
    this.lastSpeechTime = 0; // Timestamp of last detected speech
    this.isSpeechActive = false; // Currently detecting speech
    this.minSpeechDuration = 300; // Minimum speech duration before processing (ms)
    this.firstSpeechTime = 0; // Timestamp when speech first started
    
    // Message handling
    this.port.onmessage = (event) => {
      switch (event.data.type) {
        case 'start':
          this.isCapturing = true;
          this.bufferIndex = 0;
          this.isSpeechActive = false;
          this.lastSpeechTime = 0;
          this.firstSpeechTime = 0;
          break;
          
        case 'stop':
          this.isCapturing = false;
          if (this.bufferIndex > 0) {
            this.sendAudioData();
            this.bufferIndex = 0;
          }
          break;
          
        case 'enable-vad':
          this.vadEnabled = true;
          break;
          
        case 'disable-vad':
          this.vadEnabled = false;
          break;
          
        case 'set-threshold':
          this.silenceThreshold = event.data.threshold;
          break;
          
        case 'set-duration':
          this.silenceDuration = event.data.duration;
          break;
          
        case 'get-stats':
          this.sendStats();
          break;
      }
    };
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    
    const inputChannel = input[0];
    
    // Calculate RMS (Root Mean Square) for volume level
    let sumSquares = 0;
    for (let i = 0; i < inputChannel.length; i++) {
      sumSquares += inputChannel[i] * inputChannel[i];
    }
    const rms = Math.sqrt(sumSquares / inputChannel.length);
    
    // Voice Activity Detection (VAD) logic
    if (this.vadEnabled && this.isCapturing) {
      const currentTimeMs = currentTime * 1000;
      const isSpeech = rms > this.silenceThreshold;
      
      if (isSpeech) {
        // Speech detected
        if (!this.isSpeechActive) {
          // Speech just started
          this.isSpeechActive = true;
          this.firstSpeechTime = currentTimeMs;
          this.port.postMessage({ 
            type: 'speech-started',
            timestamp: currentTimeMs,
            rms: rms
          });
        }
        this.lastSpeechTime = currentTimeMs;
      } else if (this.isSpeechActive) {
        // Check if silence duration exceeded
        const silenceDuration = currentTimeMs - this.lastSpeechTime;
        const speechDuration = currentTimeMs - this.firstSpeechTime;
        
        if (silenceDuration > this.silenceDuration && 
            speechDuration > this.minSpeechDuration) {
          // Silence detected - auto-finalize
          this.isSpeechActive = false;
          
          // Flush remaining buffer
          if (this.bufferIndex > 0) {
            this.sendAudioData();
            this.bufferIndex = 0;
          }
          
          this.port.postMessage({ 
            type: 'speech-ended',
            timestamp: currentTimeMs,
            silenceDuration: silenceDuration,
            speechDuration: speechDuration
          });
        }
      }
    }
    
    // Buffer audio data for processing
    // For optimal latency, send chunks frequently (every 200ms)
    if (this.isCapturing) {
      for (let i = 0; i < inputChannel.length; i++) {
        if (this.bufferIndex >= this.bufferSize) {
          // Buffer full, send data immediately for real-time streaming
          this.sendAudioData();
          this.bufferIndex = 0;
        }
        this.buffer[this.bufferIndex++] = inputChannel[i];
      }
    }
    
    return true;
  }
  
  sendAudioData() {
    if (this.bufferIndex === 0) return;
    
    // Send audio chunk
    const audioData = this.buffer.slice(0, this.bufferIndex);
    this.port.postMessage({
      type: 'audio',
      audio: audioData,
      sampleRate: 48000,
      timestamp: currentTime * 1000
    });
  }
  
  sendStats() {
    this.port.postMessage({
      type: 'stats',
      isSpeechActive: this.isSpeechActive,
      isCapturing: this.isCapturing,
      vadEnabled: this.vadEnabled,
      silenceThreshold: this.silenceThreshold,
      silenceDuration: this.silenceDuration
    });
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
