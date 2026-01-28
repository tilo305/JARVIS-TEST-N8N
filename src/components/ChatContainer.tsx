import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { ChatHeader } from './ChatHeader';
import { ChatMessage, Message } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { sendToN8N, normalizeN8NResponse, extractAudioFromResponse, extractTranscriptFromResponse } from '@/api/n8n';
import { fetchCartesiaTts } from '@/api/cartesia';
import type { ConversationStatus } from '@/types/chat';

/** Voice Bot Design S2/S11: Short, clear status and conversational loading text. */
const LOADING_PHRASES = ['One moment, sir.', 'Thinking...', 'Just a moment.'];
/** S16: Friendly, non-blaming error messages (vary wording, don't blame user). */
const FRIENDLY_ERROR_PHRASES = [
  "Let's try that again.",
  "I didn't quite catch that. Please try again.",
  "Something went wrong on my end. Please try again.",
];

// Demo messages for initial state
const initialMessages: Message[] = [
  {
    id: '1',
    content: 'Good evening, sir. I am J.A.R.V.I.S., your personal AI assistant. Speak or type to chat—I support voice in and out. How may I assist you today?',
    role: 'assistant',
    timestamp: new Date(Date.now() - 60000),
  },
];

const STILL_HERE_TEXT = "I'm still here if you need me, sir. Click the microphone button when you're ready to continue.";

