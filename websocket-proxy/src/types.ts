// WebSocket message types between frontend and proxy
export interface ClientMessage {
  type: 'start_conversation' | 'audio_chunk' | 'text_input' | 'end_audio' | 'cancel';
  conversationId?: string;
  audio?: {
    data: string; // base64 PCM
    format: string;
    sampleRate: number;
  };
  text?: string;
}

export interface ServerMessage {
  type: 'transcript' | 'audio_chunk' | 'error' | 'conversation_started' | 'done';
  conversationId?: string;
  transcript?: string;
  audio?: {
    data: string; // base64 PCM
    format: string;
  };
  error?: string;
  isPartial?: boolean;
}

// Cartesia WebSocket message types
export interface CartesiaSTTMessage {
  type: 'transcript' | 'flush_done' | 'done' | 'error';
  text?: string;
  words?: Array<{ word: string; start: number; end: number }>;
  language?: string;
  duration?: number;
  error?: string;
}

export interface CartesiaTTSMessage {
  type: 'chunk' | 'done' | 'error' | 'timestamps' | 'flush_done';
  audio?: ArrayBuffer;
  timestamps?: Array<{ word: string; start: number; end: number }>;
  error?: string;
  flush_id?: string;
  step_time?: number;
}

// N8N response type
export interface N8NResponse {
  message: string;
  transcript?: string;
  [key: string]: unknown;
}
