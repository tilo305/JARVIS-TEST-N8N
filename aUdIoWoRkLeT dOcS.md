# 🎵 AudioWorklet Comprehensive Documentation

> **Complete AudioWorklet Reference Based on Latest MDN Research**

**Version:** 3.1.0 | **Last Updated:** January 2025  
**Source:** [MDN AudioWorklet Documentation](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)

## Overview

AudioWorklet is a Web Audio API interface that enables custom audio processing scripts to execute in a **separate Web Audio thread**, providing **very low latency audio processing** (2-10ms) without blocking the main JavaScript thread.

### Key Features
- ⚡ Ultra-low latency (2-10ms)
- 🎯 Sample-accurate timing (128-frame blocks)
- 🚀 High performance (dedicated thread)
- 🔧 Powerful DSP capabilities
- 🌐 Wide browser support (Chrome 66+, Firefox 76+, Safari 14.5+)

## MDN Research Summary

Based on comprehensive research of MDN documentation:

### AudioWorklet Interface
- **Access**: BaseAudioContext.audioWorklet property
- **Inheritance**: Inherits from Worklet interface
- **Execution**: Runs in AudioWorkletGlobalScope using separate Web Audio thread
- **Instance Properties**:
  - port (Read-only, Experimental): Returns a MessagePort for custom, asynchronous communication between code in the main thread and the global scope of an audio worklet. This allows for custom messages, such as sending and receiving control data or global settings.
- **Instance Methods**: Inherits methods from Worklet interface (addModule, etc.)
- **Events**: AudioWorklet has no events to which it responds
- **Availability**: Widely available since April 2021, requires secure context (HTTPS)

### AudioWorkletGlobalScope
- **Properties**: currentFrame, currentTime, sampleRate, port
- **Functions**: registerProcessor() for registering processors

### AudioWorkletProcessor.process()
- Called synchronously from audio rendering thread
- Once per block of 128 frames
- Parameters: inputs, outputs, parameters
- Return: true to keep alive, false to terminate

## Implementation

### Processor Module (audio-capture-processor.js)
See public/audio-capture-processor.js for complete implementation.

### Main Thread Setup
`javascript
const audioContext = new AudioContext({ sampleRate: 48000 });
await audioContext.audioWorklet.addModule('/audio-capture-processor.js');
await new Promise(resolve => setTimeout(resolve, 50)); // Registration delay
const node = new AudioWorkletNode(audioContext, 'audio-capture-processor');
`

### Current Project Files
- public/audio-capture-processor.js - AudioWorklet processor with VAD
- src/hooks/useAudioRecorder.ts - React hook for audio recording
- src/hooks/useWebSocketVoice.ts - WebSocket integration

## Best Practices

1. **Never allocate in process()** - Pre-allocate buffers in constructor
2. **Always validate inputs/outputs** - Check arrays exist before processing
3. **Handle parameters correctly** - They're Float32Arrays, not numbers
4. **Throttle message passing** - Don't send messages every frame
5. **Error handling** - Wrap process() in try-catch, output silence on error
6. **Secure context check** - Verify HTTPS or localhost before use
7. **Module loading delay** - Add 50ms delay after addModule() to ensure registration
8. **Use port property** - Access MessagePort via audioWorklet.port or AudioWorkletNode.port for async communication

## Troubleshooting

### \ AudioWorklet does not have a valid AudioWorkletGlobalScope\
**Solution**: Add delay after addModule():
`javascript
await audioContext.audioWorklet.addModule('/processor.js');
await new Promise(resolve => setTimeout(resolve, 50));
`

### Module Not Loading
Check: Secure context, file path, CORS, browser support, file exists

### No Audio Output
Check: AudioContext state, connections, process() returns true, output buffers written

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ 66+ | Best support |
| Edge | ✅ 79+ | Chromium-based |
| Firefox | ✅ 76+ | Good support |
| Safari | ✅ 14.5+ | Requires user gesture |
| Mobile | ✅ Varies | Higher latency (30-50ms) |

## Quick Reference

### Processor Template
`javascript
class MyProcessor extends AudioWorkletProcessor {
  constructor() { super(); }
  process(inputs, outputs, parameters) {
    // Process audio
    return true;
  }
}
registerProcessor('my-processor', MyProcessor);
`

### Message Passing
`javascript
// Main → Processor
node.port.postMessage({ type: 'cmd', data: value });

// Processor → Main
this.port.postMessage({ type: 'status', data: value });
`

## Summary

AudioWorklet provides ultra-low latency audio processing for JARVIS:
- ✅ Real-time voice processing
- ✅ Low-latency pipeline (200ms buffer)
- ✅ Production-ready implementation
- ✅ Complete VAD integration

**Key Takeaways:**
1. Never allocate in process()
2. Always validate inputs/outputs
3. Handle parameters as arrays
4. Throttle message passing
5. Check secure context
6. Add delay after addModule()
7. Use port property for async communication
8. Test across browsers

*Based on comprehensive research of [MDN AudioWorklet Documentation](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)*

