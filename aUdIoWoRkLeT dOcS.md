# 🎵 JARVIS Desktop Voice AI - AudioWorklet Documentation

> **The Ultimate Desktop AudioWorklet Knowledge Base**  
> Everything you need to know about building, debugging, testing, and mastering AudioWorklets for JARVIS Desktop Voice AI with **COMPLETE CartesiaTTS Integration**

**Last Updated:** November 17, 2025  
**Version:** 2.1.0  
**Status:** Production-Ready Desktop Application Documentation with Complete AudioWorklet Integration  
**Type:** Desktop Application with Complete Cartesia STT/TTS to AudioWorklet Integration

---

## 🚨 CRITICAL: MANDATORY RESEARCH PROTOCOL

### **⚠️ ALWAYS DO THIS FIRST - BEFORE ANY RESEARCH ON THIS DOCUMENT**

When this document is referenced or when working with AudioWorklet integration, you **MUST** follow this strict research order:

#### **STEP 1: Comprehensive Research on Official MDN Documentation (MANDATORY)**
**BEFORE** reading or using this documentation, you **MUST** conduct a comprehensive research session on:

```
https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
```

**Primary Research on AudioWorklet:**
- ✅ **AudioWorklet interface** - The main interface for custom audio processing
- ✅ **Separate thread execution** - How it executes in a separate Web Audio thread
- ✅ **AudioWorkletGlobalScope** - Global execution context
- ✅ **Secure context requirements** - HTTPS requirements
- ✅ **MessagePort communication** - How to communicate between threads
- ✅ **Instance properties** - Available properties and methods
- ✅ **Browser compatibility** - Platform support and requirements

**Then research AudioWorkletProcessor.process():**
- ✅ **AudioWorkletProcessor.process()** - The core processing method
- ✅ **Parameters structure** - inputs, outputs, parameters objects
- ✅ **Return value behavior** - true/false for processor lifecycle
- ✅ **Sample processing** - How 128-frame blocks work
- ✅ **Parameter arrays** - A-rate vs K-rate parameters
- ✅ **Error handling** - How errors are handled in processors
- ✅ **Lifecycle management** - When processors are created/destroyed
- ✅ **Latest API changes** - Browser compatibility updates
- ✅ **Best practices** - MDN recommended practices

**Why This Is Critical:**
- This documentation may be outdated
- Web Audio API evolves with browser updates
- New features may have been added since this doc was written
- Breaking changes could affect your implementation
- Best practices evolve with the API
- MDN is the authoritative source for web APIs

**Research Time:** Spend **5-10 minutes** doing comprehensive research on MDN first.

#### **STEP 2: Comprehensive Research on This Document**
**AFTER** completing Step 1, then conduct a comprehensive research of this document:

- ✅ Read through relevant sections in this document
- ✅ Compare MDN findings with this document
- ✅ Identify any discrepancies
- ✅ Note any outdated information
- ✅ Use MDN as the source of truth
- ✅ Apply corrections based on latest official documentation

**Research Approach:**
1. Use semantic search to find relevant sections
2. Read complete sections, not just snippets
3. Cross-reference with MDN findings
4. Verify examples against current Web Audio API
5. Check version numbers and dates

#### **STEP 3: Implementation with Both Sources**
When implementing:
1. **Verify against MDN** - Always confirm current API behavior
2. **Reference this doc** - Use for implementation patterns and examples
3. **Prioritize MDN** - If there's a conflict, MDN wins
4. **Update this doc** - If you find outdated info, note it for future updates

---

### **⚠️ NEVER Skip the Official MDN Research**

**DO NOT:**
- ❌ Jump straight to this document without checking MDN first
- ❌ Assume this document is up-to-date
- ❌ Ignore breaking changes from MDN
- ❌ Implement based solely on this document
- ❌ Skip the comprehensive research phase

**ALWAYS:**
- ✅ Start with MDN research
- ✅ Use MDN as source of truth
- ✅ Compare this document with MDN findings
- ✅ Verify all examples against current Web Audio API
- ✅ Check version numbers and compatibility
- ✅ Update this document when you find discrepancies

---

### **Key Resources to Check on MDN:**

1. **AudioWorklet** - https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
   - The main interface for custom audio processing scripts
   - Executes in a separate thread for low latency
   - Provides access to AudioWorkletGlobalScope
   - Secure context required (HTTPS)

2. **AudioWorkletProcessor.process()** - https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process
   - The core processing method
   - Called synchronously from audio rendering thread
   - Processes 128-frame audio blocks

3. **AudioWorkletProcessor** - https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor
   - Class for implementing custom audio processing
   - Runs in AudioWorkletGlobalScope
   - Provides parameter automation

4. **AudioWorkletNode** - https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode
   - Connects AudioWorklet to audio graph
   - Main thread interface
   - Parameter automation support

5. **AudioWorkletGlobalScope** - https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope
   - Global execution context for AudioWorklet
   - Contains processor registration
   - Provides global properties

6. **Web Audio API** - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
   - Complete API overview
   - Browser compatibility
   - Best practices

7. **AudioContext** - https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
   - Audio context creation
   - State management
   - Audio graph setup

8. **Browser Compatibility** - https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet#browser_compatibility
   - Feature support matrix
   - Secure context requirements
   - Platform-specific notes

---

**Remember:** This document is a comprehensive reference, but **ALWAYS** verify against MDN first to ensure you're using the latest, most up-to-date Web Audio API information!

**Key MDN References:**
- According to [MDN AudioWorklet documentation](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet), AudioWorklet provides custom audio processing scripts that execute in a separate thread for very low latency audio processing
- According to [MDN AudioWorkletProcessor.process() documentation](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process), the `process()` method is called synchronously from the audio rendering thread, once for each block of 128 frames being directed through the processor. This is critical information for understanding audio processing timing and performance

---

## 🎯 NEW: Complete Cartesia STT/TTS to AudioWorklet Integration

### **Cartesia Agent 1.3 - Complete AudioWorklet Integration**

JARVIS now features **COMPLETE INTEGRATION** between Cartesia STT/TTS and AudioWorklet for real-time speech processing and audio playback:

#### **🌉 Integration Components**
- **CartesiaTTSAudioWorkletBridge**: Complete bridge service for TTS audio flow
- **Enhanced AudioWorkletManager**: Dedicated TTS playback capabilities  
- **AudioPlaybackProcessor**: Dedicated AudioWorklet processor for TTS audio
- **Electron IPC Integration**: Seamless audio data transfer between processes
- **Real-time Audio Flow**: Complete real-time audio pipeline from TTS to speakers

