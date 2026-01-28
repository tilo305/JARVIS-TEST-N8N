import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { User, Bot, Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: { name: string; type: string }[];
  /** Playable audio URL (blob or http) when N8N returns TTS audio. */
  audioUrl?: string;
  /** True for the "still here" inactivity prompt; we never start the silence timer after this. */
  isInactivityPrompt?: boolean;
}

interface ChatMessageProps {
  message: Message;
  /** Auto-play N8N audio when this message is shown (assistant + audio present). */
  autoPlayAudio?: boolean;
  /** When this value changes and is > 0, stop playback (bbox: user started speaking). */
  stopPlaybackTrigger?: number;
}

export const ChatMessage = ({
  message,
  autoPlayAudio = false,
  stopPlaybackTrigger = 0,
}: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const hasAudio = !isUser && !!message.audioUrl?.trim();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevStopTriggerRef = useRef(0);

  // Bbox: stop assistant TTS when user starts speaking (bi-directional turn-taking)
  // Only stop if trigger actually increased (user interrupted), not on initial mount
  useEffect(() => {
    if (!hasAudio) {
      prevStopTriggerRef.current = stopPlaybackTrigger;
      return;
    }
    // Only stop if trigger increased (user started speaking while audio was playing)
    if (stopPlaybackTrigger > prevStopTriggerRef.current && stopPlaybackTrigger > 0) {
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.currentTime = 0;
        setIsPlaying(false);
      }
    }
    prevStopTriggerRef.current = stopPlaybackTrigger;
  }, [hasAudio, stopPlaybackTrigger]);

  const handlePlayClick = () => {
    if (!hasAudio || !message.audioUrl) return;
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      el.currentTime = 0;
    } else {
      el.play().catch(() => setIsPlaying(false));
    }
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !hasAudio) return;
    const onPlay = () => setIsPlaying(true);
    const onEnded = () => setIsPlaying(false);
    const onPause = () => setIsPlaying(false);
    el.addEventListener('play', onPlay);
    el.addEventListener('ended', onEnded);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('pause', onPause);
    };
  }, [hasAudio, message.audioUrl]);

  // Auto-play when audio is ready
  useEffect(() => {
    if (!hasAudio || !autoPlayAudio || !message.audioUrl) {
      if (hasAudio && !message.audioUrl) {
        console.warn('⚠️ ChatMessage: hasAudio is true but audioUrl is missing');
      }
      return;
    }
    const el = audioRef.current;
    if (!el) {
      console.warn('⚠️ ChatMessage: audio element ref is null');
      return;
    }
    
    console.log('🎵 ChatMessage: Setting up auto-play', { 
      audioUrl: message.audioUrl.substring(0, 50) + '...',
      stopPlaybackTrigger,
      autoPlayAudio 
    });
    
    // Wait for audio to be ready, then play
    const handleCanPlay = () => {
      // Only play if stopPlaybackTrigger is 0 (user hasn't interrupted)
      if (stopPlaybackTrigger === 0) {
        console.log('▶️ ChatMessage: Attempting to play audio');
        el.play().then(() => {
          console.log('✅ ChatMessage: Audio playback started');
        }).catch((err) => {
          console.warn('❌ ChatMessage: Auto-play failed (may be blocked by browser policy):', err);
        });
      } else {
        console.log('⏸️ ChatMessage: Skipping auto-play (stopPlaybackTrigger =', stopPlaybackTrigger, ')');
      }
    };
    
    // If already loaded, play immediately; otherwise wait for canplay
    if (el.readyState >= 2) {
      // Small delay to ensure stopPlaybackTrigger is properly initialized
      setTimeout(handleCanPlay, 100);
    } else {
      el.addEventListener('canplay', handleCanPlay, { once: true });
      // Also try after a timeout in case canplay never fires
      const timeout = setTimeout(() => {
        console.warn('⚠️ ChatMessage: canplay event did not fire, attempting play anyway');
        handleCanPlay();
      }, 2000);
      return () => {
        el.removeEventListener('canplay', handleCanPlay);
        clearTimeout(timeout);
      };
    }
    
    return () => {
      el.removeEventListener('canplay', handleCanPlay);
    };
  }, [hasAudio, autoPlayAudio, message.audioUrl, stopPlaybackTrigger]);

  useEffect(() => {
    return () => {
      if (message.audioUrl?.startsWith('blob:')) {
        try { URL.revokeObjectURL(message.audioUrl); } catch { /* ignore */ }
      }
    };
  }, [message.audioUrl]);

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg transition-all duration-300',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          isUser
            ? 'gradient-stark glow-stark'
            : 'gradient-arc glow-arc animate-pulse-arc'
        )}
      >
        {isUser ? (
          <User className="w-5 h-5 text-primary-foreground" />
        ) : (
          <Bot className="w-5 h-5 text-accent-foreground" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[70%] rounded-lg p-4 hud-border',
          isUser
            ? 'bg-muted/50 border-stark-red/30'
            : 'bg-metallic-mid/50 border-arc/30'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-foreground font-body text-lg leading-relaxed flex-1">
            {message.content}
          </p>
          {hasAudio && (
            <>
              <audio
                ref={audioRef}
                src={message.audioUrl}
                preload="metadata"
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handlePlayClick}
                className={cn(
                  'flex-shrink-0 h-8 w-8 rounded-full transition-all',
                  isPlaying
                    ? 'bg-accent/30 text-accent hover:bg-accent/40'
                    : 'text-muted-foreground hover:text-accent hover:bg-accent/10'
                )}
                title={isPlaying ? 'Stop' : 'Play reply'}
              >
                {isPlaying ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-metallic-light/50 rounded text-muted-foreground"
              >
                📎 {attachment.name}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="block mt-2 text-xs text-muted-foreground font-body">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {isPlaying && (
            <span className="ml-2 text-accent">· Playing...</span>
          )}
        </span>
      </div>
    </div>
  );
};
