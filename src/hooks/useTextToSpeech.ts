import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseTextToSpeechOptions {
  /** Voice rate (0.1–10). Default 1. */
  rate?: number;
  /** Voice pitch (0–2). Default 1. */
  pitch?: number;
  /** Volume (0–1). Default 1. */
  volume?: number;
  /** Prefer a voice with this language (e.g. 'en-US'). */
  lang?: string;
}

export interface UseTextToSpeechReturn {
  speak: (text: string, messageId?: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  /** ID of the message currently being spoken, if any. */
  speakingMessageId: string | null;
  /** Whether the Web Speech API is supported. */
  supported: boolean;
  error: string | null;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const rate = options.rate ?? 1;
  const pitch = options.pitch ?? 1;
  const volume = options.volume ?? 1;
  const lang = options.lang ?? 'en-US';

  const stop = useCallback(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingMessageId(null);
    currentMessageIdRef.current = null;
    setError(null);
  }, [supported]);

  const pause = useCallback(() => {
    if (!supported || !isSpeaking) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [supported, isSpeaking]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, messageId?: string) => {
      if (!supported) {
        setError('Text-to-speech is not supported in this browser.');
        return;
      }
      if (!text?.trim()) return;

      stop(); // Cancel any current speech

      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.lang = lang;

      const voices = synth.getVoices();
      const preferred = voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('natural'));
      const en = voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
      else if (en) utterance.voice = en;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setSpeakingMessageId(messageId ?? null);
        currentMessageIdRef.current = messageId ?? null;
        setError(null);
      };

      utterance.onend = () => {
        if (currentMessageIdRef.current === (messageId ?? null)) {
          setIsSpeaking(false);
          setIsPaused(false);
          setSpeakingMessageId(null);
          currentMessageIdRef.current = null;
        }
      };

      utterance.onerror = (e) => {
        if (e.error === 'interrupted') return;
        setError(e.error ?? 'Speech synthesis failed.');
        setIsSpeaking(false);
        setIsPaused(false);
        setSpeakingMessageId(null);
        currentMessageIdRef.current = null;
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    },
    [supported, rate, pitch, volume, lang, stop]
  );

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (synth.getVoices().length === 0) {
      const onVoicesChanged = () => {
        synth.removeEventListener('voiceschanged', onVoicesChanged);
      };
      synth.addEventListener('voiceschanged', onVoicesChanged);
    }
    synthRef.current = synth;
    return () => {
      synth.cancel();
    };
  }, [supported]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    speakingMessageId,
    supported,
    error,
  };
}
