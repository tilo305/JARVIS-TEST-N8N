/**
 * Audio Playback Debug Tool
 * Live debugging for audio playback issues in JARVIS
 * 
 * Usage: Import and call debugAudioPlayback() in browser console or component
 */

export interface AudioDebugState {
  hasAudio: boolean;
  audioUrl: string | null;
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  readyState: number;
  error: MediaError | null;
  duration: number;
  currentTime: number;
  paused: boolean;
  muted: boolean;
  volume: number;
  playbackRate: number;
  networkState: number;
  canPlay: boolean;
  canPlayThrough: boolean;
}

export function debugAudioPlayback(messageId?: string): AudioDebugState | null {
  if (typeof window === 'undefined') {
    console.error('❌ debugAudioPlayback: Not in browser environment');
    return null;
  }

  // Find audio element(s)
  const audioElements = document.querySelectorAll<HTMLAudioElement>('audio');
  
  if (audioElements.length === 0) {
    console.warn('⚠️ No audio elements found in DOM');
    return null;
  }

  console.log(`🔍 Found ${audioElements.length} audio element(s)`);

  const results: AudioDebugState[] = [];

  audioElements.forEach((el, index) => {
    const state: AudioDebugState = {
      hasAudio: !!el.src,
      audioUrl: el.src || null,
      audioElement: el,
      isPlaying: !el.paused && el.currentTime > 0 && !el.ended,
      readyState: el.readyState,
      error: el.error,
      duration: el.duration,
      currentTime: el.currentTime,
      paused: el.paused,
      muted: el.muted,
      volume: el.volume,
      playbackRate: el.playbackRate,
      networkState: el.networkState,
      canPlay: el.readyState >= 2, // HAVE_CURRENT_DATA
      canPlayThrough: el.readyState >= 4, // HAVE_ENOUGH_DATA
    };

    results.push(state);

    console.group(`🎵 Audio Element #${index + 1}`);
    console.log('URL:', state.audioUrl);
    console.log('Ready State:', getReadyStateName(state.readyState));
    console.log('Network State:', getNetworkStateName(state.networkState));
    console.log('Is Playing:', state.isPlaying);
    console.log('Paused:', state.paused);
    console.log('Duration:', state.duration, 's');
    console.log('Current Time:', state.currentTime, 's');
    console.log('Volume:', state.volume);
    console.log('Muted:', state.muted);
    console.log('Playback Rate:', state.playbackRate);
    
    if (state.error) {
      console.error('❌ Audio Error:', {
        code: state.error.code,
        message: state.error.message,
        codeName: getErrorCodeName(state.error.code),
      });
    } else {
      console.log('✅ No errors');
    }

    // Check autoplay policy
    el.play().then(() => {
      console.log('✅ Autoplay allowed by browser');
      el.pause();
    }).catch((err) => {
      console.warn('⚠️ Autoplay blocked:', err.message);
      console.log('💡 User interaction required to play audio');
    });

    console.groupEnd();
  });

  return results[0] || null;
}

function getReadyStateName(state: number): string {
  const states: Record<number, string> = {
    0: 'HAVE_NOTHING',
    1: 'HAVE_METADATA',
    2: 'HAVE_CURRENT_DATA',
    3: 'HAVE_FUTURE_DATA',
    4: 'HAVE_ENOUGH_DATA',
  };
  return states[state] || `Unknown (${state})`;
}

function getNetworkStateName(state: number): string {
  const states: Record<number, string> = {
    0: 'NETWORK_EMPTY',
    1: 'NETWORK_IDLE',
    2: 'NETWORK_LOADING',
    3: 'NETWORK_NO_SOURCE',
  };
  return states[state] || `Unknown (${state})`;
}

function getErrorCodeName(code: number): string {
  const codes: Record<number, string> = {
    1: 'MEDIA_ERR_ABORTED',
    2: 'MEDIA_ERR_NETWORK',
    3: 'MEDIA_ERR_DECODE',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
  };
  return codes[code] || `Unknown (${code})`;
}

/**
 * Monitor audio playback events in real-time
 */
export function monitorAudioPlayback(callback?: (event: string, data: any) => void) {
  if (typeof window === 'undefined') return;

  const audioElements = document.querySelectorAll<HTMLAudioElement>('audio');
  
  audioElements.forEach((el, index) => {
    const events = ['play', 'pause', 'ended', 'error', 'loadstart', 'loadeddata', 'canplay', 'canplaythrough', 'waiting', 'stalled'];
    
    events.forEach((eventName) => {
      el.addEventListener(eventName, (e) => {
        const log = `🎵 Audio #${index + 1} [${eventName}]`;
        console.log(log, e);
        callback?.(eventName, { element: el, event: e });
      });
    });

    console.log(`✅ Monitoring ${events.length} events on audio element #${index + 1}`);
  });
}

/**
 * Test audio playback programmatically
 */
export async function testAudioPlayback(audioUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(audioUrl);
    
    audio.addEventListener('canplay', () => {
      audio.play()
        .then(() => {
          console.log('✅ Audio playback test: SUCCESS');
          audio.pause();
          resolve(true);
        })
        .catch((err) => {
          console.error('❌ Audio playback test: FAILED', err);
          resolve(false);
        });
    });

    audio.addEventListener('error', (e) => {
      console.error('❌ Audio playback test: ERROR', e);
      resolve(false);
    });

    audio.load();
  });
}
