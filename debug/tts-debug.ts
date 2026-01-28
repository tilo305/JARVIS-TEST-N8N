/**
 * Cartesia TTS Debug Tool
 * Live debugging for TTS (Text-to-Speech) issues
 * 
 * Usage: Import and call debugTTS() in browser console
 */

// Dynamic import to avoid build issues
async function getCartesiaTts() {
  if (typeof window !== 'undefined') {
    const mod = await import('../src/api/cartesia');
    return mod.fetchCartesiaTts;
  }
  return null;
}

export interface TTSDebugResult {
  text: string;
  apiKeySet: boolean;
  usingProxy: boolean;
  success: boolean;
  audioSize: number | null;
  error: string | null;
  responseTime: number;
  audioUrl: string | null;
}

export async function debugTTS(text: string = "Hello, this is a test."): Promise<TTSDebugResult> {
  const startTime = performance.now();
  const result: TTSDebugResult = {
    text,
    apiKeySet: false,
    usingProxy: false,
    success: false,
    audioSize: null,
    error: null,
    responseTime: 0,
    audioUrl: null,
  };

  console.group('🔍 Cartesia TTS Debug');
  console.log('Text:', text);
  console.log('Environment:', import.meta.env.DEV ? 'Development' : 'Production');

  // Check API key
  const apiKey = import.meta.env.VITE_CARTESIA_API_KEY || import.meta.env.CARTESIA_API_KEY;
  result.apiKeySet = !!apiKey?.trim();
  result.usingProxy = import.meta.env.DEV;

  console.log('API Key Set:', result.apiKeySet);
  console.log('Using Proxy:', result.usingProxy);

  if (!result.apiKeySet && !result.usingProxy) {
    result.error = 'No API key found and not using proxy';
    result.responseTime = performance.now() - startTime;
    console.error('❌ TTS Debug: No API key and not in dev mode');
    console.groupEnd();
    return result;
  }

  try {
    const fetchCartesiaTts = await getCartesiaTts();
    if (!fetchCartesiaTts) {
      throw new Error('fetchCartesiaTts not available');
    }
    const audioBuffer = await fetchCartesiaTts(text);
    result.responseTime = performance.now() - startTime;

    if (audioBuffer && audioBuffer.byteLength > 0) {
      result.success = true;
      result.audioSize = audioBuffer.byteLength;
      
      // Create blob URL for testing
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      result.audioUrl = URL.createObjectURL(blob);

      console.log('✅ TTS Debug: SUCCESS');
      console.log('Audio Size:', result.audioSize, 'bytes');
      console.log('Response Time:', result.responseTime.toFixed(2), 'ms');
      console.log('Audio URL:', result.audioUrl);

      // Test playback
      const audio = new Audio(result.audioUrl);
      audio.addEventListener('canplay', () => {
        console.log('✅ Audio is ready to play');
        audio.play().then(() => {
          console.log('✅ Audio playback started');
        }).catch((err) => {
          console.warn('⚠️ Audio playback blocked:', err.message);
        });
      });

      audio.addEventListener('error', (e) => {
        console.error('❌ Audio playback error:', e);
      });

      audio.load();

    } else {
      result.error = 'No audio data returned';
      console.error('❌ TTS Debug: No audio data returned');
    }

  } catch (error) {
    result.responseTime = performance.now() - startTime;
    result.error = error instanceof Error ? error.message : String(error);
    console.error('❌ TTS Debug: FAILED', error);
  }

  console.groupEnd();
  return result;
}

/**
 * Test TTS with different texts
 */
export async function testTTSVariations(): Promise<void> {
  const tests = [
    "Short test.",
    "This is a longer test sentence to check if TTS works with more content.",
    "I'm still here if you need me, sir. Click the microphone button when you're ready to continue.",
  ];

  console.group('🧪 TTS Variation Tests');
  
  for (const text of tests) {
    console.log(`\n📝 Testing: "${text}"`);
    await debugTTS(text);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
  }

  console.groupEnd();
}
