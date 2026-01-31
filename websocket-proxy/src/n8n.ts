import fetch from 'node-fetch';
import { N8NResponse } from './types.js';

export class N8NClient {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendTranscript(transcript: string, sessionId?: string): Promise<N8NResponse> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Transcript cannot be empty');
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          text: transcript,
          input: transcript,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
        }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`N8N webhook error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as N8NResponse;
      
      // Validate response has message field
      if (!data.message || typeof data.message !== 'string') {
        console.warn('⚠️ N8N response missing or invalid message field:', data);
        throw new Error('Invalid N8N response: missing message field');
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('N8N webhook request timeout');
      }
      throw error;
    }
  }
}
