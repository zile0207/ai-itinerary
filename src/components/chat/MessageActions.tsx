'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Copy, 
  RotateCcw, 
  ThumbsUp, 
  ThumbsDown, 
  Share, 
  MoreHorizontal,
  Check,
  Edit,
  Trash2,
  Flag
} from 'lucide-react';
import { ChatMessage } from '@/types/chat';

interface MessageActionsProps {
  message: ChatMessage;
  onAction: (action: string, messageId: string, data?: any) => void;
  variant?: 'inline' | 'hover' | 'always';
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
  showLabels?: boolean;
}

export function MessageActions({
  message,
  onAction,
  variant = 'hover',
  size = 'sm',
  className,
  disabled = false,
  showLabels = false
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      onAction('copy', message.id);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setDisliked(false);
    onAction('like', message.id, { liked: !liked });
  };

  const handleDislike = () => {
    setDisliked(!disliked);
    setLiked(false);
    onAction('dislike', message.id, { disliked: !disliked });
  };

  const handleRetry = () => {
    onAction('retry', message.id);
  };

  const handleShare = () => {
    onAction('share', message.id);
  };

  const handleEdit = () => {
    onAction('edit', message.id);
  };

  const handleDelete = () => {
    onAction('delete', message.id);
  };

  const handleReport = () => {
    onAction('report', message.id);
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const buttonSize = size === 'sm' ? 'p-1' : 'p-1.5';
  
  const baseButtonClasses = cn(
    'rounded-md hover:bg-gray-100 transition-colors duration-200 text-gray-500 hover:text-gray-700',
    buttonSize,
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
  );

  const visibilityClasses = {
    inline: 'opacity-100',
    hover: 'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
    always: 'opacity-100'
  };

  const primaryActions = [
    {
      icon: copied ? Check : Copy,
      label: copied ? 'Copied!' : 'Copy',
      onClick: handleCopy,
      show: true,
      color: copied ? 'text-green-600' : undefined
    },
    {
      icon: ThumbsUp,
      label: 'Like',
      onClick: handleLike,
      show: message.sender === 'assistant',
      color: liked ? 'text-blue-600' : undefined,
      active: liked
    },
    {
      icon: ThumbsDown,
      label: 'Dislike',
      onClick: handleDislike,
      show: message.sender === 'assistant',
      color: disliked ? 'text-red-600' : undefined,
      active: disliked
    },
    {
      icon: RotateCcw,
      label: 'Retry',
      onClick: handleRetry,
      show: message.sender === 'assistant' && message.status === 'error',
      color: undefined
    }
  ];

  const secondaryActions = [
    {
      icon: Edit,
      label: 'Edit',
      onClick: handleEdit,
      show: message.sender === 'user'
    },
    {
      icon: Share,
      label: 'Share',
      onClick: handleShare,
      show: true
    },
    {
      icon: Flag,
      label: 'Report',
      onClick: handleReport,
      show: message.sender === 'assistant'
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: handleDelete,
      show: true,
      destructive: true
    }
  ];

  const visiblePrimaryActions = primaryActions.filter(action => action.show);
  const visibleSecondaryActions = secondaryActions.filter(action => action.show);

  return (
    <div className={cn(
      'flex items-center space-x-1',
      visibilityClasses[variant],
      className
    )}>
      {/* Primary actions - always visible in the main bar */}
      {visiblePrimaryActions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className={cn(
            baseButtonClasses,
            action.color,
            action.active && 'bg-gray-100'
          )}
          title={action.label}
          disabled={disabled}
        >
          <action.icon className={iconSize} />
          {showLabels && (
            <span className="ml-1 text-xs">{action.label}</span>
          )}
        </button>
      ))}

      {/* More actions dropdown */}
      {visibleSecondaryActions.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowMore(!showMore)}
            className={baseButtonClasses}
            title="More actions"
            disabled={disabled}
          >
            <MoreHorizontal className={iconSize} />
          </button>

          {showMore && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMore(false)}
              />
              
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                {visibleSecondaryActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick();
                      setShowMore(false);
                    }}
                    className={cn(
                      'flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors',
                      action.destructive && 'text-red-600 hover:bg-red-50'
                    )}
                    disabled={disabled}
                  >
                    <action.icon className="w-4 h-4 mr-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified action bar for mobile
interface CompactMessageActionsProps {
  message: ChatMessage;
  onAction: (action: string, messageId: string, data?: any) => void;
  className?: string;
}

export function CompactMessageActions({
  message,
  onAction,
  className
}: CompactMessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      onAction('copy', message.id);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleLike = () => {
    onAction('like', message.id);
  };

  const handleRetry = () => {
    onAction('retry', message.id);
  };

  return (
    <div className={cn('flex items-center space-x-2 mt-2', className)}>
      <button
        onClick={handleCopy}
        className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
      
      {message.sender === 'assistant' && (
        <button
          onClick={handleLike}
          className="flex items-center space-x-1 text-xs text-gray-500 hover:text-blue-600"
        >
          <ThumbsUp className="w-3 h-3" />
          <span>Like</span>
        </button>
      )}
      
      {message.sender === 'assistant' && message.status === 'error' && (
        <button
          onClick={handleRetry}
          className="flex items-center space-x-1 text-xs text-gray-500 hover:text-orange-600"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

// Floating action button for quick actions
interface FloatingMessageActionProps {
  message: ChatMessage;
  onAction: (action: string, messageId: string, data?: any) => void;
  className?: string;
}

export function FloatingMessageAction({
  message,
  onAction,
  className
}: FloatingMessageActionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Copy, label: 'Copy', action: 'copy' },
    { icon: ThumbsUp, label: 'Like', action: 'like', show: message.sender === 'assistant' },
    { icon: RotateCcw, label: 'Retry', action: 'retry', show: message.status === 'error' },
    { icon: Share, label: 'Share', action: 'share' }
  ].filter(action => action.show !== false);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md hover:shadow-lg transition-shadow duration-200 flex items-center justify-center"
      >
        <MoreHorizontal className="w-4 h-4 text-gray-600" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 min-w-[120px]">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  onAction(action.action, message.id);
                  setIsOpen(false);
                }}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 