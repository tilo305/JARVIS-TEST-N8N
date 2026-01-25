import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Paperclip, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface FileAttachment {
  file: File;
  preview?: string;
}

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: File[], audioData?: ArrayBuffer) => void;
  isLoading?: boolean;
  onUserActivity?: () => void; // Callback when user becomes active
  resetToIdle?: boolean; // Flag to reset to idle state
}

export const ChatInput = ({ onSendMessage, isLoading, onUserActivity, resetToIdle }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isRecording,
    audioData,
    error: audioError,
    speechActive,
    vadEnabled,
    startRecording,
    stopRecording,
    clearAudioData,
    toggleVAD,
  } = useAudioRecorder({
    silenceThreshold: 0.01,
    silenceDuration: 3000,
    minSpeechDuration: 300,
  });

  // Reset to idle state when "still here" message is sent
  useEffect(() => {
    if (resetToIdle) {
      console.log('🔄 Resetting to idle state - stopping recording and disabling hands-free mode');
      if (isRecording) {
        stopRecording();
      }
      setHandsFreeMode(false);
      clearAudioData();
    }
  }, [resetToIdle, isRecording, stopRecording, clearAudioData]);

  // Auto-send when VAD detects silence and audio is ready
  useEffect(() => {
    if (audioData && !isRecording && !isLoading) {
      console.log('🎤 VAD: Auto-sending audio after silence detection');
      
      // Notify parent of user activity (cancels inactivity timer)
      if (onUserActivity) {
        onUserActivity();
      }
      
      onSendMessage('', undefined, audioData);
      clearAudioData();
      
      // In hands-free mode, automatically restart for continuous conversation
      if (handsFreeMode) {
        setTimeout(async () => {
          console.log('🔄 Hands-free: Restarting recording for next utterance');
          await startRecording(true);
        }, 500);
      }
    }
  }, [audioData, isRecording, handsFreeMode, isLoading, onSendMessage, clearAudioData, startRecording, onUserActivity]);

  const handleSend = () => {
    if (message.trim() || attachments.length > 0 || audioData) {
      // Notify parent of user activity (cancels inactivity timer)
      if (onUserActivity) {
        onUserActivity();
      }
      
      const files = attachments.map((a) => a.file);
      console.log('Sending message:', {
        hasText: !!message.trim(),
        hasAttachments: files.length > 0,
        hasAudio: !!audioData,
        audioSize: audioData?.byteLength,
      });
      onSendMessage(message.trim(), files.length > 0 ? files : undefined, audioData || undefined);
      setMessage('');
      setAttachments([]);
      clearAudioData();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      if (newAttachments[index].preview) {
        URL.revokeObjectURL(newAttachments[index].preview!);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const handleMicClick = async () => {
    if (isRecording) {
      // Manual stop (override VAD auto-finalize)
      console.log('Stopping audio recording manually...');
      await stopRecording();
      // Don't disable hands-free mode - let user control it separately
    } else {
      console.log('Starting audio recording with VAD...');
      
      // Notify parent of user activity (cancels inactivity timer)
      if (onUserActivity) {
        onUserActivity();
      }
      
      // Disable hands-free mode when starting new conversation (after "still here" message)
      setHandsFreeMode(false);
      
      try {
        // Start with VAD enabled - it will auto-finalize on silence
        await startRecording(handsFreeMode);
        console.log('Audio recording started - VAD will auto-detect speech end');
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  const handleHandsFreeToggle = async (enabled: boolean) => {
    setHandsFreeMode(enabled);
    toggleVAD(enabled);
    
    if (enabled && !isRecording) {
      // Start recording in hands-free mode
      try {
        await startRecording(true);
        console.log('🎙️ Hands-free mode activated - speak naturally');
      } catch (error) {
        console.error('Failed to start hands-free mode:', error);
        setHandsFreeMode(false);
      }
    } else if (!enabled && isRecording) {
      // Stop recording when disabling hands-free mode
      await stopRecording();
    }
  };

  return (
    <div className="p-4 border-t border-border bg-metallic-dark/80 backdrop-blur-sm">
      {/* Audio Error Display */}
      {audioError && (
        <div className="mb-2 p-2 bg-destructive/20 border border-destructive/50 rounded-lg text-sm text-destructive">
          {audioError}
        </div>
      )}

      {/* Hands-Free Mode Toggle */}
      <div className="mb-2 flex items-center justify-between p-2 bg-metallic-mid/50 border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <Label htmlFor="hands-free" className="text-sm font-body cursor-pointer">
            Hands-Free Mode
          </Label>
          <Switch
            id="hands-free"
            checked={handsFreeMode}
            onCheckedChange={handleHandsFreeToggle}
            disabled={isLoading}
          />
        </div>
        {vadEnabled && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {speechActive ? (
              <>
                <Volume2 className="w-3 h-3 text-accent" />
                <span className="text-accent">Speaking...</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3" />
                <span>Listening...</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recording Status Indicator */}
      {isRecording && (
        <div className={cn(
          "mb-2 flex items-center gap-2 p-2 rounded-lg",
          speechActive
            ? "bg-accent/20 border border-accent/50" 
            : "bg-stark-red/20 border border-stark-red/50"
        )}>
          <div className={cn(
            "w-3 h-3 rounded-full",
            speechActive ? "bg-accent animate-pulse" : "bg-stark-red animate-pulse"
          )} />
          <span className={cn(
            "text-sm font-body",
            speechActive ? "text-accent" : "text-stark-red"
          )}>
            {speechActive 
              ? "🗣️ You are speaking... (VAD will auto-send on silence)"
              : "🎤 Listening... speak now (VAD active)"
            }
          </span>
        </div>
      )}

      {/* Audio Recording Indicator */}
      {audioData && !isRecording && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-accent/20 border border-accent/50 rounded-lg">
          <div className="w-3 h-3 bg-accent rounded-full" />
          <span className="text-sm text-accent font-body">
            Audio recorded ({Math.round(audioData.byteLength / 1024)}KB) - Ready to send
          </span>
          <button
            onClick={clearAudioData}
            className="ml-auto text-muted-foreground hover:text-foreground"
            title="Clear audio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 px-3 py-2 bg-metallic-mid rounded-lg border border-border"
            >
              {attachment.preview ? (
                <img
                  src={attachment.preview}
                  alt={attachment.file.name}
                  className="w-8 h-8 object-cover rounded"
                />
              ) : (
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground font-body max-w-[100px] truncate">
                {attachment.file.name}
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-destructive-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* File Upload Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 border-border hover:border-secondary hover:bg-secondary/10 transition-all duration-300"
        >
          <Paperclip className="w-5 h-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Mic Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleMicClick}
          className={cn(
            'flex-shrink-0 transition-all duration-300',
            isRecording
              ? 'border-stark-red bg-stark-red/20 animate-recording'
              : 'border-border hover:border-primary hover:bg-primary/10'
          )}
        >
          {isRecording ? (
            <MicOff className="w-5 h-5 text-stark-red" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your message, JARVIS is listening..."
            className="min-h-[50px] max-h-[150px] resize-none bg-metallic-mid border-border focus:border-accent focus:ring-accent/50 font-body text-lg placeholder:text-muted-foreground/50"
            disabled={isLoading}
          />
        </div>

        {/* Send Button */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={isLoading || (!message.trim() && attachments.length === 0 && !audioData)}
          className="flex-shrink-0 gradient-stark hover:opacity-90 glow-stark transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
