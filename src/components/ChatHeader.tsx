import { Zap, Shield, Wifi, WifiOff, Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationStatus } from '@/types/chat';

interface ChatHeaderProps {
  /** Voice Bot Design S2: show who has the floor (listening / thinking / idle). */
  conversationStatus?: ConversationStatus;
  /** WebSocket connection status */
  isWebSocketConnected?: boolean;
  isWebSocketConnecting?: boolean;
}

export const ChatHeader = ({ 
  conversationStatus = 'idle',
  isWebSocketConnected = false,
  isWebSocketConnecting = false
}: ChatHeaderProps) => {

  return (
    <header className="relative p-4 border-b border-border bg-metallic-dark/90 backdrop-blur-sm overflow-hidden">
      {/* Animated scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-arc to-transparent animate-hud-scan" />
      </div>

      <div className="relative flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          {/* Arc Reactor Icon */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full gradient-arc animate-pulse-arc" />
            <div className="absolute inset-1 rounded-full bg-metallic-dark" />
            <div className="absolute inset-2 rounded-full gradient-arc opacity-80" />
            <Zap className="relative w-5 h-5 text-accent-foreground" />
          </div>

          <div>
            <h1 className="font-display text-xl font-bold tracking-wider text-glow-gold">
              <span className="text-secondary">J.A.R.V.I.S.</span>
            </h1>
            <p className="text-xs text-muted-foreground font-body tracking-wide">
              Just A Rather Very Intelligent System
            </p>
          </div>
        </div>

        {/* Status Indicator — S2: system status clear; conversation state (listening/thinking) */}
        <div className="flex items-center gap-2">
          {conversationStatus !== 'idle' && (
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                conversationStatus === 'listening'
                  ? "bg-accent/20 border-accent/50"
                  : "bg-metallic-mid border-arc/50"
              )}
            >
              {conversationStatus === 'listening' ? (
                <>
                  <Mic className="w-3 h-3 text-accent" />
                  <span className="text-xs font-body text-accent uppercase tracking-wider">
                    Listening
                  </span>
                </>
              ) : (
                <>
                  <Loader2 className="w-3 h-3 text-arc animate-spin" />
                  <span className="text-xs font-body text-muted-foreground uppercase tracking-wider">
                    Thinking…
                  </span>
                </>
              )}
            </div>
          )}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
              isWebSocketConnected
                ? "bg-metallic-mid border-accent/30"
                : "bg-destructive/20 border-destructive/50"
            )}
          >
            {isWebSocketConnecting ? (
              <>
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                <span className="text-xs font-body text-muted-foreground uppercase tracking-wider">
                  Connecting...
                </span>
              </>
            ) : isWebSocketConnected ? (
              <>
                <Wifi className="w-3 h-3 text-accent" />
                <span className="text-xs font-body text-accent uppercase tracking-wider">
                  Connected
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-destructive" />
                <span className="text-xs font-body text-destructive uppercase tracking-wider">
                  Offline
                </span>
              </>
            )}
          </div>
          <div className="p-2 rounded-lg bg-metallic-mid border border-border">
            <Shield className="w-5 h-5 text-secondary" />
          </div>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-accent/50" />
      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-accent/50" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-accent/50" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-accent/50" />
    </header>
  );
};
