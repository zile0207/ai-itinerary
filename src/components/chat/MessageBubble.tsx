'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  User, 
  Bot, 
  AlertCircle, 
  Clock, 
  Check, 
  CheckCheck, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Quote
} from 'lucide-react';
import { ChatMessage, ChatSuggestion } from '@/types/chat';
import { MessageActions } from './MessageActions';

interface MessageBubbleProps {
  message: ChatMessage;
  onAction: (action: string, messageId: string, data?: any) => void;
  onSuggestionAction?: (suggestionId: string, action: string, data?: any) => void;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  isLast?: boolean;
  previousMessage?: ChatMessage;
}

export function MessageBubble({
  message,
  onAction,
  onSuggestionAction,
  showAvatar = true,
  showTimestamp = true,
  showActions = true,
  compact = false,
  className,
  isLast = false,
  previousMessage
}: MessageBubbleProps) {
  const [showCitations, setShowCitations] = useState(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  // Determine if we should show the avatar based on message grouping
  const shouldShowAvatar = useMemo(() => {
    if (!showAvatar) return false;
    if (!previousMessage) return true;
    
    // Show avatar if sender changed or if there's a significant time gap
    const timeDiff = message.timestamp.getTime() - previousMessage.timestamp.getTime();
    const significantGap = timeDiff > 5 * 60 * 1000; // 5 minutes
    
    return previousMessage.sender !== message.sender || significantGap;
  }, [showAvatar, previousMessage, message]);

  const toggleSuggestionExpanded = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400 animate-spin" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getMessageBubbleClasses = () => {
    const baseClasses = 'rounded-lg px-4 py-2 max-w-[70%] break-words';
    
    if (message.sender === 'user') {
      return cn(
        baseClasses,
        'bg-blue-600 text-white ml-auto',
        compact ? 'px-3 py-1.5' : 'px-4 py-2'
      );
    } else if (message.sender === 'assistant') {
      return cn(
        baseClasses,
        'bg-gray-100 text-gray-900',
        compact ? 'px-3 py-1.5' : 'px-4 py-2'
      );
    } else {
      // System messages
      return cn(
        baseClasses,
        'bg-yellow-50 text-yellow-800 border border-yellow-200 mx-auto text-center text-sm',
        compact ? 'px-3 py-1.5' : 'px-4 py-2'
      );
    }
  };

  const getAvatarComponent = () => {
    if (!shouldShowAvatar) return null;

    const avatarClasses = 'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0';
    
    if (message.sender === 'user') {
      return (
        <div className={cn(avatarClasses, 'bg-blue-600 text-white')}>
          <User className="w-5 h-5" />
        </div>
      );
    } else if (message.sender === 'assistant') {
      return (
        <div className={cn(avatarClasses, 'bg-gradient-to-br from-purple-500 to-blue-600 text-white')}>
          <Bot className="w-5 h-5" />
        </div>
      );
    }
    
    return null;
  };

  const renderContent = () => {
    if (message.status === 'error') {
      return (
        <div className="text-red-600">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Message failed to send</span>
          </div>
          {message.errorDetails && (
            <div className="text-sm text-red-500">
              {message.errorDetails.message}
            </div>
          )}
          {message.errorDetails?.retryable && (
            <button
              onClick={() => onAction('retry', message.id)}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          )}
        </div>
      );
    }

    // Format message content with basic markdown-like formatting
    const formattedContent = message.content
      .split('\n')
      .map((line, index) => (
        <p key={index} className={index > 0 ? 'mt-2' : ''}>
          {line}
        </p>
      ));

    return <div>{formattedContent}</div>;
  };

  const renderCitations = () => {
    if (!message.citations || message.citations.length === 0) return null;

    return (
      <div className="mt-3 border-t border-gray-200 pt-3">
        <button
          onClick={() => setShowCitations(!showCitations)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <Quote className="w-4 h-4" />
          <span>Sources ({message.citations.length})</span>
          {showCitations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showCitations && (
          <div className="mt-2 space-y-2">
            {message.citations.map((citation, index) => (
              <div key={index} className="flex items-start space-x-2 text-sm">
                <span className="text-gray-400 font-mono">[{index + 1}]</span>
                <a
                  href={citation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline flex items-center space-x-1"
                >
                  <span className="truncate">{citation}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSuggestions = () => {
    if (!message.suggestions || message.suggestions.length === 0) return null;

    return (
      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="flex items-center space-x-2 mb-3">
          <Lightbulb className="w-4 h-4 text-yellow-600" />
          <span className="text-sm font-medium text-gray-700">Suggestions</span>
        </div>
        
        <div className="space-y-2">
          {message.suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              isExpanded={expandedSuggestions.has(suggestion.id)}
              onToggleExpanded={() => toggleSuggestionExpanded(suggestion.id)}
              onAction={(action, data) => onSuggestionAction?.(suggestion.id, action, data)}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderRelatedQuestions = () => {
    if (!message.relatedQuestions || message.relatedQuestions.length === 0) return null;

    return (
      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="text-sm font-medium text-gray-700 mb-2">Related Questions</div>
        <div className="space-y-1">
          {message.relatedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => onAction('ask_question', message.id, { question })}
              className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1 transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMetadata = () => {
    if (!message.metadata) return null;

    return (
      <div className="mt-2 text-xs text-gray-500 space-y-1">
        {message.metadata.model && (
          <div>Model: {message.metadata.model}</div>
        )}
        {message.metadata.confidence && (
          <div>Confidence: {Math.round(message.metadata.confidence * 100)}%</div>
        )}
        {message.metadata.processingTime && (
          <div>Response time: {message.metadata.processingTime}ms</div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'group flex space-x-3 transition-all duration-200',
        message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row',
        message.sender === 'system' ? 'justify-center' : '',
        compact ? 'mb-1' : 'mb-4',
        className
      )}
    >
      {/* Avatar */}
      <div className={cn('flex-shrink-0', !shouldShowAvatar && 'w-8')}>
        {getAvatarComponent()}
      </div>

      {/* Message content */}
      <div className={cn('flex-1', message.sender === 'system' ? 'max-w-md' : '')}>
        {/* Message bubble */}
        <div className={getMessageBubbleClasses()}>
          {renderContent()}
          
          {/* Message status and timestamp */}
          <div className={cn(
            'flex items-center justify-between mt-2',
            message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
          )}>
            {showTimestamp && (
              <div className="text-xs opacity-70">
                {format(message.timestamp, 'HH:mm')}
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              {getStatusIcon()}
              {message.isRetry && (
                <span className="text-xs opacity-70">(Retry)</span>
              )}
            </div>
          </div>
        </div>

        {/* Citations */}
        {renderCitations()}
        
        {/* Suggestions */}
        {renderSuggestions()}
        
        {/* Related questions */}
        {renderRelatedQuestions()}
        
        {/* Metadata (only show in development or for debugging) */}
        {process.env.NODE_ENV === 'development' && renderMetadata()}

        {/* Message actions */}
        {showActions && message.sender !== 'system' && (
          <div className={cn(
            'mt-2',
            message.sender === 'user' ? 'flex justify-end' : 'flex justify-start'
          )}>
            <MessageActions
              message={message}
              onAction={onAction}
              variant="hover"
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Suggestion card component
interface SuggestionCardProps {
  suggestion: ChatSuggestion;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onAction: (action: string, data?: any) => void;
}

function SuggestionCard({
  suggestion,
  isExpanded,
  onToggleExpanded,
  onAction
}: SuggestionCardProps) {
  const getTypeColor = (type: ChatSuggestion['type']) => {
    switch (type) {
      case 'activity':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'restaurant':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'accommodation':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'transportation':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-full border',
              getTypeColor(suggestion.type)
            )}>
              {suggestion.type}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(suggestion.confidence * 100)}% confidence
            </span>
          </div>
          
          <h4 className="font-medium text-gray-900 mb-1">{suggestion.title}</h4>
          
          <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
          
          {isExpanded && suggestion.data && (
            <div className="text-sm text-gray-500 bg-white rounded p-2 mb-2">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {JSON.stringify(suggestion.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <button
          onClick={onToggleExpanded}
          className="text-gray-400 hover:text-gray-600 ml-2"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      
      {/* Suggestion actions */}
      <div className="flex flex-wrap gap-2 mt-2">
        {suggestion.actions.map((action, index) => (
          <button
            key={index}
            onClick={() => onAction(action.type, action.data)}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
} 