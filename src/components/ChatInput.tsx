import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAudioRecorder, type AudioChunkCallback } from '@/hooks/useAudioRecorder';

interface FileAttachment {
  file: File;
  preview?: string;
}

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: File[], audioData?: ArrayBuffer) => void;
  isLoading?: boolean;
  onUserActivity?: () => void;
  /** Bbox: called when user starts recording or speech is detected (stops assistant TTS). */
  onUserStartsSpeaking?: () => void;
  /** Voice Bot Design S2: report recording state so parent can show "Listening" status. */
  onRecordingStateChange?: (isRecording: boolean) => void;
  resetToIdle?: boolean;
  /** Real-time audio streaming callback for optimal latency */
  onAudioChunk?: AudioChunkCallback;
}

export const ChatInput = ({
  onSendMessage,
  isLoading,
  onUserActivity,
  onUserStartsSpeaking,
  onRecordingStateChange,
  resetToIdle,
  onAudioChunk,
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Real-time audio streaming callback - sends chunks immediately for optimal latency
  const onAudioChunkRef = useRef<AudioChunkCallback | null>(null);
  useEffect(() => {
    onAudioChunkRef.current = onAudioChunk || null;
    return () => {
      onAudioChunkRef.current = null;
    };
  }, [onAudioChunk]);

  const {
    isRecording,
    audioData,
    error: audioError,
    speechActive,
    startRecording,
    stopRecording,
    clearAudioData,
  } = useAudioRecorder(
    {
      silenceThreshold: 0.01,
      silenceDuration: 2500,
      minSpeechDuration: 300,
    },
    // Real-time streaming callback - streams chunks immediately as captured
    (audioData, format, sampleRate) => {
      if (onAudioChunkRef.current) {
        onAudioChunkRef.current(audioData, format, sampleRate);
      }
    }
  );

  const prevRecordingRef = useRef(false);
  const prevSpeechRef = useRef(false);
  useEffect(() => {
    if (isRecording && !prevRecordingRef.current) onUserStartsSpeaking?.();
    if (speechActive && !prevSpeechRef.current) onUserStartsSpeaking?.();
    prevRecordingRef.current = isRecording;
    prevSpeechRef.current = speechActive;
  }, [isRecording, speechActive, onUserStartsSpeaking]);

  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

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
    console.log('🔵 handleSend called', {
      message: message,
      messageTrimmed: message.trim(),
      hasAttachments: attachments.length > 0,
      hasAudio: !!audioData,
      onSendMessage: typeof onSendMessage,
    });

    if (message.trim() || attachments.length > 0 || audioData) {
      // Notify parent of user activity (cancels inactivity timer)
      if (onUserActivity) {
        onUserActivity();
      }
      
      const files = attachments.map((a) => a.file);
      const messageToSend = message.trim();
      
      console.log('✅ Sending message to n8n:', {
        hasText: !!messageToSend,
        messageText: messageToSend,
        hasAttachments: files.length > 0,
        hasAudio: !!audioData,
        audioSize: audioData?.byteLength,
      });
      
      try {
        onSendMessage(messageToSend, files.length > 0 ? files : undefined, audioData || undefined);
        console.log('✅ onSendMessage called successfully');
      } catch (error) {
        console.error('❌ Error calling onSendMessage:', error);
      }
      
      setMessage('');
      setAttachments([]);
      clearAudioData();
    } else {
      console.warn('⚠️ handleSend: No content to send (message empty, no attachments, no audio)');
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

  return (
    <div className="p-4 border-t border-border bg-metallic-dark/80 backdrop-blur-sm">
      {/* Audio Error Display - Following Voice Bot Design Principles */}
      {audioError && (
        <div className="mb-2 p-3 bg-destructive/20 border border-destructive/50 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <X className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive mb-2">
                {audioError}
              </p>
              {audioError.toLowerCase().includes('permission') && (
                <div className="text-xs text-destructive/80 space-y-1">
                  <p className="font-medium">How to fix:</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-2">
                    <li>Click the lock icon (🔒) in your browser's address bar</li>
                    <li>Find "Microphone" in the permissions list</li>
                    <li>Change it from "Block" to "Allow"</li>
                    <li>Refresh the page and try again</li>
                  </ol>
                  <p className="mt-1 text-destructive/70">
                    Alternatively, check your system settings to ensure microphone access is enabled for your browser.
                  </p>
                </div>
              )}
              {audioError.toLowerCase().includes('not found') && 
               !audioError.toLowerCase().includes('audioworklet') && 
               !audioError.toLowerCase().includes("couldn't find") && 
               !audioError.toLowerCase().includes('processor') && 
               !audioError.toLowerCase().includes('file') && (
                <p className="text-xs text-destructive/80 mt-1">
                  Please connect a microphone to your device and try again.
                </p>
              )}
              {audioError.toLowerCase().includes('already in use') && (
                <p className="text-xs text-destructive/80 mt-1">
                  Close other applications using your microphone (Zoom, Teams, etc.) and try again.
                </p>
              )}
              {/* Recovery Actions - Following Heuristic #17: Allow Users to Exit from Errors */}
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearAudioData();
                    // Auto-retry after clearing error (following Error Prevention principles)
                    setTimeout(() => {
                      window.location.reload();
                    }, 100);
                  }}
                  className="text-xs h-7"
                >
                  Refresh Page
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAudioData}
                  className="text-xs h-7 text-destructive/70 hover:text-destructive"
                >
                  Dismiss
                </Button>
              </div>
              
              {/* Contextual Help - Following Heuristic #16: Use Normal Language */}
              {audioError.toLowerCase().includes('audioworklet') || 
               audioError.toLowerCase().includes("couldn't") || 
               audioError.toLowerCase().includes("can't") ? (
                <div className="text-xs text-destructive/80 space-y-1 mt-2 pt-2 border-t border-destructive/20">
                  <p className="font-medium">Quick fixes to try:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    {audioError.toLowerCase().includes('not found') || audioError.toLowerCase().includes("couldn't find") ? (
                      <>
                        <li>Make sure the development server is running</li>
                        <li>Try refreshing the page</li>
                      </>
                    ) : audioError.toLowerCase().includes('not supported') || audioError.toLowerCase().includes("doesn't support") ? (
                      <>
                        <li>Update your browser to the latest version</li>
                        <li>Try Chrome, Firefox, Edge, or Safari</li>
                      </>
                    ) : audioError.toLowerCase().includes('secure') || audioError.toLowerCase().includes("isn't secure") ? (
                      <>
                        <li>Use HTTPS or access via localhost</li>
                        <li>Check the address bar for the connection type</li>
                      </>
                    ) : (
                      <>
                        <li>Refresh the page (this usually fixes it)</li>
                        <li>Check that your browser supports voice features</li>
                        <li>Make sure the server is running</li>
                      </>
                    )}
                  </ul>
                </div>
              ) : null}
            </div>
            <button
              onClick={clearAudioData}
              className="flex-shrink-0 text-destructive/70 hover:text-destructive transition-colors"
              title="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
          onClick={(e) => {
            console.log('🔴 Send button clicked!', {
              message: message,
              messageTrimmed: message.trim(),
              isLoading,
              hasAttachments: attachments.length > 0,
              hasAudio: !!audioData,
              isDisabled: isLoading || (!message.trim() && attachments.length === 0 && !audioData),
            });
            handleSend();
          }}
          disabled={isLoading || (!message.trim() && attachments.length === 0 && !audioData)}
          className="flex-shrink-0 gradient-stark hover:opacity-90 glow-stark transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isLoading ? 'Processing...' : (!message.trim() && attachments.length === 0 && !audioData) ? 'Enter a message to send' : 'Send message'}
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
