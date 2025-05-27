'use client';

import { useState, useRef, useEffect } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Share,
  Star,
  StarOff,
  Calendar,
  Navigation,
  Phone,
  Globe,
  Camera,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ItineraryActivity } from './TimelineView';
import { MapLocation } from './GoogleMap';

export type ActivityCardVariant = 'default' | 'compact' | 'detailed' | 'timeline' | 'kanban';
export type ActivityCardSize = 'sm' | 'md' | 'lg';

interface ActivityCardProps {
  activity: ItineraryActivity;
  variant?: ActivityCardVariant;
  size?: ActivityCardSize;
  selected?: boolean;
  draggable?: boolean;
  showDate?: boolean;
  showDuration?: boolean;
  showActions?: boolean;
  showStatus?: boolean;
  showLocation?: boolean;
  showCost?: boolean;
  showParticipants?: boolean;
  onClick?: (activity: ItineraryActivity) => void;
  onEdit?: (activity: ItineraryActivity) => void;
  onDelete?: (activityId: string) => void;
  onDuplicate?: (activity: ItineraryActivity) => void;
  onShare?: (activity: ItineraryActivity) => void;
  onFavorite?: (activityId: string, isFavorite: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ActivityCard({
  activity,
  variant = 'default',
  size = 'md',
  selected = false,
  draggable = false,
  showDate = false,
  showDuration = true,
  showActions = true,
  showStatus = true,
  showLocation = true,
  showCost = true,
  showParticipants = true,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
  onFavorite,
  className,
  style
}: ActivityCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCardClick = () => {
    if (onClick) {
      onClick(activity);
    }
  };

  const handleMenuAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    onFavorite?.(activity.id, newFavoriteState);
  };

  const duration = differenceInMinutes(parseISO(activity.endTime), parseISO(activity.startTime));

  // Render based on variant
  switch (variant) {
    case 'compact':
      return <CompactActivityCard {...{ activity, selected, onClick: handleCardClick, className, style }} />;
    case 'detailed':
      return <DetailedActivityCard {...{ activity, selected, showActions, onEdit, onDelete, onDuplicate, onShare, className, style }} />;
    case 'timeline':
      return <TimelineActivityCard {...{ activity, selected, onClick: handleCardClick, className, style }} />;
    case 'kanban':
      return <KanbanActivityCard {...{ activity, selected, showDate, onClick: handleCardClick, onEdit, onDelete, className, style }} />;
    default:
      break;
  }

  // Default card implementation
  const cardSizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4',
    lg: 'p-6 text-lg'
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer',
        'border-l-4',
        getActivityStatusBorderColor(activity.status),
        selected && 'ring-2 ring-blue-500',
        draggable && 'cursor-move',
        cardSizeClasses[size],
        className
      )}
      style={style}
      onClick={handleCardClick}
      draggable={draggable}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getActivityTypeIcon(activity.type)}</span>
            <h3 className="font-medium text-gray-900 truncate">{activity.title}</h3>
            {isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
          </div>

          {/* Time and Duration */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {format(parseISO(activity.startTime), 'h:mm a')} - 
                {format(parseISO(activity.endTime), 'h:mm a')}
              </span>
            </div>
            
            {showDuration && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {duration}m
              </span>
            )}
          </div>

          {/* Date (if showing) */}
          {showDate && (
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
              <Calendar className="h-4 w-4" />
              <span>{format(parseISO(activity.startTime), 'MMM d, yyyy')}</span>
            </div>
          )}

          {/* Location */}
          {showLocation && activity.location && (
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2 truncate">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{activity.location.name}</span>
            </div>
          )}

          {/* Description */}
          {activity.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{activity.description}</p>
          )}

          {/* Additional Info */}
          <div className="flex items-center gap-4 mb-3">
            {showParticipants && activity.participants && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{activity.participants}</span>
              </div>
            )}
            
            {showCost && activity.cost && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span>{activity.cost} {activity.currency || 'USD'}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              getActivityTypeColor(activity.type)
            )}>
              {activity.type}
            </span>
            
            {showStatus && (
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                getActivityStatusColor(activity.status)
              )}>
                {getActivityStatusIcon(activity.status)}
                <span className="ml-1">{activity.status}</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-start gap-1 ml-4">
            <button
              onClick={handleFavoriteToggle}
              className="p-1 text-gray-400 hover:text-yellow-500 rounded"
            >
              {isFavorite ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-md shadow-lg border z-20">
                  <div className="py-1">
                    {onEdit && (
                      <button
                        onClick={() => handleMenuAction(() => onEdit(activity))}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                    
                    {onDuplicate && (
                      <button
                        onClick={() => handleMenuAction(() => onDuplicate(activity))}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </button>
                    )}
                    
                    {onShare && (
                      <button
                        onClick={() => handleMenuAction(() => onShare(activity))}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Share className="h-4 w-4" />
                        Share
                      </button>
                    )}
                    
                    <div className="border-t border-gray-100 my-1" />
                    
                    {onDelete && (
                      <button
                        onClick={() => handleMenuAction(() => onDelete(activity.id))}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact Activity Card
function CompactActivityCard({ 
  activity, 
  selected, 
  onClick, 
  className, 
  style 
}: {
  activity: ItineraryActivity;
  selected: boolean;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-md border-l-4 p-2 cursor-pointer hover:shadow-sm transition-shadow',
        getActivityStatusBorderColor(activity.status),
        selected && 'ring-1 ring-blue-500',
        className
      )}
      style={style}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{getActivityTypeIcon(activity.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{activity.title}</div>
          <div className="text-xs text-gray-600">
            {format(parseISO(activity.startTime), 'h:mm a')}
          </div>
        </div>
      </div>
    </div>
  );
}

// Detailed Activity Card
function DetailedActivityCard({ 
  activity, 
  selected, 
  showActions, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onShare, 
  className, 
  style 
}: {
  activity: ItineraryActivity;
  selected: boolean;
  showActions: boolean;
  onEdit?: (activity: ItineraryActivity) => void;
  onDelete?: (activityId: string) => void;
  onDuplicate?: (activity: ItineraryActivity) => void;
  onShare?: (activity: ItineraryActivity) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border shadow-sm p-6',
        'border-l-4',
        getActivityStatusBorderColor(activity.status),
        selected && 'ring-2 ring-blue-500',
        className
      )}
      style={style}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getActivityTypeIcon(activity.type)}</span>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{activity.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                getActivityTypeColor(activity.type)
              )}>
                {activity.type}
              </span>
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                getActivityStatusColor(activity.status)
              )}>
                {getActivityStatusIcon(activity.status)}
                <span className="ml-1">{activity.status}</span>
              </span>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(activity)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(activity)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
            {onShare && (
              <button
                onClick={() => onShare(activity)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <Share className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(activity.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {activity.description && (
        <p className="text-gray-600 mb-4">{activity.description}</p>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Time */}
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">Time</div>
            <div className="text-sm text-gray-600">
              {format(parseISO(activity.startTime), 'h:mm a')} - 
              {format(parseISO(activity.endTime), 'h:mm a')}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">Location</div>
            <div className="text-sm text-gray-600">{activity.location.name}</div>
            <div className="text-xs text-gray-500">{activity.location.address}</div>
          </div>
        </div>

        {/* Participants */}
        {activity.participants && (
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">Participants</div>
              <div className="text-sm text-gray-600">{activity.participants} people</div>
            </div>
          </div>
        )}

        {/* Cost */}
        {activity.cost && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">Cost</div>
              <div className="text-sm text-gray-600">{activity.cost} {activity.currency || 'USD'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {activity.notes && (
        <div className="border-t pt-4">
          <div className="font-medium text-gray-900 mb-2">Notes</div>
          <p className="text-sm text-gray-600">{activity.notes}</p>
        </div>
      )}
    </div>
  );
}

// Timeline Activity Card
function TimelineActivityCard({ 
  activity, 
  selected, 
  onClick, 
  className, 
  style 
}: {
  activity: ItineraryActivity;
  selected: boolean;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border-l-4 p-3 cursor-pointer shadow-sm hover:shadow-md transition-all',
        getActivityStatusBorderColor(activity.status),
        selected && 'ring-2 ring-blue-500',
        className
      )}
      style={style}
      onClick={onClick}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="font-medium text-sm truncate mb-1">{activity.title}</div>
        
        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
          <Clock className="h-3 w-3" />
          <span>
            {format(parseISO(activity.startTime), 'h:mm a')} - 
            {format(parseISO(activity.endTime), 'h:mm a')}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-600 truncate">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{activity.location.name}</span>
        </div>
      </div>
    </div>
  );
}

// Kanban Activity Card
function KanbanActivityCard({ 
  activity, 
  selected, 
  showDate, 
  onClick, 
  onEdit, 
  onDelete, 
  className, 
  style 
}: {
  activity: ItineraryActivity;
  selected: boolean;
  showDate: boolean;
  onClick: () => void;
  onEdit?: (activity: ItineraryActivity) => void;
  onDelete?: (activityId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        'bg-white rounded-lg border-l-4 p-3 cursor-pointer shadow-sm hover:shadow-md transition-all',
        getActivityStatusBorderColor(activity.status),
        selected && 'ring-2 ring-blue-500',
        className
      )}
      style={style}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getActivityTypeIcon(activity.type)}</span>
            <h4 className="font-medium text-gray-900 truncate">{activity.title}</h4>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
            <Clock className="h-3 w-3" />
            <span>
              {format(parseISO(activity.startTime), 'h:mm a')} - 
              {format(parseISO(activity.endTime), 'h:mm a')}
            </span>
          </div>

          {showDate && (
            <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
              <Calendar className="h-3 w-3" />
              <span>{format(parseISO(activity.startTime), 'MMM d')}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-gray-600 mb-2 truncate">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{activity.location.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              getActivityTypeColor(activity.type)
            )}>
              {activity.type}
            </span>
          </div>
        </div>

        <div className="relative ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical className="h-3 w-3" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-md shadow-lg border z-20">
                <div className="py-1">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(activity);
                        setShowMenu(false);
                      }}
                      className="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(activity.id);
                        setShowMenu(false);
                      }}
                      className="block w-full text-left px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility functions
