import WebSocket from 'ws';
import { CartesiaSTTMessage, CartesiaTTSMessage } from './types.js';

const CARTESIA_BASE_URL = 'wss://api.cartesia.ai';
const CARTESIA_VERSION = '2025-04-16';

export class CartesiaSTTClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private onTranscript: (message: CartesiaSTTMessage) => void;
  private onError: (error: Error) => void;

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  constructor(
    apiKey: string,
    onTranscript: (message: CartesiaSTTMessage) => void,
    onError: (error: Error) => void
  ) {
    this.apiKey = apiKey;
    this.onTranscript = onTranscript;
    this.onError = onError;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Don't reconnect if already connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('✅ Cartesia STT WebSocket already connected');
        resolve();
        return;
      }

      // Close existing connection if in closing/closed state
      if (this.ws) {
        try {
          this.ws.close();
        } catch (error) {
          // Ignore errors when closing
        }
        this.ws = null;
      }

      const url = new URL(`${CARTESIA_BASE_URL}/stt/websocket`);
      url.searchParams.set('api_key', this.apiKey);
      url.searchParams.set('cartesia_version', CARTESIA_VERSION);
      url.searchParams.set('model', 'ink-whisper');
      url.searchParams.set('language', 'en');
      url.searchParams.set('encoding', 'pcm_s16le');
      url.searchParams.set('sample_rate', '16000');

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          this.ws.close();
          const error = new Error('Cartesia STT WebSocket connection timeout');
          this.onError(error);
          reject(error);
        }
      }, 10000); // 10 second timeout

      this.ws = new WebSocket(url.toString());

      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Cartesia STT WebSocket connected');
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message: CartesiaSTTMessage = JSON.parse(data.toString());
          this.onTranscript(message);
        } catch (error) {
          this.onError(error instanceof Error ? error : new Error(String(error)));
        }
      });

      this.ws.on('error', (error: Error) => {
        clearTimeout(connectionTimeout);
        this.onError(error);
        reject(error);
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        clearTimeout(connectionTimeout);
        const reasonStr = reason.toString();
        console.log(`🔌 Cartesia STT WebSocket closed (code: ${code}${reasonStr ? `, reason: ${reasonStr}` : ''})`);
        this.ws = null;
      });
    });
  }

  sendAudioChunk(audioData: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('STT WebSocket not connected');
    }
    this.ws.send(audioData);
  }

  finalize(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(JSON.stringify({ type: 'finalize' }));
  }

  close(): void {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'done' }));
      this.ws.close();
      this.ws = null;
    }
  }
}

export class CartesiaTTSClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private voiceId: string;
  private model: string;
  private contextId: string | null = null;
  private onAudioChunk: (audio: ArrayBuffer, flushId?: string) => void;
  private onError: (error: Error) => void;
  private onFlushDone?: (flushId: string) => void;

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  constructor(
    apiKey: string,
    voiceId: string,
    model: string,
    onAudioChunk: (audio: ArrayBuffer, flushId?: string) => void,
    onError: (error: Error) => void,
    onFlushDone?: (flushId: string) => void
  ) {
    this.apiKey = apiKey;
    this.voiceId = voiceId;
    this.model = model;
    this.onAudioChunk = onAudioChunk;
    this.onError = onError;
    this.onFlushDone = onFlushDone;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Don't reconnect if already connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('✅ Cartesia TTS WebSocket already connected');
        resolve();
        return;
      }

      // Close existing connection if in closing/closed state
      if (this.ws) {
        try {
          this.ws.close();
        } catch (error) {
          // Ignore errors when closing
        }
        this.ws = null;
      }

      const url = new URL(`${CARTESIA_BASE_URL}/tts/websocket`);
      url.searchParams.set('api_key', this.apiKey);
      url.searchParams.set('cartesia_version', CARTESIA_VERSION);

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          this.ws.close();
          const error = new Error('Cartesia TTS WebSocket connection timeout');
          this.onError(error);
          reject(error);
        }
      }, 10000); // 10 second timeout

      this.ws = new WebSocket(url.toString());

      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Cartesia TTS WebSocket connected');
        // Note: Configuration is sent with each generate request per Cartesia API
        // Connection is ready, resolve immediately for optimal latency
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          // Check if it's JSON (control message) or binary (audio chunk)
          const firstByte = data[0];
          if (firstByte === 0x7B) { // '{' - JSON message
            const message: CartesiaTTSMessage = JSON.parse(data.toString());
            if (message.type === 'error') {
              this.onError(new Error(message.error || 'TTS error'));
            } else if (message.type === 'flush_done' && message.flush_id) {
              // Flush completed - notify callback if provided
              this.onFlushDone?.(message.flush_id);
            }
          } else {
            // Binary audio chunk - pass through immediately
            // Convert Buffer to ArrayBuffer (properly handle Buffer to ArrayBuffer conversion)
            // Buffer.buffer can be ArrayBuffer or SharedArrayBuffer, ensure we get ArrayBuffer
            const buffer = data.buffer;
            let arrayBuffer: ArrayBuffer;
            if (buffer instanceof ArrayBuffer) {
              arrayBuffer = buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            } else {
              // SharedArrayBuffer or other - create new ArrayBuffer
              arrayBuffer = new Uint8Array(data).buffer;
            }
            this.onAudioChunk(arrayBuffer);
          }
        } catch (error) {
          this.onError(error instanceof Error ? error : new Error(String(error)));
        }
      });

      this.ws.on('error', (error: Error) => {
        clearTimeout(connectionTimeout);
        this.onError(error);
        reject(error);
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        clearTimeout(connectionTimeout);
        const reasonStr = reason.toString();
        console.log(`🔌 Cartesia TTS WebSocket closed (code: ${code}${reasonStr ? `, reason: ${reasonStr}` : ''})`);
        this.ws = null;
        this.contextId = null;
      });
    });
  }

  async generateSpeech(
    text: string, 
    continueFlag: boolean = false, 
    flushFlag: boolean = false,
    flushId?: string
  ): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('TTS WebSocket not connected');
    }

    // Build message according to Cartesia WebSocket TTS API
    interface CartesiaTTSRequest {
      model_id: string;
      transcript: string;
      voice: { mode: 'id'; id: string };
      output_format: {
        container: 'raw';
        encoding: 'pcm_f32le';
        sample_rate: number;
      };
      language: string;
      continue: boolean;
      flush: boolean;
      context_id?: string;
      flush_id?: string;
    }

    const message: CartesiaTTSRequest = {
      model_id: this.model,
      transcript: text,
      voice: { mode: 'id', id: this.voiceId },
      output_format: {
        container: 'raw',
        encoding: 'pcm_f32le',
        sample_rate: 24000
      },
      language: 'en',
      continue: continueFlag,
      flush: flushFlag
    };

    if (this.contextId) {
      message.context_id = this.contextId;
    }

    if (flushId) {
      message.flush_id = flushId;
    }

    this.ws.send(JSON.stringify(message));
  }

  setContextId(contextId: string): void {
    this.contextId = contextId;
  }

  close(): void {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'done' }));
      this.ws.close();
      this.ws = null;
      this.contextId = null;
    }
  }
}