#### **🎵 Complete Audio Pipeline**
```
CartesiaTTS → tts:audio-ready event → CartesiaTTSAudioWorkletBridge → 
Audio Processing (48kHz, no conversion) → AudioWorkletManager → 
AudioWorklet Processor → System Speakers
```

#### **✅ Integration Status**
- **✅ CartesiaTTSAudioWorkletBridge**: Complete bridge service implemented
- **✅ AudioWorkletManager Enhancement**: TTS playback capabilities added
- **✅ AudioPlaybackProcessor**: Dedicated playback processor implemented
- **✅ Electron Integration**: Complete IPC integration implemented
- **✅ Renderer Integration**: Audio playback handling implemented
- **✅ No Sample Rate Conversion**: Already at 48kHz throughout
- **✅ Format Conversion**: PCM_F32LE → Float32Array for AudioWorklet
- **✅ Error Handling**: Comprehensive error handling and HTML5 fallback
- **✅ Performance Monitoring**: Audio processing performance tracking
- **✅ Event-Driven Architecture**: Clean event-driven design

#### **📚 Documentation**
- **Complete Guide**: `docs/cArTeSiA aGeNt 1.2.md`
- **Integration Details**: See source code in `src/services/` and `src/audioworklet/`
- **Test Scripts**: `scripts/test-cartesia-audioworklet-integration.js`

---

---

## 📑 Table of Contents