function getActivityTypeIcon(type: string): string {
  switch (type) {
    case 'meal': return '🍽️';
    case 'transport': return '🚗';
    case 'accommodation': return '🏨';
    case 'activity':
    default: return '📍';
  }
}

function getActivityTypeColor(type: string): string {
  switch (type) {
    case 'meal': return 'bg-orange-100 text-orange-800';
    case 'transport': return 'bg-blue-100 text-blue-800';
    case 'accommodation': return 'bg-green-100 text-green-800';
    case 'activity':
    default: return 'bg-purple-100 text-purple-800';
  }
}

function getActivityStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'planned':
    default: return 'bg-blue-100 text-blue-800';
  }
}

function getActivityStatusBorderColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'border-l-green-500';
    case 'completed': return 'border-l-gray-500';
    case 'cancelled': return 'border-l-red-500';
    case 'planned':
    default: return 'border-l-blue-500';
  }
}

function getActivityStatusIcon(status: string): React.ReactNode {
  switch (status) {
    case 'confirmed': return <CheckCircle className="h-3 w-3" />;
    case 'completed': return <CheckCircle className="h-3 w-3" />;
    case 'cancelled': return <XCircle className="h-3 w-3" />;
    case 'planned':
    default: return <Pause className="h-3 w-3" />;
  }
} 