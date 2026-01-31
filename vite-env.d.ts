/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_N8N_WEBHOOK_URL?: string;
  readonly VITE_CARTESIA_API_KEY?: string;
  readonly CARTESIA_API_KEY?: string;
  readonly VITE_CARTESIA_TTS_MODEL?: string;
  readonly CARTESIA_TTS_MODEL?: string;
  readonly VITE_CARTESIA_VOICE_ID?: string;
  readonly CARTESIA_VOICE_ID?: string;
  readonly VITE_CARTESIA_TTS_SPEED?: string;
  readonly CARTESIA_TTS_SPEED?: string;
  readonly DEV?: boolean;
  readonly MODE?: string;
  readonly VITEST?: boolean;
}