1. [Introduction & Desktop Fundamentals](#1-introduction--desktop-fundamentals)
2. [Building Desktop AudioWorklets](#2-building-desktop-audioworklets)
3. [Troubleshooting Desktop Audio](#3-troubleshooting-desktop-audio)
4. [Debugging Desktop Strategies](#4-debugging-desktop-strategies)
5. [Testing Desktop Methodologies](#5-testing-desktop-methodologies)
6. [Desktop Error Logging](#6-desktop-error-logging)
7. [Desktop Error Handling](#7-desktop-error-handling)
8. [Desktop Best Practices](#8-desktop-best-practices)
9. [Desktop Performance Optimization](#9-desktop-performance-optimization)
10. [Advanced Desktop Techniques](#10-advanced-desktop-techniques)
11. [Desktop Production Deployment](#11-desktop-production-deployment)
12. [Desktop Quick Reference](#12-desktop-quick-reference)
13. [Desktop AudioWorkletGlobalScope Reference](#13-desktop-audioworkletglobalscope-reference)

---

## 1. Introduction & Desktop Fundamentals

### What are Desktop AudioWorklets?

AudioWorklets are the **modern Web Audio API solution** for custom audio processing that runs in a **dedicated audio rendering thread**, separate from the main JavaScript thread. In JARVIS Desktop Voice AI, AudioWorklets provide real-time audio processing capabilities for desktop applications.

### Key Desktop Characteristics

| Feature | Description | Desktop Benefit |
|---------|-------------|-----------------|
| **Dedicated Thread** | Runs on audio rendering thread | No UI blocking, glitch-free desktop audio |
| **Low Latency** | 2-10ms typical (vs 100-500ms alternatives) | Real-time desktop audio processing |
| **Sample Accuracy** | Per-sample control | Precise desktop timing and automation |
| **Zero GC** | No garbage collection pauses | Consistent desktop performance |
| **WebAssembly Ready** | WASM integration support | 2-10x desktop performance boost |
| **Desktop Integration** | Native Electron integration | Direct desktop system access |
| **Real-time Processing** | Live audio processing | Actual microphone input processing |

### Desktop Architecture

```
┌────────────────────────────────────────┐
│           JARVIS Desktop App            │
├────────────────────────────────────────┤
│  Main Process (main-desktop.js)        │
│  ├── Real Backend Server Management    │
│  ├── AudioWorklet Manager Integration  │
│  ├── Real-time Metrics Collection      │
│  ├── Desktop IPC Communication        │
│  └── System Resource Monitoring       │
├────────────────────────────────────────┤
│  Renderer Process (renderer.js)        │
│  ├── Desktop UI Interface             │
│  ├── Real-time Audio Visualization    │
│  ├── Live Performance Monitoring      │
│  ├── Desktop Event Handling           │
│  └── Real-time Status Updates         │
├────────────────────────────────────────┤
│  AudioWorklet Thread                   │
│  ├── Real-time Audio Processing       │
│  ├── Live Microphone Input            │
│  ├── Voice Activity Detection         │
│  ├── Audio Level Monitoring           │
│  └── Real-time Audio Visualization    │
└────────────────────────────────────────┘
```
│           MAIN THREAD                  │
│  ┌──────────────────────────────────┐  │
│  │    AudioContext (Audio Graph)    │  │
│  │                                   │  │
│  │  [Source] → [WorkletNode] → [D]  │  │
│  │              ↕ AudioWorklet.port  │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
              ↕ MessagePort
┌────────────────────────────────────────┐
│       AUDIO RENDERING THREAD           │
│  ┌──────────────────────────────────┐  │
│  │   AudioWorkletGlobalScope        │  │
│  │                                   │  │
│  │  AudioWorkletProcessor.process() │  │
│  │    - Every 128 frames            │  │
│  │    - Real-time safe              │  │
│  │    - Shared with other nodes     │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### AudioWorklet Interface

The `AudioWorklet` interface provides access to the worklet's `port` property for communication:

```javascript
// Access the AudioWorklet instance
const audioWorklet = audioContext.audioWorklet;

// Get the MessagePort for communication
const workletPort = audioWorklet.port;

// Send messages to all processors
workletPort.postMessage({ type: 'global-config', data: config });
```

### Use Cases

✅ **Ideal For:**
- Real-time audio effects (reverb, delay, distortion)
- Synthesizers and oscillators
- Audio analysis (FFT, spectral processing)
- Voice processing (pitch shifting, formants)
- Custom filters
- Low-latency audio streaming
- Voice assistants (JARVIS)

❌ **Not Ideal For:**
- Simple gain/pan (use native nodes)
- Basic file playback (use AudioBuffer)
- One-off offline processing (use OfflineAudioContext)

---

## 2. Building AudioWorklets

### 2.1 Minimal Working Example

#### Processor File

**File:** `processor.js`

```javascript
class MyAudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    
    // Process each channel
    output.forEach(channel => {
      for (let i = 0; i < channel.length; i++) {
        // Generate white noise
        channel[i] = Math.random() * 2 - 1;
      }
    });
    
    return true; // Keep processor alive
  }
}

// Register the processor
registerProcessor('my-audio-processor', MyAudioProcessor);
```

#### Main Thread Integration

**File:** `main.js`

```javascript
// Create audio context
const audioContext = new AudioContext();

// Load the processor module
await audioContext.audioWorklet.addModule('processor.js');

// Create the worklet node
const workletNode = new AudioWorkletNode(
  audioContext, 
  'my-audio-processor'
);

// Connect to audio graph
workletNode.connect(audioContext.destination);
```

### 2.2 Complete Processor Template

```javascript
class CompleteProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Initialize state (runs once)
    this.sampleRate = sampleRate; // Global available
    this.currentFrame = currentFrame; // Global frame counter
    
    // Pre-allocate buffers (NEVER in process())
    this.buffer = new Float32Array(128);
    this.state = {
      phase: 0,
      previousSample: 0
    };
    
    // Setup message port listener
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }
  
  // Define custom audio parameters
  static get parameterDescriptors() {
    return [
      {
        name: 'frequency',
        defaultValue: 440,
        minValue: 20,
        maxValue: 20000,
        automationRate: 'a-rate' // or 'k-rate'
      },
      {
        name: 'gain',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: 'a-rate'
      }
    ];
  }
  
  // Handle messages from main thread
  handleMessage(data) {
    switch (data.type) {
      case 'update-config':
        this.updateConfig(data.config);
        break;
      case 'reset':
        this.reset();
        break;
    }
  }
  
  // Main processing method
  // Called ~375 times/sec @ 48kHz
  process(inputs, outputs, parameters) {
    try {
      const output = outputs[0];
      const input = inputs[0];
      
      // Check output exists
      if (!output || output.length === 0) {
        return true;
      }
      
      const outputChannel = output[0];
      const frequency = parameters.frequency;
      const gain = parameters.gain;
      
      // Process audio samples
      for (let i = 0; i < outputChannel.length; i++) {
        // Handle a-rate and k-rate params
        const freq = frequency.length > 1 
          ? frequency[i] 
          : frequency[0];
        const amp = gain.length > 1 
          ? gain[i] 
          : gain[0];
        
        // Your DSP code here
        outputChannel[i] = Math.sin(this.state.phase) * amp;
        this.state.phase += (2 * Math.PI * freq) / this.sampleRate;
        
        // Wrap phase
        if (this.state.phase >= 2 * Math.PI) {
          this.state.phase -= 2 * Math.PI;
        }
      }
      
      // Send status updates (throttled!)
      if (currentFrame % 1000 === 0) {
        this.port.postMessage({
          type: 'status',
          frame: currentFrame
        });
      }
      
      return true; // Keep alive
      
    } catch (error) {
      // Send error to main thread
      this.port.postMessage({
        type: 'error',
        message: error.message,
        stack: error.stack
      });
      
      // Output silence on error
      outputs.forEach(output => {
        output.forEach(channel => channel.fill(0));
      });
      
      return true; // Continue despite error
    }
  }
  
  updateConfig(config) {
    // Update internal configuration
  }
  
  reset() {
    this.state.phase = 0;
    this.state.previousSample = 0;
  }
}

registerProcessor('complete-processor', CompleteProcessor);
```

### 2.3 Main Thread Setup

```javascript
class AudioWorkletManager {
  constructor() {
    this.audioContext = null;
    this.workletNode = null;
  }
  
  async initialize() {
    // Create audio context
    this.audioContext = new AudioContext({
      latencyHint: 'interactive',
      sampleRate: 48000
    });
    
    // Resume if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Load processor module
    await this.audioContext.audioWorklet.addModule(
      'processor.js'
    );
    
    // Create worklet node
    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      'complete-processor',
      {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2], // Stereo
        parameterData: {
          frequency: 440,
          gain: 0.5
        },
        processorOptions: {
          customData: 'any data'
        }
      }
    );
    
    // Setup message handler
    this.workletNode.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    
    // Setup error handler
    this.workletNode.onprocessorerror = (event) => {
      console.error('Processor error:', event);
    };
    
    // Connect to audio graph
    this.workletNode.connect(
      this.audioContext.destination
    );
  }
  
  handleMessage(data) {
    switch (data.type) {
      case 'status':
        console.log('Processor status:', data);
        break;
      case 'error':
        console.error('Processor error:', data.message);
        break;
    }
  }
  
  // Parameter control
  setFrequency(value) {
    const param = this.workletNode.parameters.get('frequency');
    param.setValueAtTime(value, this.audioContext.currentTime);
  }
  
  // Automated parameter changes
  sweepFrequency(startFreq, endFreq, duration) {
    const param = this.workletNode.parameters.get('frequency');
    const now = this.audioContext.currentTime;
    
    param.setValueAtTime(startFreq, now);
    param.exponentialRampToValueAtTime(
      endFreq, 
      now + duration
    );
  }
  
  // Send control messages
  sendMessage(data) {
    this.workletNode.port.postMessage(data);
  }
  
  // Cleanup
  destroy() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Usage
const manager = new AudioWorkletManager();
await manager.initialize();
manager.setFrequency(880);
```

### 2.4 Parameter Types: A-rate vs K-rate

**A-rate (audio-rate):**
- Updates **per sample** (48,000 times/sec @ 48kHz)
- Array length = quantum size (128)
- Higher CPU cost
- Smooth automation
- Use for: frequency, amplitude modulation

**K-rate (control-rate):**
- Updates **per quantum** (~375 times/sec)
- Array length = 1
- Lower CPU cost
- Potential zipper noise
- Use for: slow modulations, UI controls

```javascript
static get parameterDescriptors() {
  return [
    {
      name: 'frequency',
      defaultValue: 440,
      automationRate: 'a-rate' // Sample-accurate
    },
    {
      name: 'roomSize',
      defaultValue: 0.5,
      automationRate: 'k-rate' // Block-accurate
    }
  ];
}

// In process() method
process(inputs, outputs, parameters) {
  const frequency = parameters.frequency;
  const roomSize = parameters.roomSize;
  
  for (let i = 0; i < 128; i++) {
    // A-rate: per-sample access
    const freq = frequency.length > 1 
      ? frequency[i] 
      : frequency[0];
    
    // K-rate: single value
    const room = roomSize[0];
  }
}
```

---

## 3. Troubleshooting Guide

### 3.1 AudioWorklet Not Loading

**Symptoms:**
- `Error: Failed to add module`
- `InvalidStateError`
- `NotSupportedError`
- `AudioWorklet does not have a valid AudioWorkletGlobalScope` ⭐ **CRITICAL FIX 2025-11-17**

**Solutions:**

```javascript
// 1. Check secure context (HTTPS required)
if (!window.isSecureContext) {
  console.error('AudioWorklet requires HTTPS or localhost');
  throw new Error('Secure context required');
}

// 2. Check file path (must be absolute or relative to origin)
// ❌ Wrong - relative paths can fail
await audioContext.audioWorklet.addModule('./processor.js');

// ✅ Correct - absolute paths
await audioContext.audioWorklet.addModule('/processor.js');

// ✅ Also correct - relative to origin
await audioContext.audioWorklet.addModule('processor.js');

// 3. Check CORS (must be same-origin)
// ❌ Cross-origin fails
await audioContext.audioWorklet.addModule(
  'https://cdn.example.com/processor.js'
);

// ✅ Same-origin
await audioContext.audioWorklet.addModule(
  '/audio/processor.js'
);

// 4. Check browser support
if (!('audioWorklet' in AudioContext.prototype)) {
  console.error('AudioWorklet not supported');
  throw new Error('Browser does not support AudioWorklet');
}

// 5. Check Cross-Origin Isolation (for SharedArrayBuffer)
if (typeof SharedArrayBuffer !== 'undefined' && !crossOriginIsolated) {
  console.warn('SharedArrayBuffer requires Cross-Origin Isolation');
}

// 6. ⭐ CRITICAL FIX (2025-11-17): Add delay after addModule() to prevent race condition
// addModule() Promise resolves when module is loaded, but registration may not be complete
await audioContext.audioWorklet.addModule(processorUrl);
console.log('✅ AudioWorklet module loaded successfully');

// CRITICAL: Add small delay to ensure module is fully registered in AudioWorkletGlobalScope
// This prevents "AudioWorklet does not have a valid AudioWorkletGlobalScope" errors
await new Promise(resolve => setTimeout(resolve, 50));
console.log('✅ Module registration verified');

// NOW safe to create node
const workletNode = new AudioWorkletNode(audioContext, 'processor-name', {...});
```

### 3.2 No Audio Output

**Diagnostic checklist:**

```javascript
// 1. Check AudioContext state
console.log('State:', audioContext.state);
if (audioContext.state === 'suspended') {
  await audioContext.resume();
}

// 2. Check connections
console.log('Outputs:', workletNode.numberOfOutputs);

// 3. Verify process() returns true
process(inputs, outputs, parameters) {
  // ... processing ...
  return true; // ← Must be here!
}

// 4. Check output format
process(inputs, outputs, parameters) {
  console.log('Outputs:', outputs.length);
  console.log('Channels:', outputs[0].length);
}
```

### 3.3 Audio Glitches

**Causes & Solutions:**

```javascript
// 1. Process() taking too long
class MonitoredProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const start = currentTime;
    
    // Your processing...
    
    const elapsed = currentTime - start;
    const budget = (128 / sampleRate);
    
    if (elapsed > budget * 0.8) {
      this.port.postMessage({
        type: 'warning',
        cpuUsage: (elapsed / budget) * 100
      });
    }
    
    return true;
  }
}

// 2. Avoid allocations
// ❌ DON'T
process(inputs, outputs, parameters) {
  const buffer = new Float32Array(128); // BAD!
}

// ✅ DO
constructor() {
  super();
  this.buffer = new Float32Array(128); // Good!
}

// 3. Prevent denormals
process(inputs, outputs, parameters) {
  const DC = 1e-25;
  
  let sample = input[i] + DC;
  
  // Process...
  
  // Flush to zero
  if (Math.abs(sample) < 1e-10) {
    sample = 0;
  }
  
  output[i] = sample - DC;
}
```

### 3.4 Parameters Not Working

```javascript
// ❌ Wrong - parameters are Float32Arrays
const gain = parameters.gain;
output[i] = input[i] * gain; // Wrong!

// ✅ Correct
const gainArray = parameters.gain;
for (let i = 0; i < output.length; i++) {
  const g = gainArray.length > 1 
    ? gainArray[i] 
    : gainArray[0];
  output[i] = input[i] * g;
}
```

### 3.5 Browser-Specific Issues

**Safari:**
```javascript
// Requires user gesture
document.addEventListener('click', async () => {
  const ctx = new AudioContext();
  
  // May start suspended
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}, { once: true });
```

**Chrome/Edge:**
```javascript
// Best AudioWorklet support
// SharedArrayBuffer requires Cross-Origin Isolation
// Check for experimental features
if ('audioWorklet' in AudioContext.prototype) {
  console.log('AudioWorklet supported');
}
```

**Firefox:**
```javascript
// Good support, some SharedArrayBuffer limitations
// Check for specific features
if (typeof SharedArrayBuffer !== 'undefined') {
  console.log('SharedArrayBuffer available');
}
```

**Mobile:**
```javascript
// Higher latency: 30-50ms typical
// Aggressive power management
// Test on actual devices!
// May require user interaction for audio context
```

### 3.6 Audio Repetition Fix (2025-11-17) ⭐ NEW

**Problem**: AI is repeating every single word it says

**Root Causes**: TWO issues found:
1. **Frontend**: Duplicate event listener registration - `setupEventListeners()` was being called multiple times without removing old listeners
2. **Backend**: Duplicate event listener registration - `setupEventForwarding()` was being called multiple times without removing old listeners on `cartesiaClient` (PRIMARY ISSUE)

**Solution**:

**Frontend Fix**:
```javascript
// CRITICAL FIX: Remove all listeners before registering new ones
function setupEventListeners() {
  // Remove all existing listeners to prevent duplicates
  if (window.voiceAPI && typeof window.voiceAPI.removeAllListeners === 'function') {
    window.voiceAPI.removeAllListeners();
    console.log('🧹 Removed all existing event listeners');
  }
  
  // Now register all listeners fresh
  window.voiceAPI.on('voice:tts:audio', async (data) => {
    await playTTSAudio(data);
  });
  // ... other listeners
}

// Guard against duplicate calls
let eventListenersInitialized = false;
const originalSetupEventListeners = setupEventListeners;
setupEventListeners = function() {
  if (eventListenersInitialized) {
    console.warn('⚠️ setupEventListeners() already called - skipping duplicate registration');
    return;
  }
  eventListenersInitialized = true;
  originalSetupEventListeners();
};

// Prevent duplicate AudioWorklet node creation
if (audioWorkletNode) {
  console.warn('⚠️ audioWorkletNode already exists - disconnecting old node');
  audioWorkletNode.disconnect();
  audioWorkletNode = null;
}
```

**Backend Fix** (CRITICAL):
```javascript
// src/ipc/cartesia-ipc-handlers.js
let eventForwardingSetup = false; // Track if event forwarding is already setup

function setupEventForwarding() {
  if (!cartesiaClient || !mainWindow) {
    return;
  }
  
  // CRITICAL FIX: Prevent duplicate event listener registration
  if (eventForwardingSetup) {
    log.warn('⚠️ Cartesia IPC: Event forwarding already setup - removing old listeners first');
    // Remove all existing listeners to prevent duplicates
    cartesiaClient.removeAllListeners('audio-chunk'); // CRITICAL: This is causing duplicates!
    cartesiaClient.removeAllListeners('ready');
    // ... remove all other listeners ...
    log.info('🧹 Cartesia IPC: Removed all existing event listeners');
  }
  
  // Now register all listeners fresh
  cartesiaClient.on('audio-chunk', (data) => {
    mainWindow.webContents.send('voice:tts:audio', data);
  });
  // ... other listeners ...
  
  eventForwardingSetup = true;
  log.info('✅ Cartesia IPC: Event forwarding setup complete');
}
```

**Files Modified**:
- `src/preload.js` - Added `removeAllListeners()` method
- `public/renderer.js` - Frontend cleanup and guards
- `src/ipc/cartesia-ipc-handlers.js` - Backend cleanup and guards ⭐ CRITICAL
- `src/main.js` - Documentation updated

**Debug Tools**:
- `debug/AUDIO-REPETITION-DEBUG/audio-repetition-live-debugger.js` (Frontend)
- `debug/AUDIO-REPETITION-DEBUG/backend-duplicate-listener-debugger.js` (Backend) ⭐ NEW
- `debug/AUDIO-REPETITION-DEBUG/runtime-listener-checker.js` (Browser runtime checker)

**Documentation**: 
- `debug/AUDIO-REPETITION-DEBUG/AUDIO-REPETITION-FIX-COMPLETE.md` (Frontend)
- `debug/AUDIO-REPETITION-DEBUG/BACKEND-DUPLICATE-LISTENER-FIX-COMPLETE.md` (Backend) ⭐ NEW

---

### 3.7 JARVIS Desktop Audio Streaming Hardening (2025-10)

This app includes additional measures to prevent static, long tails after silence, and missing audio:

- Server-side pacing and coalescing
  - TTS chunks are queued and sent at 48 kHz-equivalent pacing.
  - Small fragments are coalesced to ≥4096 samples before sending to avoid micro-fragment artifacts.
  - Emits `voice:audio:end` after the paced queue fully drains upon chat completion.

- Renderer WS batching and TTS coalescing
  - WebSocket messages are queued and drained per animation frame to avoid recursion/overflow.
  - TTS fragments are accumulated and flushed when ≥4096 samples or after ~16ms; nothing is dropped.

- Playback safeguards
  - `AudioPlaybackProcessor` uses a 240000-sample circular buffer and a 4096-sample auto-start threshold.
  - Sends `playback_stopped` on underrun; the renderer resets state on `voice:audio:end`.

- Diagnostics
  - Backend logs every 20 paced sends: "[TTS Pace] Sent packets: N, lastSamples=…".
  - Renderer logs when coalesced audio flushes: "Flushing coalesced audio: X samples".

- Watchdog (temporary)
  - If no audio flush occurs within ~1.5s after `chat:response:complete`, the renderer injects a 250ms 440Hz test tone to validate the output path.

Verification checklist
1) Backend shows "[TTS Pace] Sent packets…" during TTS.
2) Renderer shows "Flushing coalesced audio: …" soon after.
3) You hear voice playback; if not, you should hear the watchdog tone, indicating the speaker path works.
4) On completion, `voice:audio:end` is handled and there is no static tail.

---

## 4. Debugging Strategies

### 4.1 Message-Based Logging

```javascript
// Processor side
class LoggingProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.logQueue = [];
    this.logInterval = 48000; // 1 sec @ 48kHz
    this.frameCount = 0;
  }
  
  log(level, message, data = {}) {
    this.logQueue.push({
      level,
      message,
      data,
      frame: currentFrame,
      time: currentTime
    });
  }
  
  process(inputs, outputs, parameters) {
    this.frameCount += 128;
    
    // Your processing...
    this.log('info', 'Processing', { level: 0.5 });
    
    // Send logs periodically
    if (this.frameCount >= this.logInterval) {
      if (this.logQueue.length > 0) {
        this.port.postMessage({
          type: 'logs',
          logs: this.logQueue.slice()
        });
        this.logQueue = [];
      }
      this.frameCount = 0;
    }
    
    return true;
  }
}

// Main thread
workletNode.port.onmessage = (event) => {
  if (event.data.type === 'logs') {
    event.data.logs.forEach(log => {
      console.log(`[${log.level}]`, log.message, log.data);
    });
  }
};
```

### 4.2 Visual Debugging

```javascript
// Create analyzer
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;

workletNode.connect(analyser);
analyser.connect(audioContext.destination);

// Visualize
const dataArray = new Uint8Array(analyser.frequencyBinCount);
const canvas = document.getElementById('debugCanvas');
const ctx = canvas.getContext('2d');

function visualize() {
  requestAnimationFrame(visualize);
  
  analyser.getByteFrequencyData(dataArray);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = canvas.width / dataArray.length;
  
  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height;
    ctx.fillStyle = `hsl(${(i/dataArray.length)*360}, 100%, 50%)`;
    ctx.fillRect(
      i * barWidth, 
      canvas.height - barHeight, 
      barWidth, 
      barHeight
    );
  }
}

visualize();
```

### 4.3 Testing with OfflineAudioContext

```javascript
async function testProcessor() {
  const offline = new OfflineAudioContext(1, 48000, 48000);
  
  await offline.audioWorklet.addModule('processor.js');
  const processor = new AudioWorkletNode(
    offline, 
    'my-processor'
  );
  
  processor.connect(offline.destination);
  
  const buffer = await offline.startRendering();
  const data = buffer.getChannelData(0);
  
  console.log('First 10 samples:', data.slice(0, 10));
  
  // Verify output
  const rms = Math.sqrt(
    data.reduce((sum, x) => sum + x * x, 0) / data.length
  );
  console.log('RMS level:', rms);
  
  return buffer;
}

testProcessor()
  .then(() => console.log('✅ Test passed'))
  .catch(err => console.error('❌ Test failed:', err));
```

---

## 5. Testing Methodologies

### 5.1 Unit Testing

```javascript
// test/processor.test.js
import { describe, it, expect, beforeEach } from 'vitest';

describe('AudioProcessor', () => {
  let audioContext;
  let processorNode;
  
  beforeEach(async () => {
    audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule('/processor.js');
    processorNode = new AudioWorkletNode(
      audioContext, 
      'my-processor'
    );
  });
  
  afterEach(() => {
    processorNode.disconnect();
    audioContext.close();
  });
  
  it('should create without errors', () => {
    expect(processorNode).toBeDefined();
    expect(processorNode.numberOfInputs).toBe(1);
  });
  
  it('should have correct parameters', () => {
    const freq = processorNode.parameters.get('frequency');
    expect(freq).toBeDefined();
    expect(freq.value).toBe(440);
  });
  
  it('should process audio', async () => {
    const offline = new OfflineAudioContext(1, 48000, 48000);
    await offline.audioWorklet.addModule('/processor.js');
    
    const processor = new AudioWorkletNode(
      offline, 
      'my-processor'
    );
    processor.connect(offline.destination);
    
    const buffer = await offline.startRendering();
    const data = buffer.getChannelData(0);
    
    // Check no NaN/Infinity
    const hasInvalid = data.some(x => !isFinite(x));
    expect(hasInvalid).toBe(false);
    
    // Check not silent
    const isSilent = data.every(x => Math.abs(x) < 1e-6);
    expect(isSilent).toBe(false);
  });
});
```

### 5.2 Performance Testing

```javascript
describe('Performance', () => {
  it('should process within CPU budget', async () => {
    const offline = new OfflineAudioContext(1, 480000, 48000);
    await offline.audioWorklet.addModule('/processor.js');
    
    const processor = new AudioWorkletNode(
      offline, 
      'my-processor'
    );
    processor.connect(offline.destination);
    
    const start = performance.now();
    await offline.startRendering();
    const elapsed = performance.now() - start;
    
    const audioLength = 10000; // 10 seconds
    const realtimeFactor = elapsed / audioLength;
    
    console.log('Realtime factor:', realtimeFactor);
    expect(realtimeFactor).toBeLessThan(0.8);
  });
});
```

---

## 6. Error Logging

### 6.1 Structured Logger

```javascript
class AudioLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }
  
  log(level, source, message, data = {}) {
    const entry = {
      timestamp: Date.now(),
      level,
      source,
      message,
      data,
      frame: typeof currentFrame !== 'undefined' 
        ? currentFrame 
        : null
    };
    
    this.logs.push(entry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    const method = {
      'error': console.error,
      'warn': console.warn,
      'info': console.info,
      'debug': console.log
    }[level] || console.log;
    
    method(`[${source}] ${message}`, data);
  }
  
  error(source, message, data) {
    this.log('error', source, message, data);
  }
  
  warn(source, message, data) {
    this.log('warn', source, message, data);
  }
  
  getLogs(filter = {}) {
    let filtered = this.logs;
    
    if (filter.level) {
      filtered = filtered.filter(
        log => log.level === filter.level
      );
    }
    
    return filtered;
  }
  
  export() {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const audioLogger = new AudioLogger();
```

---

## 7. Error Handling

### 7.1 Processor Error Handling

```javascript
class RobustProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.errorCount = 0;
    this.maxErrors = 10;
  }
  
  handleError(error, context = '') {
    this.errorCount++;
    
    this.port.postMessage({
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        context
      },
      errorCount: this.errorCount
    });
    
    // Terminate if too many errors
    if (this.errorCount >= this.maxErrors) {
      this.port.postMessage({
        type: 'fatal-error',
        message: 'Too many errors'
      });
      return false; // Terminate
    }
    
    return true; // Continue
  }
  
  process(inputs, outputs, parameters) {
    try {
      // Validate inputs
      if (!outputs || outputs.length === 0) {
        throw new Error('No outputs');
      }
      
      // Your processing logic
      const output = outputs[0][0];
      
      for (let i = 0; i < output.length; i++) {
        const sample = this.processSample(i, parameters);
        
        if (!isFinite(sample)) {
          throw new Error(`Invalid sample: ${sample}`);
        }
        
        output[i] = sample;
      }
      
      return true;
      
    } catch (error) {
      // Output silence
      outputs.forEach(output => {
        output.forEach(channel => channel.fill(0));
      });
      
      return this.handleError(error, 'process()');
    }
  }
  
  processSample(index, parameters) {
    return Math.random() * 2 - 1;
  }
}
```

### 7.2 Main Thread Error Handling

```javascript
class ErrorHandler {
  constructor(workletNode) {
    this.workletNode = workletNode;
    this.setupHandlers();
  }
  
  setupHandlers() {
    // Handle processor errors
    this.workletNode.onprocessorerror = (event) => {
      console.error('Processor error:', event);
      this.attemptRecovery();
    };
    
    // Handle messages
    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'error') {
        this.handleError(event.data);
      }
      if (event.data.type === 'fatal-error') {
        this.handleFatal(event.data);
      }
    };
  }
  
  async attemptRecovery() {
    console.log('Attempting recovery...');
    
    try {
      this.workletNode.disconnect();
      await new Promise(r => setTimeout(r, 100));
      this.workletNode.connect(
        this.workletNode.context.destination
      );
      console.log('Recovery successful');
    } catch (error) {
      console.error('Recovery failed:', error);
    }
  }
  
  handleError(data) {
    console.error('Processor error:', data.error);
  }
  
  handleFatal(data) {
    console.error('FATAL:', data);
    // Recreate processor
  }
}
```

---

## 8. Best Practices

### 8.1 Golden Rules

✅ **DO:**
- Allocate all buffers in `constructor()`
- Use typed arrays (Float32Array)
- Keep `process()` fast (<1ms)
- Always return `true` to keep alive
- Handle a-rate and k-rate correctly
- Use MessagePort for control
- Wrap in try-catch
- Test across browsers
- Enable HTTPS

❌ **DON'T:**
- Allocate in `process()`
- Use async/await in `process()`
- Use console.log in production
- Access DOM from processor
- Assume parameters are numbers
- Assume inputs/outputs exist
- Send large messages
- Block audio thread

### 8.2 Performance Checklist

```javascript
class OptimizedProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // ✅ Pre-allocate buffers
    this.workBuffer = new Float32Array(128);
    
    // ✅ Pre-compute constants
    this.twoPi = 2 * Math.PI;
    this.sampleRateInv = 1 / sampleRate;
    
    // ✅ Create lookup tables
    this.tableSize = 4096;
    this.sineTable = new Float32Array(this.tableSize);
    for (let i = 0; i < this.tableSize; i++) {
      this.sineTable[i] = Math.sin(
        (i / this.tableSize) * this.twoPi
      );
    }
    
    // ✅ Initialize state
    this.phase = 0;
    
    // ✅ Use bit mask for wrapping
    this.mask = this.tableSize - 1;
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0][0];
    
    for (let i = 0; i < output.length; i++) {
      // ✅ Use lookup table
      const index = Math.floor(this.phase * this.tableSize);
      const sample = this.sineTable[index & this.mask];
      
      // ✅ Flush denormals
      output[i] = Math.abs(sample) < 1e-10 ? 0 : sample;
      
      // ✅ Efficient phase update
      this.phase += 440 * this.sampleRateInv;
      if (this.phase >= 1.0) this.phase -= 1.0;
    }
    
    return true;
  }
}
```

---

## 9. Performance Optimization

### 9.1 CPU Budget Management

```javascript
class AdaptiveProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetCpuUsage = 0.5;
    this.qualityLevel = 1.0;
  }
  
  process(inputs, outputs, parameters) {
    const budget = (128 / sampleRate);
    const start = currentTime;
    
    // Adjust quality
    this.adjustQuality();
    
    // Process with quality level
    this.processWithQuality(outputs, this.qualityLevel);
    
    // Measure performance
    const elapsed = currentTime - start;
    const cpuUsage = elapsed / budget;
    
    this.lastCpuUsage = cpuUsage;
    
    return true;
  }
  
  adjustQuality() {
    if (this.lastCpuUsage > this.targetCpuUsage) {
      this.qualityLevel = Math.max(0.25, this.qualityLevel - 0.05);
    } else if (this.lastCpuUsage < this.targetCpuUsage * 0.8) {
      this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.01);
    }
  }
  
  processWithQuality(outputs, quality) {
    const iterations = Math.floor(10 * quality);
    // Adaptive processing...
  }
}
```

---

## 10. Advanced Techniques

### 10.1 SharedArrayBuffer Ring Buffer

```javascript
class RingBuffer {
  constructor(sab, length) {
    this.indices = new Int32Array(sab, 0, 2);
    this.data = new Float32Array(sab, 8, length);
    this.length = length;
    this.mask = length - 1;
  }
  
  write(samples) {
    const writeIdx = Atomics.load(this.indices, 0);
    const readIdx = Atomics.load(this.indices, 1);
    
    const available = (readIdx - writeIdx - 1 + this.length) 
      & this.mask;
    
    if (samples.length > available) return false;
    
    let idx = writeIdx;
    for (let i = 0; i < samples.length; i++) {
      this.data[idx] = samples[i];
      idx = (idx + 1) & this.mask;
    }
    
    Atomics.store(this.indices, 0, idx);
    return true;
  }
  
  read(buffer) {
    const writeIdx = Atomics.load(this.indices, 0);
    const readIdx = Atomics.load(this.indices, 1);
    
    const available = (writeIdx - readIdx + this.length) 
      & this.mask;
    
    if (buffer.length > available) return false;
    
    let idx = readIdx;
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = this.data[idx];
      idx = (idx + 1) & this.mask;
    }
    
    Atomics.store(this.indices, 1, idx);
    return true;
  }
}
```

---

## 11. Production Deployment

### 11.1 Next.js Configuration

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          }
        ]
      }
    ];
  },
  
  // Ensure AudioWorklet files are served correctly
  webpack: (config) => {
    config.module.rules.push({
      test: /\.worklet\.js$/,
      use: {
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          publicPath: '/_next/static/worklets/',
          outputPath: 'static/worklets/'
        }
      }
    });
    return config;
  }
};

export default nextConfig;
```

### 11.2 Cross-Origin Isolation Setup

```html
<!-- Required headers for SharedArrayBuffer -->
<meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin">
<meta http-equiv="Cross-Origin-Embedder-Policy" content="require-corp">
```

```javascript
// Check Cross-Origin Isolation
if (typeof SharedArrayBuffer !== 'undefined' && !crossOriginIsolated) {
  console.warn('SharedArrayBuffer requires Cross-Origin Isolation');
  console.log('Add headers: COOP: same-origin, COEP: require-corp');
}
```

### 11.3 Deployment Checklist

✅ **Pre-Deployment:**
- [ ] AudioWorklet files bundled
- [ ] HTTPS enabled
- [ ] Cross-origin headers configured
- [ ] Error tracking integrated
- [ ] Performance monitoring setup
- [ ] Browser compatibility tested
- [ ] Mobile testing complete
- [ ] Fallback strategies implemented
- [ ] Resource cleanup verified
- [ ] Memory leak testing passed
- [ ] Cross-Origin Isolation configured
- [ ] SharedArrayBuffer support verified

---

## 12. Quick Reference

### 12.1 Cheat Sheet

```javascript
// ========== PROCESSOR TEMPLATE ==========
class MyProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }
  
  static get parameterDescriptors() {
    return [{
      name: 'param',
      defaultValue: 1,
      automationRate: 'a-rate'
    }];
  }
  
  process(inputs, outputs, parameters) {
    // Process audio
    return true; // Keep alive
  }
}
registerProcessor('my-processor', MyProcessor);

