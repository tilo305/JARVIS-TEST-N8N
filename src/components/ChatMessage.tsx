import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: { name: string; type: string }[];
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

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
        <p className="text-foreground font-body text-lg leading-relaxed">
          {message.content}
        </p>

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
        </span>
      </div>
    </div>
  );
};
