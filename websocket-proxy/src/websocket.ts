import WebSocket from 'ws';
import { CartesiaSTTClient, CartesiaTTSClient } from './cartesia.js';
import { N8NClient } from './n8n.js';
import { ClientMessage, ServerMessage, CartesiaSTTMessage } from './types.js';

export class ConversationSession {
  private clientWs: WebSocket;
  private sttClient: CartesiaSTTClient | null = null;
  private ttsClient: CartesiaTTSClient | null = null;
  private n8nClient: N8NClient;
  private conversationId: string;
  private sessionId?: string;
  private isProcessing = false;
  private lastTranscript = '';
  private ttsContextId: string | null = null; // Maintain context for prosody
  private accumulatedAudioChunks: ArrayBuffer[] = []; // For streaming playback

  constructor(
    clientWs: WebSocket,
    conversationId: string,
    cartesiaApiKey: string,
    cartesiaVoiceId: string,
    cartesiaModel: string,
    n8nWebhookUrl: string,
    sessionId?: string
  ) {
    this.clientWs = clientWs;
    this.conversationId = conversationId;
    this.sessionId = sessionId;
    this.n8nClient = new N8NClient(n8nWebhookUrl);

    // Initialize STT client
    this.sttClient = new CartesiaSTTClient(
      cartesiaApiKey,
      (message) => this.handleSTTMessage(message),
      (error) => this.handleError(error)
    );

    // Initialize TTS client
    this.ttsClient = new CartesiaTTSClient(
      cartesiaApiKey,
      cartesiaVoiceId,
      cartesiaModel,
      (audio, flushId) => this.handleTTSAudio(audio, flushId),
      (error) => this.handleError(error),
      (flushId) => {
        console.log('✅ TTS flush completed:', flushId);
      }
    );

    this.setupClientHandlers();
  }

  private setupClientHandlers(): void {
    this.clientWs.on('message', async (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        await this.handleClientMessage(message);
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      }
    });

