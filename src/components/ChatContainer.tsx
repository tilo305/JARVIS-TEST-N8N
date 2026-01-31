import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { ChatHeader } from './ChatHeader';
import { ChatMessage, Message } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useWebSocketVoice } from '@/hooks/useWebSocketVoice';
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
    id: crypto.randomUUID(),
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
  
  // WebSocket hook for voice communication
  const currentTranscriptRef = useRef<string>('');
  const currentUserMessageIdRef = useRef<string | null>(null);
  const currentAssistantMessageIdRef = useRef<string | null>(null);
  const waitingForAssistantRef = useRef<boolean>(false);
  
  const {
    isConnected: isWebSocketConnected,
    isConnecting: isWebSocketConnecting,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    sendAudioChunk,
    endAudio,
    sendText,
    cancel: cancelWebSocket
  } = useWebSocketVoice({
    sessionId: sessionIdRef.current,
    onTranscript: (text, isPartial) => {
      // Ensure text is a string
      const transcriptText = text || '';
      
      if (isPartial) {
        // Partial transcript - always user input (STT)
        if (currentUserMessageIdRef.current) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentUserMessageIdRef.current
                ? { ...msg, content: transcriptText || '🎤 Transcribing...' }
                : msg
            )
          );
        }
        currentTranscriptRef.current = transcriptText;
      } else {
        // Final transcript - could be user (STT final) or assistant (N8N response)
        if (waitingForAssistantRef.current && currentAssistantMessageIdRef.current) {
          // This is the assistant response from N8N
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentAssistantMessageIdRef.current
                ? { ...msg, content: transcriptText }
                : msg
            )
          );
          waitingForAssistantRef.current = false;
          setIsLoading(false);
          setConversationStatus('idle');
        } else if (currentUserMessageIdRef.current) {
          // This is the final user transcript (STT)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentUserMessageIdRef.current
                ? { ...msg, content: transcriptText }
                : msg
            )
          );
          currentTranscriptRef.current = transcriptText;
          // Now we're waiting for assistant response
          waitingForAssistantRef.current = true;
        }
      }
    },
    onAudioChunk: (audioData) => {
      // Audio chunks are handled by the WebSocket hook internally
      // We can add additional handling here if needed
    },
    onError: (error) => {
      // Ensure error is a string
      const errorMessage = error || 'Unknown WebSocket error';
      
      // Only log if it's not a connection timeout (those are handled by the hook)
      if (typeof errorMessage === 'string' && 
          !errorMessage.includes('timeout') && 
          !errorMessage.includes('connection failed after multiple attempts')) {
        console.error('WebSocket error:', errorMessage);
      }
      
      // Only show toast for non-reconnection errors to avoid spam
      if (typeof errorMessage === 'string' && 
          !errorMessage.includes('connection failed after multiple attempts')) {
        toast.error('Connection error', {
          description: errorMessage,
          duration: 5000,
        });
      }
      
      // Only add error message if we're actually in a loading state
      // This prevents duplicate error messages from reconnection attempts
      if (isLoading || waitingForAssistantRef.current) {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          content: FRIENDLY_ERROR_PHRASES[errorPhraseIndexRef.current++ % FRIENDLY_ERROR_PHRASES.length],
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setIsLoading(false);
        setConversationStatus('idle');
        waitingForAssistantRef.current = false;
      }
    }
  });
  
  // Connect WebSocket on mount - with timeout to prevent hanging
  // Use refs to avoid dependency issues that cause reconnection loops
  const connectWebSocketRef = useRef(connectWebSocket);
  const disconnectWebSocketRef = useRef(disconnectWebSocket);
  
  // Update refs when functions change (but don't trigger re-run)
  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket;
    disconnectWebSocketRef.current = disconnectWebSocket;
  }, [connectWebSocket, disconnectWebSocket]);
  
  useEffect(() => {
    // Delay connection slightly to ensure component is fully mounted
    const connectTimer = setTimeout(() => {
      connectWebSocketRef.current().catch((error) => {
        // WebSocket connection is optional - don't block page load
        console.warn('WebSocket connection failed (this is optional):', error);
      });
    }, 100);
    
    return () => {
      clearTimeout(connectTimer);
      // Only disconnect on unmount, not on every render
      disconnectWebSocketRef.current();
    };
    // Empty deps - only run on mount/unmount
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Safeguard: Ensure all messages have unique IDs and filter out any duplicates
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    const unique: Message[] = [];
    for (const msg of messages) {
      // Ensure message has a valid UUID-style ID, regenerate if it looks like a timestamp
      let msgId = msg.id;
      let messageToAdd = msg;
      
      if (!msgId || /^\d+$/.test(msgId)) {
        // If ID is missing or looks like a timestamp (all digits), regenerate it
        console.warn(`⚠️ Message with invalid/timestamp ID detected: ${msgId}, regenerating UUID`);
        msgId = crypto.randomUUID();
        messageToAdd = { ...msg, id: msgId };
      }
      
      if (!seen.has(msgId)) {
        seen.add(msgId);
        unique.push(messageToAdd);
      } else {
        console.warn(`⚠️ Duplicate message ID detected: ${msgId}, skipping duplicate`);
      }
    }
    return unique;
  }, [messages]);

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
      isWebSocketConnected,
    });

    // Validate that we have something to send
    const hasContent = content && content.trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;
    const hasAudio = !!audioData;
    
    if (!hasContent && !hasAttachments && !hasAudio) {
      console.warn('⚠️ handleSendMessage: No content to send');
      return;
    }

    if (!isWebSocketConnected) {
      toast.error('Not connected', {
        description: 'WebSocket is not connected. Please wait for connection.',
        duration: 5000,
      });
      return;
    }

    const userMessageId = crypto.randomUUID();
    currentUserMessageIdRef.current = userMessageId;
    
    const userMessage: Message = {
      id: userMessageId,
      content: content?.trim() || (audioData ? '🎤 Transcribing...' : hasAttachments ? 'Sent files' : 'Message'),
      role: 'user',
      timestamp: new Date(),
      attachments: attachments?.map((f) => ({ name: f.name, type: f.type })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setConversationStatus('thinking');
    loadingPhraseIndexRef.current += 1;

    try {
      if (audioData) {
        // Audio chunks are already being streamed in real-time via onAudioChunk callback
        // This audioData is the final accumulated buffer from VAD - just finalize STT
        // Don't resend chunks that were already streamed for optimal latency
        endAudio();
      } else if (hasContent) {
        // Send text via WebSocket
        sendText(content.trim());
      } else if (hasAttachments) {
        // For attachments, we might want to send a notification or handle differently
        // For now, just create the assistant placeholder
        console.log('📎 Sending attachments via WebSocket (if supported)');
      }
      
      // Create assistant message placeholder - will be updated by WebSocket callbacks
      const assistantMessageId = crypto.randomUUID();
      currentAssistantMessageIdRef.current = assistantMessageId;
      waitingForAssistantRef.current = true;
      
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: LOADING_PHRASES[loadingPhraseIndexRef.current % LOADING_PHRASES.length],
        role: 'assistant',
        timestamp: new Date(),
      };

      setStopPlaybackToken(0);
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Note: Transcript and audio will be updated via WebSocket callbacks
      // The WebSocket hook handles audio playback internally
    } catch (error) {
      console.error('Error sending message via WebSocket:', error);
      
      const friendlyPhrase = FRIENDLY_ERROR_PHRASES[errorPhraseIndexRef.current++ % FRIENDLY_ERROR_PHRASES.length];
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        content: friendlyPhrase,
        role: 'assistant',
        timestamp: new Date(),
      };

      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to send message',
        duration: 5000,
      });

      setMessages((prev) => [...prev, errorMsg]);
      setIsLoading(false);
      setConversationStatus('idle');
    }
  };

  const startInactivityTimer = useCallback(() => {
    // Clear any existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set 10-second timer after assistant finishes speaking
    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏰ 10 seconds of silence after assistant response - sending "still here" message');
      
      const stillHereMessage: Message = {
        id: crypto.randomUUID(),
        content: STILL_HERE_TEXT,
        role: 'assistant',
        timestamp: new Date(),
        isInactivityPrompt: true,
      };

      setMessages((prev) => [...prev, stillHereMessage]);
      // Reset stop token so "still here" message can play
      setStopPlaybackToken(0);

      // Use browser TTS for "still here" message
      speak(STILL_HERE_TEXT, stillHereMessage.id);

      // Clear ref so we don't restart the timer; agent responds only once after silence
      inactivityTimerRef.current = null;

      // Reset to idle state - stop any recording and wait for button click
      setResetToIdle(true);
      setTimeout(() => setResetToIdle(false), 100); // Reset flag after triggering
    }, 10000); // 10 seconds
  }, [setMessages, setStopPlaybackToken, speak, setResetToIdle]);

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
        // Safely check initialMessages array to avoid potential errors
        const isNewAssistantMessage = initialMessages.length > 0 
          ? lastMessage.id !== initialMessages[0].id 
          : true;
        if (isNewAssistantMessage) {
          // Small delay to ensure state is stable
          const timer = setTimeout(() => {
            startInactivityTimer();
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isLoading, messages, startInactivityTimer]);

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
      <ChatHeader 
        conversationStatus={conversationStatus}
        isWebSocketConnected={isWebSocketConnected}
        isWebSocketConnecting={isWebSocketConnecting}
      />
      
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
        
        {uniqueMessages.map((message) => (
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
              onClick={() => {
                cancelWebSocket();
                setIsLoading(false);
                setConversationStatus('idle');
              }}
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
        onAudioChunk={(audioData, format, sampleRate) => {
          // Real-time streaming: send audio chunks immediately as they're captured
          // This enables true bidirectional flow with minimal latency
          // Chunks are sent continuously during recording (not after silence)
          if (isWebSocketConnected) {
            sendAudioChunk(audioData, format, sampleRate);
          } else {
            console.warn('WebSocket not connected, audio chunk dropped');
          }
        }}
      />
    </div>
  );
};