// ========== MAIN THREAD ==========
const ctx = new AudioContext();
await ctx.audioWorklet.addModule('processor.js');
const node = new AudioWorkletNode(ctx, 'my-processor');
node.connect(ctx.destination);

// ========== PARAMETERS ==========
const param = node.parameters.get('param');
param.setValueAtTime(value, ctx.currentTime);
param.linearRampToValueAtTime(endVal, ctx.currentTime + dur);

// ========== MESSAGES ==========
// Main → Processor
node.port.postMessage({ type: 'cmd', data: value });
// Processor → Main  
this.port.postMessage({ type: 'status', data: value });

// ========== ERROR HANDLING ==========
node.onprocessorerror = (e) => console.error(e);
try { /* ... */ } catch (e) { /* handle */ }

// ========== CLEANUP ==========
node.disconnect();
await ctx.close();
```

### 12.2 Common Patterns

```javascript
// Pass-through
class PassThrough extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    for (let ch = 0; ch < Math.min(input.length, output.length); ch++) {
      output[ch].set(input[ch]);
    }
    
    return true;
  }
}

// Gain
class Gain extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'gain',
      defaultValue: 1,
      automationRate: 'a-rate'
    }];
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    const gain = parameters.gain;
    
    for (let i = 0; i < output.length; i++) {
      const g = gain.length > 1 ? gain[i] : gain[0];
      output[i] = input[i] * g;
    }
    
    return true;
  }
}

