/**
 * JARVIS Debug Tools - Main Entry Point
 * 
 * Comprehensive debugging tools for JARVIS Voice AI
 * Import this in browser console or components for live debugging
 */

export { debugAudioPlayback, monitorAudioPlayback, testAudioPlayback } from './audio-playback-debug';
export { debugWebhook, testWebhookWithAudio } from './webhook-debug';
export { debugTTS, testTTSVariations } from './tts-debug';

/**
 * Run all debug checks
 */
export async function runAllDebugChecks() {
  console.group('🔧 JARVIS Comprehensive Debug Check');
  
  // 1. Audio Playback
  console.log('\n1️⃣ Checking Audio Playback...');
  const { debugAudioPlayback } = await import('./audio-playback-debug');
  debugAudioPlayback();

  // 2. Webhook
  console.log('\n2️⃣ Checking N8N Webhook...');
  const { debugWebhook } = await import('./webhook-debug');
  await debugWebhook();

  // 3. TTS
  console.log('\n3️⃣ Checking Cartesia TTS...');
  const { debugTTS } = await import('./tts-debug');
  await debugTTS();

  console.log('\n✅ All debug checks complete');
  console.groupEnd();
}

/**
 * Make debug tools available globally in browser console
 */
if (typeof window !== 'undefined') {
  (window as any).jarvisDebug = {
    runAll: runAllDebugChecks,
    audio: async () => {
      const { debugAudioPlayback, monitorAudioPlayback } = await import('./audio-playback-debug');
      debugAudioPlayback();
      monitorAudioPlayback();
    },
    webhook: async () => {
      const { debugWebhook } = await import('./webhook-debug');
      return debugWebhook();
    },
    tts: async (text?: string) => {
      const { debugTTS } = await import('./tts-debug');
      return debugTTS(text);
    },
  };

  console.log('🔧 JARVIS Debug Tools loaded!');
  console.log('💡 Use window.jarvisDebug.runAll() to run all checks');
  console.log('💡 Or use window.jarvisDebug.audio(), .webhook(), or .tts() individually');
}
