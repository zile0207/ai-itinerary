'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  MessageCircle, 
  X, 
  Settings, 
  Trash2, 
  Download,
  Upload,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { ChatMessage, ChatContext, ChatConfig, ChatSession, ChatAttachment } from '@/types/chat';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatStorage } from '@/lib/chat/storage';

const chatStorage = ChatStorage.getInstance();

interface ChatInterfaceProps {
  itinerary?: any; // Current itinerary data for context
  className?: string;
  position?: 'sidebar' | 'modal' | 'inline';
  onClose?: () => void;
  onSuggestionApplied?: (suggestion: any) => void;
  autoFocus?: boolean;
}

export function ChatInterface({
  itinerary,
  className,
  position = 'sidebar',
  onClose,
  onSuggestionApplied,
  autoFocus = true
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [config, setConfig] = useState<ChatConfig>({
    maxMessageHistory: 100,
    enableTypingIndicators: true,
    enableSuggestions: true,
    enableCitations: true,
    autoScrollEnabled: true,
    soundEnabled: false,
    maxAttachmentSize: 10 * 1024 * 1024, // 10MB
    allowedAttachmentTypes: ['image/*', '.pdf', '.doc', '.docx', '.txt']
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Initialize session and load previous messages
  useEffect(() => {
    initializeSession();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (config.autoScrollEnabled) {
      scrollToBottom();
    }
  }, [messages, config.autoScrollEnabled]);

  // Update session context when itinerary changes
  useEffect(() => {
    if (currentSession && itinerary) {
      const updatedContext: Partial<ChatContext> = {
        itinerary,
        itineraryId: itinerary.id
      };
      
      const updatedSession = {
        ...currentSession,
        context: { ...currentSession.context, ...updatedContext },
        lastActivity: new Date()
      };
      
      setCurrentSession(updatedSession);
      chatStorage.saveSession(updatedSession);
      chatStorage.saveContext(updatedSession.id, updatedSession.context as ChatContext);
    }
  }, [itinerary, currentSession]);

  const initializeSession = () => {
    // Try to get current session or create a new one
    let session = chatStorage.getCurrentSession();
    
    if (!session) {
      session = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'current_user', // TODO: Get from auth context
        startedAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        context: {
          sessionId: '',
          conversationHistory: [],
          itinerary,
          itineraryId: itinerary?.id
        },
        settings: config
      };
      
      session.context.sessionId = session.id;
      chatStorage.setCurrentSession(session);
      chatStorage.saveSession(session);
    }
    
    setCurrentSession(session);
    
    // Load messages for this session
    const sessionMessages = chatStorage.getMessages(session.id);
    setMessages(sessionMessages);

    // Load saved config
    const savedConfig = chatStorage.getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const generateMessageId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      
      // Save to storage
      if (currentSession) {
        chatStorage.addMessage(currentSession.id, message);
        
        // Update session
        const updatedSession = {
          ...currentSession,
          lastActivity: new Date(),
          messageCount: newMessages.length
        };
        setCurrentSession(updatedSession);
        chatStorage.saveSession(updatedSession);
      }
      
      return newMessages;
    });
  };

  const updateMessage = (messageId: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => {
      const newMessages = prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      
      // Save to storage
      if (currentSession) {
        chatStorage.updateMessage(currentSession.id, messageId, updates);
      }
      
      return newMessages;
    });
  };

  const handleSendMessage = async (content: string, attachments?: ChatAttachment[]) => {
    if (!content.trim() && !attachments?.length) return;
    
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      attachments
    };

    addMessage(userMessage);
    setIsLoading(true);

    try {
      // Prepare context for AI
      const context = {
        itinerary,
        conversationHistory: messages.slice(-10), // Last 10 messages for context
        currentQuery: content,
        attachments
      };

      // Check if message contains URLs
      const urls = extractUrls(content);
      let externalContent = null;
      
      if (urls.length > 0 || attachments?.some(a => a.type === 'url')) {
        // Process external content (placeholder for now)
        externalContent = { urls, attachments: attachments?.filter(a => a.type === 'url') };
      }

      // Simulate AI response (replace with actual AI service call)
      const aiResponse = await simulateAIResponse(content, context, externalContent);
      
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        content: aiResponse.content,
        sender: 'assistant',
        timestamp: new Date(),
        status: 'delivered',
        metadata: {
          model: aiResponse.model,
          confidence: aiResponse.confidence,
          processingTime: aiResponse.processingTime,
          tokens: aiResponse.tokenUsage.total
        },
        suggestions: aiResponse.suggestions,
        citations: aiResponse.citations,
        relatedQuestions: aiResponse.relatedQuestions
      };

      addMessage(assistantMessage);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'error',
        errorDetails: {
          code: 'AI_RESPONSE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true
        }
      };

      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageAction = (action: string, messageId: string, data?: any) => {
    switch (action) {
      case 'retry':
        const message = messages.find(m => m.id === messageId);
        if (message?.sender === 'user') {
          handleSendMessage(message.content, message.attachments);
        }
        break;
        
      case 'copy':
        // Already handled in MessageActions component
        break;
        
      case 'like':
      case 'dislike':
        // TODO: Send feedback to analytics
        console.log(`User ${action}d message ${messageId}`, data);
        break;
        
      case 'ask_question':
        if (data?.question) {
          handleSendMessage(data.question);
        }
        break;
        
      case 'share':
        // TODO: Implement sharing functionality
        break;
        
      case 'delete':
        setMessages(prev => prev.filter(m => m.id !== messageId));
        if (currentSession) {
          chatStorage.deleteMessage(currentSession.id, messageId);
        }
        break;
    }
  };

  const handleSuggestionAction = (suggestionId: string, action: string, data?: any) => {
    // Handle suggestion actions (add to itinerary, get more info, etc.)
    console.log('Suggestion action:', { suggestionId, action, data });
    
    if (action === 'add_to_itinerary' && onSuggestionApplied) {
      onSuggestionApplied(data);
    }
  };

  const clearChat = () => {
    if (currentSession && window.confirm('Are you sure you want to clear this chat?')) {
      setMessages([]);
      chatStorage.clearMessages(currentSession.id);
      
      // Add system message
      const systemMessage: ChatMessage = {
        id: generateMessageId(),
        content: 'Chat cleared',
        sender: 'system',
        timestamp: new Date(),
        status: 'delivered'
      };
      
      addMessage(systemMessage);
    }
  };

  const exportChat = () => {
    if (!currentSession) return;
    
    const chatData = chatStorage.exportChatData();
    const blob = new Blob([chatData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importChat = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        const success = chatStorage.importChatData(data);
        
        if (success) {
          // Reload the interface
          initializeSession();
          alert('Chat data imported successfully');
        } else {
          alert('Failed to import chat data');
        }
      } catch (error) {
        alert('Invalid chat data file');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const getContainerClasses = () => {
    const baseClasses = 'flex flex-col bg-white border border-gray-200 shadow-lg';
    
    switch (position) {
      case 'modal':
        return cn(
          baseClasses,
          'fixed inset-4 md:inset-8 lg:inset-16 rounded-lg z-50',
          isMinimized && 'h-16'
        );
      case 'sidebar':
        return cn(
          baseClasses,
          'w-80 h-full',
          isMinimized && 'h-16'
        );
      case 'inline':
      default:
        return cn(
          baseClasses,
          'w-full h-96 rounded-lg',
          isMinimized && 'h-16'
        );
    }
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center space-x-3">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        <div>
          <h3 className="font-medium text-gray-900">AI Assistant</h3>
          {currentSession && (
            <p className="text-xs text-gray-500">
              {messages.length} messages
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          title={isMinimized ? 'Maximize' : 'Minimize'}
        >
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderSettings = () => {
    if (!showSettings) return null;
    
    return (
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Auto-scroll</span>
            <button
              onClick={() => setConfig(prev => ({ ...prev, autoScrollEnabled: !prev.autoScrollEnabled }))}
              className={cn(
                'w-10 h-6 rounded-full transition-colors duration-200',
                config.autoScrollEnabled ? 'bg-blue-600' : 'bg-gray-300'
              )}
            >
              <div className={cn(
                'w-4 h-4 bg-white rounded-full transition-transform duration-200',
                config.autoScrollEnabled ? 'translate-x-4' : 'translate-x-1'
              )} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Citations</span>
            <button
              onClick={() => setConfig(prev => ({ ...prev, enableCitations: !prev.enableCitations }))}
              className={cn(
                'w-10 h-6 rounded-full transition-colors duration-200',
                config.enableCitations ? 'bg-blue-600' : 'bg-gray-300'
              )}
            >
              <div className={cn(
                'w-4 h-4 bg-white rounded-full transition-transform duration-200',
                config.enableCitations ? 'translate-x-4' : 'translate-x-1'
              )} />
            </button>
          </div>
          
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
            <button
              onClick={clearChat}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Chat</span>
            </button>
            
            <button
              onClick={exportChat}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            <label className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={importChat}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    );
  };

  if (isMinimized) {
    return (
      <div className={cn(getContainerClasses(), className)}>
        {renderHeader()}
      </div>
    );
  }

  return (
    <div className={cn(getContainerClasses(), className)}>
      {renderHeader()}
      {renderSettings()}
      
      {/* Messages area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Welcome to AI Assistant</p>
            <p className="text-sm">Ask questions about your itinerary or share links for analysis.</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                onAction={handleMessageAction}
                onSuggestionAction={handleSuggestionAction}
                previousMessage={index > 0 ? messages[index - 1] : undefined}
                isLast={index === messages.length - 1}
              />
            ))}
            
            {isLoading && (
              <TypingIndicator 
                label="AI is thinking..."
                variant="dots"
              />
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        <ChatInput
          onSendMessage={handleSendMessage}
          onTyping={setIsTyping}
          disabled={isLoading}
          autoFocus={autoFocus}
          showAttachments={true}
          showEmojis={true}
        />
      </div>
    </div>
  );
}

// Helper functions
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.match(urlRegex) || [];
}

// Simulate AI response (replace with actual AI service integration)
async function simulateAIResponse(content: string, context: any, externalContent: any) {
  // This is a placeholder - replace with actual Perplexity AI integration
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  return {
    content: `I understand you're asking about "${content}". Based on your itinerary context, here's what I can help you with...`,
    model: 'llama-3.1-sonar-small-128k-online',
    confidence: 0.85,
    processingTime: 1500,
    tokenUsage: {
      input: 100,
      output: 150,
      total: 250
    },
    suggestions: [],
    citations: externalContent?.urls || [],
    relatedQuestions: [
      'Tell me more about this destination',
      'What are the best activities nearby?',
      'How much should I budget for this?'
    ]
  };
} 