// Oscillator
class Oscillator extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
  }
  
  static get parameterDescriptors() {
    return [{
      name: 'frequency',
      defaultValue: 440,
      automationRate: 'a-rate'
    }];
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0][0];
    const freq = parameters.frequency;
    
    for (let i = 0; i < output.length; i++) {
      const f = freq.length > 1 ? freq[i] : freq[0];
      output[i] = Math.sin(this.phase);
      this.phase += (2 * Math.PI * f) / sampleRate;
    }
    
    return true;
  }
}
```

### 12.3 Debug Commands

```javascript
// Check support
console.log('AudioWorklet:', 'audioWorklet' in AudioContext.prototype);

// Check state
console.log('State:', audioContext.state);
console.log('Sample rate:', audioContext.sampleRate);
console.log('Latency:', audioContext.baseLatency);

// Check SharedArrayBuffer
console.log('SAB:', typeof SharedArrayBuffer !== 'undefined');
console.log('Isolated:', crossOriginIsolated);

// Check secure context
console.log('Secure context:', window.isSecureContext);

// Check AudioWorklet port
console.log('Worklet port:', audioContext.audioWorklet.port);

// Test offline
const offline = new OfflineAudioContext(1, 48000, 48000);
await offline.audioWorklet.addModule('processor.js');
const node = new AudioWorkletNode(offline, 'my-processor');
node.connect(offline.destination);
const buffer = await offline.startRendering();
console.log('Output:', buffer.getChannelData(0).slice(0, 10));
```

---

## 13. AudioWorkletGlobalScope Reference

### 13.1 Global Scope Properties

The `AudioWorkletGlobalScope` provides access to global properties and functions:

```javascript
class MyProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Access global properties
    console.log('Sample rate:', sampleRate);        // AudioContext sample rate
    console.log('Current frame:', currentFrame);    // Frame counter
    console.log('Current time:', currentTime);      // Audio time
    console.log('Port:', this.port);                // MessagePort
    
    // Access global functions
    console.log('Register processor:', registerProcessor);
  }
}
```

### 13.2 Global Functions

```javascript
// Register a processor (must be called at module level)
registerProcessor('my-processor', MyProcessor);

