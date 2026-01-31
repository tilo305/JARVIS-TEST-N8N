/**
 * JARVIS Debug Tools - Main Entry Point
 * 
 * Comprehensive debugging tools for JARVIS Voice AI
 * Import this in browser console or components for live debugging
 * 
 * Based on zEn DeBuGgEr.md requirements:
 * - Comprehensive research on all issues
 * - LIVE testing and debugging
 * - 100% working fixes
 */

// Core debugging tools
export { debugAudioPlayback, monitorAudioPlayback, testAudioPlayback } from './audio-playback-debug';
export { debugWebhook, testWebhookWithAudio } from './webhook-debug';
export { debugTTS, testTTSVariations } from './tts-debug';
export { debugSiteLoading, monitorSiteLoading, testSiteLoading } from './site-loading-debug';
export { liveDebugAppLoading, tryLoadApp, checkCommonErrors } from './app-not-loading-live-debugger';

// New comprehensive debugging tools
export { debugWebSocket, monitorWebSocket, testWebSocketMessage } from './websocket-debug';
export { 
  startWebSocketLiveDebug, 
  stopWebSocketLiveDebug, 
  getWebSocketStats, 
  getWebSocketErrorLog, 
  clearWebSocketErrorLog, 
  printWebSocketReport 
} from './websocket-live-debugger';
export {
  startConnectionStormDebug,
  stopConnectionStormDebug,
  diagnoseConnectionStorm,
  printConnectionStormReport
} from './websocket-connection-storm-debug';
export { debugAudioRecording, monitorAudioRecording, testAudioRecording } from './audio-recording-debug';
export { debugSTT, testSTTWithAudio } from './stt-debug';
export { debugAudioWorklet, monitorAudioWorklet } from './audioworklet-debug';
export { runMasterDebug, quickHealthCheck } from './master-debug';

/**
 * Make debug tools available globally in browser console
 */
if (typeof window !== 'undefined') {
  interface WindowWithJarvisDebug extends Window {
    jarvisDebug?: {
      // Master comprehensive debug
      master: () => Promise<unknown>;
      quickHealth: () => Promise<unknown>;
      
      // Individual system checks
      audio: () => Promise<void>;
      webhook: () => Promise<unknown>;
      tts: (text?: string) => Promise<unknown>;
      siteLoading: () => Promise<boolean>;
      appNotLoading: () => Promise<unknown>;
      websocket: () => Promise<unknown>;
      audioRecording: () => Promise<unknown>;
      stt: () => Promise<unknown>;
      audioworklet: () => Promise<unknown>;
      
      [key: string]: unknown;
    };
  }
  const win = window as WindowWithJarvisDebug;
  win.jarvisDebug = {
    // Master comprehensive debug
    master: async () => {
      const { runMasterDebug } = await import('./master-debug');
      return runMasterDebug();
    },
    quickHealth: async () => {
      const { quickHealthCheck } = await import('./master-debug');
      return quickHealthCheck();
    },
    
    // Individual system checks
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
    siteLoading: async () => {
      const { debugSiteLoading, testSiteLoading } = await import('./site-loading-debug');
      await debugSiteLoading();
      return testSiteLoading();
    },
    appNotLoading: async () => {
      const { liveDebugAppLoading, tryLoadApp, checkCommonErrors } = await import('./app-not-loading-live-debugger');
      return {
        debug: liveDebugAppLoading,
        tryLoad: tryLoadApp,
        checkErrors: checkCommonErrors,
      };
    },
    websocket: async () => {
      const { debugWebSocket } = await import('./websocket-debug');
      return debugWebSocket();
    },
    websocketLive: async () => {
      const { startWebSocketLiveDebug, stopWebSocketLiveDebug, getWebSocketStats, printWebSocketReport } = await import('./websocket-live-debugger');
      return {
        start: startWebSocketLiveDebug,
        stop: stopWebSocketLiveDebug,
        stats: getWebSocketStats,
        report: printWebSocketReport,
      };
    },
    connectionStorm: async () => {
      const { startConnectionStormDebug, stopConnectionStormDebug, diagnoseConnectionStorm, printConnectionStormReport } = await import('./websocket-connection-storm-debug');
      return {
        start: startConnectionStormDebug,
        stop: stopConnectionStormDebug,
        diagnose: diagnoseConnectionStorm,
        report: printConnectionStormReport,
      };
    },
    audioRecording: async () => {
      const { debugAudioRecording } = await import('./audio-recording-debug');
      return debugAudioRecording();
    },
    stt: async () => {
      const { debugSTT } = await import('./stt-debug');
      return debugSTT();
    },
    audioworklet: async () => {
      const { debugAudioWorklet } = await import('./audioworklet-debug');
      return debugAudioWorklet();
    },
  } as WindowWithJarvisDebug['jarvisDebug'];

  console.log('🔧 JARVIS Debug Tools loaded!');
  console.log('💡 Use window.jarvisDebug.master() for comprehensive system check');
  console.log('💡 Use window.jarvisDebug.quickHealth() for quick health check');
  console.log('💡 Individual checks: .audio(), .webhook(), .tts(), .siteLoading(), .websocket(), .audioRecording(), .stt(), .audioworklet()');
  console.log('🚨 If app not loading: window.jarvisDebug.appNotLoading().then(tools => tools.debug())');
}