export const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [resetToIdle, setResetToIdle] = useState(false);
  const [autoPlayReplies, setAutoPlayReplies] = useState(true);
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserActivityRef = useRef<number>(Date.now());
  const sendAbortRef = useRef<AbortController | null>(null);
  const loadingPhraseIndexRef = useRef(0);
  const errorPhraseIndexRef = useRef(0);
  /** Stable session ID for n8n chat memory / conversation history (see docs/JARVIS-MEMORY-RAG-SUBAGENT-N8N.md). */
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const { speak, stop: stopTts } = useTextToSpeech({ lang: 'en-GB' });
  const [stopPlaybackToken, setStopPlaybackToken] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (
    content: string,
    attachments?: File[],
    audioData?: ArrayBuffer
  ) => {
    console.log('🟢 handleSendMessage called in ChatContainer:', {
      content,
      contentLength: content?.length,
      hasAttachments: !!attachments?.length,
      hasAudio: !!audioData,
      audioSize: audioData?.byteLength,
    });

    const userMessageId = Date.now().toString();
    const userMessage: Message = {
      id: userMessageId,
      content: content || (audioData ? '🎤 Transcribing...' : 'Sent files'),
      role: 'user',
      timestamp: new Date(),
      attachments: attachments?.map((f) => ({ name: f.name, type: f.type })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setConversationStatus('thinking');
    loadingPhraseIndexRef.current += 1;
    const controller = new AbortController();
    sendAbortRef.current = controller;

    try {
      console.log('📤 Calling sendToN8N with:', {
        content,
        contentLength: content?.length,
        attachmentsCount: attachments?.length || 0,
        hasAudio: !!audioData,
      });
      
      const response = await sendToN8N(content, attachments, audioData, {
        signal: controller.signal,
        sessionId: sessionIdRef.current,
      });
      
      console.log('📥 Received response from n8n:', {
        responseType: typeof response,
        isString: typeof response === 'string',
        isObject: typeof response === 'object',
        responseKeys: typeof response === 'object' && response ? Object.keys(response) : null,
      });
      
      // Validate response
      if (!response) {
        throw new Error('Empty response from N8N webhook');
      }
      
      // Extract transcription if audio was sent
      const transcript = audioData ? extractTranscriptFromResponse(response) : null;
      
      // Update user message with transcription if available
      if (transcript) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId
              ? { ...msg, content: transcript }
              : msg
          )
        );
      } else if (audioData && !content) {
        // If no transcript was returned, show a fallback message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId
              ? { ...msg, content: '🎤 Voice message (transcription unavailable)' }
              : msg
          )
        );
      }
      
      const responseMessage = normalizeN8NResponse(response);
      const audioUrl = extractAudioFromResponse(response) ?? undefined;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseMessage,
        role: 'assistant',
        timestamp: new Date(),
        audioUrl,
      };

      // Reset stop token BEFORE adding message so it's ready when message renders
      setStopPlaybackToken(0);
      setMessages((prev) => [...prev, assistantMessage]);
      
      if (audioUrl) {
        console.log('✅ Assistant message with audio added:', { audioUrl: audioUrl.substring(0, 50) + '...' });
      } else {
        console.warn('⚠️ Assistant message added but no audioUrl');
      }
    } catch (error) {
      console.error('Error sending message to N8N:', error);
      
      // S16: Friendly, non-blaming error copy; vary wording on re-prompts
      const friendlyPhrase = FRIENDLY_ERROR_PHRASES[errorPhraseIndexRef.current++ % FRIENDLY_ERROR_PHRASES.length];
      let errorMessage = friendlyPhrase;
      let toastMessage = 'Something went wrong';
      let toastDescription: string | undefined;
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('cancelled') || errorText.includes('request was cancelled')) {
          errorMessage = 'Stopped, sir. Say or type whenever you\'re ready.';
          toastMessage = 'Request cancelled';
        } else if (errorText.includes('timeout') || errorText.includes('abort')) {
          errorMessage = `${friendlyPhrase}\n\nThe request took too long—try again in a moment.`;
          toastMessage = 'Request timeout';
          toastDescription = 'The N8N webhook did not respond in time. Please try again.';
        } else if (errorText.includes('404') || errorText.includes('not found')) {
          if (errorText.includes('test mode') || errorText.includes('Execute workflow')) {
            errorMessage = `${friendlyPhrase}\n\nIn N8N, open the workflow and click "Execute workflow", then try again.`;
            toastMessage = 'Workflow needs activation';
            toastDescription = 'The N8N workflow is in test mode. Click "Execute workflow" in N8N, then try again.';
          } else {
            errorMessage = `${friendlyPhrase}\n\nCheck that the webhook URL is correct and the workflow is active.`;
            toastMessage = 'Webhook not found';
            toastDescription = 'The configured N8N webhook URL is invalid or the workflow is not active.';
          }
        } else if (errorText.includes('401') || errorText.includes('403') || errorText.includes('unauthorized')) {
          errorMessage = `${friendlyPhrase}\n\nCheck webhook authentication.`;
          toastMessage = 'Authentication failed';
          toastDescription = 'The N8N webhook requires authentication. Please verify your credentials.';
        } else if (errorText.includes('500') || errorText.includes('server error')) {
          errorMessage = `${friendlyPhrase}\n\nThe workflow had an issue—try again in a moment.`;
          toastMessage = 'Server error';
          toastDescription = 'The N8N workflow returned an error. Please try again.';
        } else if (errorText.includes('cors')) {
          errorMessage = `${friendlyPhrase}\n\nThe server needs to allow requests from this app (CORS).`;
          toastMessage = 'CORS error';
          toastDescription = 'The n8n server needs CORS headers configured. See console for details.';
        } else if (errorText.includes('network') || errorText.includes('fetch')) {
          errorMessage = `${friendlyPhrase}\n\nCheck your internet connection.`;
          toastMessage = 'Network error';
          toastDescription = 'Unable to connect to the N8N webhook. Check your connection.';
        } else {
          toastDescription = error.message;
        }
      }
      
      toast.error(toastMessage, {
        description: toastDescription,
        duration: 5000,
      });

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        content: errorMessage,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      sendAbortRef.current = null;
      setConversationStatus((prev) => (prev === 'thinking' ? 'idle' : prev));
    }
  };

  const startInactivityTimer = () => {
    // Clear any existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set 10-second timer after assistant finishes speaking
    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏰ 10 seconds of silence after assistant response - sending "still here" message');
      
      const stillHereMessage: Message = {
        id: Date.now().toString(),
        content: STILL_HERE_TEXT,
        role: 'assistant',
        timestamp: new Date(),
        isInactivityPrompt: true,
      };

      setMessages((prev) => [...prev, stillHereMessage]);
      // Reset stop token so "still here" message can play
      setStopPlaybackToken(0);

      // Use Cartesia TTS (same voice ID as N8N) when API key is set; otherwise browser TTS
      fetchCartesiaTts(STILL_HERE_TEXT).then((buf) => {
        if (buf) {
          const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === stillHereMessage.id ? { ...m, audioUrl: url } : m
            )
          );
        } else {
          speak(STILL_HERE_TEXT, stillHereMessage.id);
        }
      });

      // Clear ref so we don't restart the timer; agent responds only once after silence
      inactivityTimerRef.current = null;

      // Reset to idle state - stop any recording and wait for button click
      setResetToIdle(true);
      setTimeout(() => setResetToIdle(false), 100); // Reset flag after triggering
    }, 10000); // 10 seconds
  };

  const cancelInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  /** Bbox: stop assistant TTS when user starts speaking (bi-directional turn-taking). */
  const handleUserStartsSpeaking = () => {
    setStopPlaybackToken((t) => t + 1);
    stopTts();
  };

  // Track user activity to cancel inactivity timer
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      // User sent a message - cancel inactivity timer
      cancelInactivityTimer();
      lastUserActivityRef.current = Date.now();
    }
  }, [messages]);

  // Start inactivity timer when assistant finishes speaking (isLoading becomes false).
  // Only start once per "real" response; never after the "still here" inactivity prompt.
  useEffect(() => {
    if (!isLoading) {
      const lastMessage = messages[messages.length - 1];
      // Only start timer if assistant just finished responding (not the "still here" prompt)
      if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.isInactivityPrompt) {
        // Check if this is a new assistant message (not the initial one)
        const isNewAssistantMessage = lastMessage.id !== initialMessages[0].id;
        if (isNewAssistantMessage) {
          // Small delay to ensure state is stable
          const timer = setTimeout(() => {
            startInactivityTimer();
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isLoading, messages]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  const handleRecordingStateChange = (recording: boolean) => {
    setConversationStatus((prev) =>
      recording ? 'listening' : prev === 'thinking' ? prev : 'idle'
    );
  };

  return (
    <div className="flex flex-col w-[600px] h-[600px] bg-background border border-border rounded-lg shadow-lg overflow-hidden">
      <ChatHeader conversationStatus={conversationStatus} />
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 gradient-metallic relative">
        {/* Background grid pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(hsl(217 91% 60% / 0.3) 1px, transparent 1px),
              linear-gradient(90deg, hsl(217 91% 60% / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            autoPlayAudio={autoPlayReplies}
            stopPlaybackTrigger={stopPlaybackToken}
          />
        ))}
        
        {/* Loading indicator — S11: short, conversational feedback */}
        {isLoading && (
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-arc glow-arc animate-pulse-arc flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="text-muted-foreground font-body animate-pulse">
                {LOADING_PHRASES[loadingPhraseIndexRef.current % LOADING_PHRASES.length]}
              </span>
            </div>
            {/* S17: Allow users to exit/cancel (escape from waiting) */}
            <button
              type="button"
              onClick={() => sendAbortRef.current?.abort()}
              className="text-sm font-body text-muted-foreground hover:text-foreground underline focus:outline-none focus:ring-2 focus:ring-accent rounded px-2 py-1"
            >
              Cancel
            </button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading}
        onUserActivity={cancelInactivityTimer}
        onUserStartsSpeaking={handleUserStartsSpeaking}
        onRecordingStateChange={handleRecordingStateChange}
        resetToIdle={resetToIdle}
      />
    </div>
  );
};