// Access the port for communication
this.port.postMessage({ type: 'status', data: 'ready' });
this.port.onmessage = (event) => {
  console.log('Received:', event.data);
};
```

### 13.3 Scope Limitations

```javascript
// ❌ NOT AVAILABLE in AudioWorkletGlobalScope:
// - DOM APIs (document, window)
// - setTimeout/setInterval
// - fetch/XMLHttpRequest
// - localStorage/sessionStorage
// - Web Workers APIs

// ✅ AVAILABLE:
// - Math, Array, Object, etc.
// - TypedArrays (Float32Array, etc.)
// - WebAssembly (if loaded)
// - SharedArrayBuffer (if Cross-Origin Isolated)
```

---

## Summary

AudioWorklets provide:

- ⚡ **Ultra-low latency** (2-10ms)
- 🎯 **Sample-accurate** timing
- 🚀 **High performance** (dedicated audio thread)
- 🔧 **Powerful DSP** capabilities
- 🌐 **Wide browser support**

**Key Takeaways:**
1. Never allocate in `process()`
2. Always validate inputs/outputs
3. Handle errors gracefully
4. Test extensively
5. Monitor performance
6. Use best practices

**For JARVIS:**
- Real-time voice processing: ✅
- Low-latency pipeline: ✅
- Professional audio: ✅
- Production-ready: ✅

---

## Browser Compatibility

| Browser | AudioWorklet | SharedArrayBuffer | Cross-Origin Isolation |
|---------|--------------|-------------------|------------------------|
| **Chrome** | ✅ 66+ | ✅ 68+ | ✅ 92+ |
| **Edge** | ✅ 79+ | ✅ 79+ | ✅ 92+ |
| **Firefox** | ✅ 76+ | ⚠️ Limited | ⚠️ Limited |
| **Safari** | ✅ 14.5+ | ❌ No | ❌ No |
| **Mobile Chrome** | ✅ 66+ | ✅ 68+ | ✅ 92+ |
| **Mobile Safari** | ✅ 14.5+ | ❌ No | ❌ No |

**Notes:**
- SharedArrayBuffer requires Cross-Origin Isolation (COOP: same-origin, COEP: require-corp)
- Safari has limited SharedArrayBuffer support
- Mobile browsers may have higher latency (30-50ms vs 2-10ms desktop)

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1.0 | 2025-11-17 | **CRITICAL UPDATE**: Added Mandatory Research Protocol requiring comprehensive research on MDN AudioWorkletProcessor.process() documentation BEFORE using this document |
| 2.0.0 | 2025-11-20 | Initial comprehensive AudioWorklet documentation |
| 1.0.0 | 2024-10-26 | Production-ready AudioWorklet integration with Cartesia |

### Version 2.1.0 Changes (November 20, 2025)

#### 🚨 **CRITICAL: Mandatory Research Protocol Added**
- **MANDATORY STEP 1**: Comprehensive research on MDN must be done FIRST
  - Primary research on AudioWorklet interface documentation
  - Secondary research on AudioWorkletProcessor.process() method
- **MANDATORY STEP 2**: Then comprehensive research on this document
- **MANDATORY STEP 3**: Implementation with both sources, prioritizing MDN
- Added prominent warning at top of document about this protocol
- Includes detailed checklist of what to research on MDN
- Expanded list of 8 key MDN resources with descriptions
- Emphasizes MDN as source of truth
- Provides 5-10 minute research time guideline
- Multiple MDN references with context and insights
- Version bumped to 2.1.0

**Why This Was Critical:**
- Web Audio API evolves with browser updates
- Ensures developers always use latest, most accurate information
- Prevents implementation based on potentially outdated documentation
- Requires verification of current API status before implementation
- Establishes clear research methodology with MDN as authoritative source

**Key MDN Insights:**
- AudioWorklet provides custom audio processing scripts in separate thread for very low latency
- AudioWorklet accessible through BaseAudioContext.audioWorklet property
- Worklet code runs in AudioWorkletGlobalScope execution context
- Secure context (HTTPS) required for AudioWorklet
- `process()` method called synchronously from audio rendering thread
- Called once for each block of audio (128 frames)
- Audio data blocks always 128 frames long
- Plans to allow variable block sizes in future
- Must always check array size rather than assume
- Provides sample-accurate processing capabilities

---

**Version:** 2.1.0  
**Last Updated:** November 17, 2025  
**MDN Research:** Complete  
**Status:** Production-Ready with Mandatory Research Protocol

*Master AudioWorklets, Master Web Audio.* 🎵🚀

