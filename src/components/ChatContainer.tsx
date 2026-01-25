import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { ChatHeader } from './ChatHeader';
import { ChatMessage, Message } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { sendToN8N, normalizeN8NResponse } from '@/api/n8n';

// Demo messages for initial state
const initialMessages: Message[] = [
  {
    id: '1',
    content: 'Good evening, sir. I am J.A.R.V.I.S., your personal AI assistant. How may I assist you today?',
    role: 'assistant',
    timestamp: new Date(Date.now() - 60000),
  },
];

export const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [resetToIdle, setResetToIdle] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserActivityRef = useRef<number>(Date.now());

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
    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: content || (audioData ? '🎤 Voice message' : 'Sent files'),
      role: 'user',
      timestamp: new Date(),
      attachments: attachments?.map((f) => ({ name: f.name, type: f.type })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendToN8N(content, attachments, audioData);
      const responseMessage = normalizeN8NResponse(response);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseMessage,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Connection issue. Please try again.', {
        description: error instanceof Error ? error.message : undefined,
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, sir. There seems to be a connection issue. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
        content: "I'm still here if you need me, sir. Click the microphone button when you're ready to continue.",
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, stillHereMessage]);
      
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

  // Track user activity to cancel inactivity timer
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      // User sent a message - cancel inactivity timer
      cancelInactivityTimer();
      lastUserActivityRef.current = Date.now();
    }
  }, [messages]);

  // Start inactivity timer when assistant finishes speaking (isLoading becomes false)
  useEffect(() => {
    if (!isLoading) {
      const lastMessage = messages[messages.length - 1];
      // Only start timer if assistant just finished responding
      if (lastMessage && lastMessage.role === 'assistant') {
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

  return (
    <div className="flex flex-col w-[600px] h-[600px] bg-background border border-border rounded-lg shadow-lg overflow-hidden">
      <ChatHeader />
      
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
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full gradient-arc glow-arc animate-pulse-arc flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
            </div>
            <span className="text-muted-foreground font-body animate-pulse">
              Processing request...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading}
        onUserActivity={cancelInactivityTimer}
        resetToIdle={resetToIdle}
      />
    </div>
  );
};
