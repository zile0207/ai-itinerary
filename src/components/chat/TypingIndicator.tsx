'use client';

import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dots' | 'wave' | 'pulse';
  label?: string;
  showAvatar?: boolean;
  avatarUrl?: string;
}

export function TypingIndicator({
  className,
  size = 'md',
  variant = 'dots',
  label = 'AI is typing...',
  showAvatar = true,
  avatarUrl
}: TypingIndicatorProps) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2'
  };

  const containerSizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  };

  const renderDotsAnimation = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            'bg-gray-500 rounded-full animate-bounce',
            sizeClasses[size]
          )}
          style={{
            animationDelay: `${index * 0.15}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const renderWaveAnimation = () => (
    <div className="flex space-x-0.5">
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className={cn(
            'bg-gray-500 rounded-sm animate-pulse',
            size === 'sm' ? 'w-0.5' : size === 'md' ? 'w-1' : 'w-1.5'
          )}
          style={{
            height: `${8 + Math.sin(index) * 4}px`,
            animationDelay: `${index * 0.1}s`,
            animationDuration: '1.2s'
          }}
        />
      ))}
    </div>
  );

  const renderPulseAnimation = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            'bg-gray-500 rounded-full',
            sizeClasses[size]
          )}
          style={{
            animation: `pulse 1.5s infinite ${index * 0.2}s`
          }}
        />
      ))}
    </div>
  );

  const getAnimation = () => {
    switch (variant) {
      case 'wave':
        return renderWaveAnimation();
      case 'pulse':
        return renderPulseAnimation();
      default:
        return renderDotsAnimation();
    }
  };

  return (
    <div className={cn('flex items-start space-x-3 max-w-xs', className)}>
      {showAvatar && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="AI Assistant"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            )}
          </div>
        </div>
      )}
      
      <div className={cn(
        'bg-gray-100 rounded-lg rounded-tl-none flex flex-col',
        containerSizeClasses[size]
      )}>
        <div className="flex items-center justify-center min-w-[60px]">
          {getAnimation()}
        </div>
        {label && (
          <div className="text-xs text-gray-500 mt-1 text-center">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced typing indicator with user info
interface MultiUserTypingIndicatorProps {
  typingUsers: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  className?: string;
  maxDisplayUsers?: number;
}

export function MultiUserTypingIndicator({
  typingUsers,
  className,
  maxDisplayUsers = 3
}: MultiUserTypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const displayUsers = typingUsers.slice(0, maxDisplayUsers);
  const remainingCount = typingUsers.length - maxDisplayUsers;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    } else if (typingUsers.length <= maxDisplayUsers) {
      const names = typingUsers.slice(0, -1).map(u => u.name).join(', ');
      const lastName = typingUsers[typingUsers.length - 1].name;
      return `${names}, and ${lastName} are typing...`;
    } else {
      return `${displayUsers[0].name} and ${remainingCount + 1} others are typing...`;
    }
  };

  return (
    <div className={cn('flex items-center space-x-2 p-3 text-sm text-gray-600', className)}>
      <div className="flex -space-x-1">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium"
            title={user.name}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-xs font-medium text-white">
            +{remainingCount}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <span>{getTypingText()}</span>
        <div className="flex space-x-1">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
              style={{
                animationDelay: `${index * 0.15}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 