    this.clientWs.on('close', () => {
      this.cleanup();
    });
  }

  private async handleClientMessage(message: ClientMessage): Promise<void> {
    switch (message.type) {
      case 'start_conversation':
        await this.startConversation();
        break;

      case 'audio_chunk':
        if (message.audio) {
          await this.handleAudioChunk(message.audio);
        }
        break;

      case 'end_audio':
        await this.finalizeSTT();
        break;

      case 'text_input':
        if (message.text) {
          await this.handleTextInput(message.text);
        }
        break;

      case 'cancel':
        this.cancel();
        break;
    }
  }

  private async startConversation(): Promise<void> {
    try {
      // Connect STT and TTS in parallel for optimal latency
      // Pre-established connections eliminate connection overhead per turn (~200ms saved)
      const [sttResult, ttsResult] = await Promise.allSettled([
        this.sttClient!.connect(),
        this.ttsClient!.connect()
      ]);

      // Check if both connections succeeded
      if (sttResult.status === 'rejected') {
        console.error('❌ Failed to connect STT:', sttResult.reason);
        this.handleError(sttResult.reason instanceof Error ? sttResult.reason : new Error(String(sttResult.reason)));
        return;
      }

      if (ttsResult.status === 'rejected') {
        console.error('❌ Failed to connect TTS:', ttsResult.reason);
        this.handleError(ttsResult.reason instanceof Error ? ttsResult.reason : new Error(String(ttsResult.reason)));
        return;
      }

      console.log('✅ Both STT and TTS connections established');
      this.sendToClient({
        type: 'conversation_started',
        conversationId: this.conversationId
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async handleAudioChunk(audio: { data: string; format: string; sampleRate: number }): Promise<void> {
    if (!this.sttClient) {
      console.warn('⚠️ STT client not initialized, cannot process audio chunk');
      return;
    }

    // Verify STT connection is open
    if (!this.sttClient.isConnected()) {
      console.warn('⚠️ STT client not connected, attempting to reconnect...');
      try {
        await this.sttClient.connect();
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
        return;
      }
    }

    try {
      // Decode base64 PCM to Buffer
      // For optimal latency, send chunks immediately as they arrive
      // Don't accumulate - stream directly to Cartesia STT for real-time processing
      const audioBuffer = Buffer.from(audio.data, 'base64');
      
      if (audioBuffer.length === 0) {
        console.warn('⚠️ Received empty audio chunk, skipping');
        return;
      }
      
      // Send immediately without await for lowest latency (fire and forget)
      // This enables true bidirectional flow - user can speak while assistant responds
      this.sttClient.sendAudioChunk(audioBuffer);
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async finalizeSTT(): Promise<void> {
    if (!this.sttClient) return;
    this.sttClient.finalize();
  }

  private handleSTTMessage(message: CartesiaSTTMessage): void {
    if (message.type === 'transcript' && message.text) {
      // Store the latest transcript
      this.lastTranscript = message.text;
      
      // Send partial transcript immediately
      this.sendToClient({
        type: 'transcript',
        conversationId: this.conversationId,
        transcript: message.text,
        isPartial: true // Cartesia sends partial transcripts, then final ones
      });
    } else if (message.type === 'flush_done' || message.type === 'done') {
      // Final transcript - use the last transcript we received
      const finalTranscript = this.lastTranscript;
      if (finalTranscript) {
        // Send final transcript
        this.sendToClient({
          type: 'transcript',
          conversationId: this.conversationId,
          transcript: finalTranscript,
          isPartial: false
        });
        this.processWithN8N(finalTranscript);
        // Clear the transcript
        this.lastTranscript = '';
      }
    }
  }

  private async processWithN8N(transcript: string): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Send transcript to N8N for LLM processing
      // For optimal latency, process asynchronously without blocking
      // This allows STT to continue processing while LLM generates response
      this.n8nClient.sendTranscript(transcript, this.sessionId)
        .then((n8nResponse) => {
          // Send the LLM response text to frontend immediately (before TTS)
          // This allows UI to update while audio is being generated
          if (n8nResponse.message) {
            this.sendToClient({
              type: 'transcript', // Reuse transcript type for assistant message
              conversationId: this.conversationId,
              transcript: n8nResponse.message,
              isPartial: false
            });
            
            // Generate TTS asynchronously for lowest latency
            // Don't await - let chunks stream as they're generated
            this.generateTTS(n8nResponse.message).catch((error) => {
              this.handleError(error instanceof Error ? error : new Error(String(error)));
            });
          }
          this.isProcessing = false;
        })
        .catch((error) => {
          this.handleError(error instanceof Error ? error : new Error(String(error)));
          this.isProcessing = false;
        });
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      this.isProcessing = false;
    }
  }

  private async handleTextInput(text: string): Promise<void> {
    // Direct text input (no STT needed)
    await this.processWithN8N(text);
  }

  private async generateTTS(text: string): Promise<void> {
    if (!this.ttsClient) {
      console.warn('⚠️ TTS client not initialized, cannot generate speech');
      return;
    }

    // Verify TTS connection is open
    if (!this.ttsClient.isConnected()) {
      console.warn('⚠️ TTS client not connected, attempting to reconnect...');
      try {
        await this.ttsClient.connect();
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
        return;
      }
    }

    try {
      // Generate or reuse context ID for maintaining prosody across requests
      if (!this.ttsContextId) {
        this.ttsContextId = `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.ttsClient.setContextId(this.ttsContextId);
      }

      // For optimal latency, split into smaller chunks for streaming
      // This allows audio to start playing while more text is being generated
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      
      // Clear accumulated chunks for new response
      this.accumulatedAudioChunks = [];
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        if (!sentence) continue;

        const isLast = i === sentences.length - 1;
        const continueFlag = !isLast; // Continue if more sentences coming
        const flushFlag = isLast; // Flush on last sentence to finalize
        
        // Generate unique flush ID for tracking
        const flushId = isLast ? `flush-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : undefined;
        
        // Send immediately without await for optimal latency (fire and forget)
        // Audio chunks will arrive asynchronously
        this.ttsClient.generateSpeech(sentence, continueFlag, flushFlag, flushId).catch((error) => {
          this.handleError(error instanceof Error ? error : new Error(String(error)));
        });
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleTTSAudio(audio: ArrayBuffer, flushId?: string): void {
    // For optimal latency, send audio chunks immediately as they arrive
    // Don't accumulate - stream directly to frontend for real-time playback
    const buffer = Buffer.from(audio);
    const base64 = buffer.toString('base64');

    // Send chunk immediately for lowest latency
    this.sendToClient({
      type: 'audio_chunk',
      conversationId: this.conversationId,
      audio: {
        data: base64,
        format: 'pcm_f32le'
      }
    });
    
    // Also accumulate for potential full playback if needed
    this.accumulatedAudioChunks.push(audio);
  }

  private sendToClient(message: ServerMessage): void {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      try {
        this.clientWs.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send message to client:', error);
        // If send fails, the connection is likely broken - cleanup will handle it
      }
    } else {
      console.warn(`⚠️ Cannot send message to client - WebSocket state: ${this.clientWs.readyState}`);
    }
  }

  private handleError(error: Error): void {
    console.error(`❌ Conversation error [${this.conversationId}]:`, error);
    
    // Only send error to client if connection is still open
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.sendToClient({
        type: 'error',
        conversationId: this.conversationId,
        error: error.message
      });
    }
    
    // Reset processing flag on error to allow retry
    this.isProcessing = false;
  }

  private cancel(): void {
    // Cancel both STT and TTS for true bidirectional interruption
    if (this.sttClient) {
      this.sttClient.finalize(); // Stop STT processing
    }
    if (this.ttsClient) {
      this.ttsClient.close(); // Stop TTS generation
    }
    // Clear accumulated chunks
    this.accumulatedAudioChunks = [];
    this.sendToClient({
      type: 'done',
      conversationId: this.conversationId
    });
  }

  private cleanup(): void {
    console.log(`🧹 Cleaning up conversation session: ${this.conversationId}`);
    try {
      if (this.sttClient) {
        this.sttClient.close();
        this.sttClient = null;
      }
    } catch (error) {
      console.error('Error closing STT client:', error);
    }
    
    try {
      if (this.ttsClient) {
        this.ttsClient.close();
        this.ttsClient = null;
      }
    } catch (error) {
      console.error('Error closing TTS client:', error);
    }
    
    // Reset context for next conversation
    this.ttsContextId = null;
    this.accumulatedAudioChunks = [];
    this.isProcessing = false;
    this.lastTranscript = '';
  }
}
