'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  X, 
  Image, 
  FileText, 
  Link,
  Smile
} from 'lucide-react';
import { ChatAttachment } from '@/types/chat';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: ChatAttachment[]) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showAttachments?: boolean;
  showVoiceInput?: boolean;
  showEmojis?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function ChatInput({
  onSendMessage,
  onTyping,
  placeholder = "Ask about your itinerary or share a link...",
  disabled = false,
  maxLength = 2000,
  showAttachments = true,
  showVoiceInput = false,
  showEmojis = false,
  className,
  autoFocus = false
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Typing indicator
  const handleTyping = useCallback(() => {
    if (!onTyping) return;
    
    onTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1000);
  }, [onTyping]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      handleTyping();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return;
      } else {
        // Send message with Enter
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && attachments.length === 0) return;
    if (disabled) return;

    onSendMessage(trimmedMessage, attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);
    
    // Stop typing indicator
    if (onTyping) {
      onTyping(false);
    }
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const attachment: ChatAttachment = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        name: file.name,
        url: URL.createObjectURL(file),
        data: file,
        status: 'ready'
      };
      
      setAttachments(prev => [...prev, attachment]);
    });

    // Reset file input
    e.target.value = '';
  };

  const handleUrlAttachment = () => {
    const url = prompt('Enter a URL:');
    if (!url) return;

    try {
      new URL(url); // Validate URL
      const attachment: ChatAttachment = {
        id: `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'url',
        name: url,
        url: url,
        status: 'ready'
      };
      
      setAttachments(prev => [...prev, attachment]);
    } catch (error) {
      alert('Please enter a valid URL');
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === attachmentId);
      if (attachment?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter(a => a.id !== attachmentId);
    });
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // TODO: Implement actual voice recording
    } else {
      // Start recording
      setIsRecording(true);
      // TODO: Implement actual voice recording
    }
  };

  const getAttachmentIcon = (type: ChatAttachment['type']) => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'url':
        return <Link className="w-4 h-4" />;
      default:
        return <Paperclip className="w-4 h-4" />;
    }
  };

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <div className={cn('border border-gray-200 rounded-lg bg-white', className)}>
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center space-x-2 bg-gray-100 rounded-md px-3 py-2 text-sm"
              >
                {getAttachmentIcon(attachment.type)}
                <span className="truncate max-w-[200px]" title={attachment.name}>
                  {attachment.name}
                </span>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end space-x-2 p-4">
        {/* Attachment button */}
        {showAttachments && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            
            {/* Quick attachment options */}
            <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Paperclip className="w-4 h-4" />
                <span>Upload file</span>
              </button>
              <button
                onClick={handleUrlAttachment}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Link className="w-4 h-4" />
                <span>Add URL</span>
              </button>
            </div>
          </div>
        )}

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full min-h-[40px] max-h-[120px] resize-none border-0 outline-none bg-transparent text-gray-900 placeholder-gray-500 disabled:opacity-50"
            rows={1}
          />
          
          {/* Character counter */}
          {maxLength && message.length > maxLength * 0.8 && (
            <div className="absolute bottom-1 right-1 text-xs text-gray-400">
              {message.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Voice input button */}
        {showVoiceInput && (
          <button
            onClick={handleVoiceToggle}
            disabled={disabled}
            className={cn(
              'p-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
              isRecording 
                ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            )}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}

        {/* Emoji button */}
        {showEmojis && (
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={disabled}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            
            {/* Simple emoji picker */}
            {showEmojiPicker && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowEmojiPicker(false)}
                />
                <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20">
                  <div className="grid grid-cols-6 gap-2">
                    {['😀', '😊', '😍', '🤔', '😅', '😎', '👍', '👎', '❤️', '🎉', '🔥', '✈️'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setMessage(prev => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="w-8 h-8 text-lg hover:bg-gray-100 rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'p-2 rounded-md transition-colors duration-200',
            canSend
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Shortcuts help */}
      <div className="px-4 pb-2 text-xs text-gray-400">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}

// Simplified compact input for mobile
interface CompactChatInputProps {
  onSendMessage: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CompactChatInput({
  onSendMessage,
  placeholder = "Ask something...",
  disabled = false,
  className
}: CompactChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('flex items-center space-x-2 p-2 border border-gray-200 rounded-lg bg-white', className)}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 border-0 outline-none bg-transparent text-gray-900 placeholder-gray-500 disabled:opacity-50"
      />
      
      <button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        className={cn(
          'p-1.5 rounded-md transition-colors duration-200',
          message.trim() && !disabled
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        )}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
} 