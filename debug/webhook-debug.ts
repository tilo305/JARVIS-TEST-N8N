/**
 * N8N Webhook Debug Tool
 * Live debugging for webhook connection and response issues
 * 
 * Usage: Import and call debugWebhook() in browser console
 */

// Import will be resolved at runtime - config is in src/lib/config.ts
// Using dynamic import to avoid build-time issues
async function getConfig() {
  if (typeof window !== 'undefined') {
    const mod = await import('../src/lib/config');
    return mod.config;
  }
  return null;
}

export interface WebhookDebugResult {
  url: string;
  reachable: boolean;
  status: number | null;
  statusText: string | null;
  headers: Record<string, string>;
  responseTime: number;
  error: string | null;
  responseBody: any;
  corsAllowed: boolean;
}

export async function debugWebhook(): Promise<WebhookDebugResult> {
  const config = await getConfig();
  if (!config) {
    throw new Error('Config not available (not in browser environment)');
  }

  const startTime = performance.now();
  const result: WebhookDebugResult = {
    url: config.n8nWebhookUrl,
    reachable: false,
    status: null,
    statusText: null,
    headers: {},
    responseTime: 0,
    error: null,
    responseBody: null,
    corsAllowed: true,
  };

  console.group('🔍 N8N Webhook Debug');
  console.log('URL:', result.url);
  console.log('Using proxy:', result.url.startsWith('/api/n8n'));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(result.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        message: 'debug_test',
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    result.responseTime = performance.now() - startTime;
    result.status = response.status;
    result.statusText = response.statusText;
    result.reachable = true;

    // Extract headers
    response.headers.forEach((value, key) => {
      result.headers[key] = value;
    });

    // Check CORS
    const corsHeaders = ['access-control-allow-origin', 'access-control-allow-methods'];
    result.corsAllowed = corsHeaders.some(header => 
      Object.keys(result.headers).some(k => k.toLowerCase() === header)
    );

    // Try to parse response
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      result.responseBody = await response.json();
    } else {
      result.responseBody = await response.text();
    }

    console.log('✅ Webhook is reachable');
    console.log('Status:', result.status, result.statusText);
    console.log('Response Time:', result.responseTime.toFixed(2), 'ms');
    console.log('CORS Allowed:', result.corsAllowed);
    console.log('Headers:', result.headers);
    console.log('Response Body:', result.responseBody);

  } catch (error) {
    result.responseTime = performance.now() - startTime;
    
    if (error instanceof Error) {
      result.error = error.message;
      
      if (error.message.includes('CORS') || error.name === 'TypeError') {
        result.corsAllowed = false;
        console.error('❌ CORS Error:', error.message);
        console.log('💡 Webhook may be reachable but CORS is blocking the request');
        console.log('💡 In development, use the Vite proxy (/api/n8n) to avoid CORS');
      } else if (error.name === 'AbortError') {
        console.error('❌ Request Timeout:', error.message);
      } else {
        console.error('❌ Request Failed:', error.message);
      }
    } else {
      result.error = String(error);
      console.error('❌ Unknown Error:', error);
    }
  }

  console.groupEnd();
  return result;
}

/**
 * Test webhook with audio payload
 */
export async function testWebhookWithAudio(audioData: ArrayBuffer): Promise<WebhookDebugResult> {
  const config = await getConfig();
  if (!config) {
    throw new Error('Config not available (not in browser environment)');
  }

  const startTime = performance.now();
  const result: WebhookDebugResult = {
    url: config.n8nWebhookUrl,
    reachable: false,
    status: null,
    statusText: null,
    headers: {},
    responseTime: 0,
    error: null,
    responseBody: null,
    corsAllowed: true,
  };

  console.group('🔍 N8N Webhook Audio Test');
  console.log('URL:', result.url);
  console.log('Audio Size:', audioData.byteLength, 'bytes');

  try {
    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(audioData);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(result.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        message: '',
        timestamp: new Date().toISOString(),
        audio: {
          format: 'pcm_s16le',
          sampleRate: 16000,
          channels: 1,
          data: base64,
          size: audioData.byteLength,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    result.responseTime = performance.now() - startTime;
    result.status = response.status;
    result.statusText = response.statusText;
    result.reachable = true;

    response.headers.forEach((value, key) => {
      result.headers[key] = value;
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      result.responseBody = await response.json();
    } else {
      result.responseBody = await response.text();
    }

    console.log('✅ Audio webhook test: SUCCESS');
    console.log('Status:', result.status);
    console.log('Response Time:', result.responseTime.toFixed(2), 'ms');
    console.log('Response:', result.responseBody);

  } catch (error) {
    result.responseTime = performance.now() - startTime;
    result.error = error instanceof Error ? error.message : String(error);
    console.error('❌ Audio webhook test: FAILED', error);
  }

  console.groupEnd();
  return result;
}
