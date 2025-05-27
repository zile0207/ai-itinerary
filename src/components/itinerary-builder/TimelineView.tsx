'use client';

import { useState, useMemo } from 'react';
import { format, addDays, startOfDay, addHours, isSameDay, parseISO } from 'date-fns';
import { 
  Clock, 
  Calendar, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  MapPin,
  Users,
  DollarSign
} from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { MapLocation } from './GoogleMap';
import { DroppableTimeSlot, DraggableActivity } from './DraggableActivity';

export interface ItineraryActivity {
  id: string;
  title: string;
  description?: string;
  location: MapLocation;
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // minutes
  type: 'activity' | 'meal' | 'transport' | 'accommodation';
  cost?: number;
  currency?: string;
  notes?: string;
  participants?: number;
  status: 'planned' | 'confirmed' | 'completed' | 'cancelled';
  color?: string;
}

export interface ItineraryDay {
  id: string;
  date: string; // ISO date string
  title?: string;
  activities: ItineraryActivity[];
  notes?: string;
}

interface TimelineViewProps {
  days: ItineraryDay[];
  onActivityAdd?: (dayId: string, timeSlot: string) => void;
  onActivityUpdate?: (activity: ItineraryActivity) => void;
  onActivityDelete?: (activityId: string) => void;
  onActivitySelect?: (activity: ItineraryActivity) => void;
  selectedActivityId?: string;
  timeFormat?: '12h' | '24h';
  startHour?: number;
  endHour?: number;
  timeSlotDuration?: number; // minutes
  className?: string;
  readOnly?: boolean;
}

export function TimelineView({
  days,
  onActivityAdd,
  onActivityUpdate,
  onActivityDelete,
  onActivitySelect,
  selectedActivityId,
  timeFormat = '12h',
  startHour = 6,
  endHour = 24,
  timeSlotDuration = 30,
  className,
  readOnly = false
}: TimelineViewProps) {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState<'hour' | 'halfHour' | 'quarter'>('halfHour');

  const currentDay = days[currentDayIndex];

  // Generate time slots for the day
  const timeSlots = useMemo(() => {
    const slots = [];
    const slotDuration = zoomLevel === 'hour' ? 60 : zoomLevel === 'halfHour' ? 30 : 15;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push({
          time,
          label: format(time, timeFormat === '12h' ? 'h:mm a' : 'HH:mm'),
          value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        });
      }
    }
    
    return slots;
  }, [startHour, endHour, zoomLevel, timeFormat]);

  // Get activities for current day
  const dayActivities = useMemo(() => {
    if (!currentDay) return [];
    
    return currentDay.activities.map(activity => {
      const startTime = parseISO(activity.startTime);
      const endTime = parseISO(activity.endTime);
      
      // Calculate position and height based on time
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
      const dayStartMinutes = startHour * 60;
      const dayEndMinutes = endHour * 60;
      
      const top = ((startMinutes - dayStartMinutes) / (dayEndMinutes - dayStartMinutes)) * 100;
      const height = ((endMinutes - startMinutes) / (dayEndMinutes - dayStartMinutes)) * 100;
      
      return {
        ...activity,
        style: {
          top: `${Math.max(0, top)}%`,
          height: `${Math.max(2, height)}%`
        }
      };
    });
  }, [currentDay, startHour, endHour]);

  const handleTimeSlotClick = (timeSlot: string) => {
    if (!readOnly && currentDay && onActivityAdd) {
      onActivityAdd(currentDay.id, timeSlot);
    }
  };

  const handleActivityClick = (activity: ItineraryActivity) => {
    onActivitySelect?.(activity);
  };

  const getActivityTypeColor = (type: string): string => {
    switch (type) {
      case 'meal': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'transport': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'accommodation': return 'bg-green-100 border-green-300 text-green-800';
      case 'activity':
      default: return 'bg-purple-100 border-purple-300 text-purple-800';
    }
  };

  const getActivityStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed': return 'border-l-green-500';
      case 'completed': return 'border-l-gray-500';
      case 'cancelled': return 'border-l-red-500';
      case 'planned':
      default: return 'border-l-blue-500';
    }
  };

  if (!currentDay) {
    return (
      <div className={cn('flex items-center justify-center h-96 bg-gray-50 rounded-lg', className)}>
        <div className="text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Days Planned</h3>
          <p className="text-gray-600">Add some days to your itinerary to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-white rounded-lg border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          {/* Day Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
              disabled={currentDayIndex === 0}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="text-center min-w-[120px]">
              <div className="font-semibold text-gray-900">
                {format(parseISO(currentDay.date), 'EEEE')}
              </div>
              <div className="text-sm text-gray-600">
                {format(parseISO(currentDay.date), 'MMM d, yyyy')}
              </div>
            </div>
            
            <button
              onClick={() => setCurrentDayIndex(Math.min(days.length - 1, currentDayIndex + 1))}
              disabled={currentDayIndex === days.length - 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day Title */}
          {currentDay.title && (
            <div className="text-lg font-medium text-gray-900">
              {currentDay.title}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white rounded-md border">
            <button
              onClick={() => setZoomLevel('hour')}
              className={cn(
                'px-2 py-1 text-xs rounded-l-md',
                zoomLevel === 'hour' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50'
              )}
            >
              1h
            </button>
            <button
              onClick={() => setZoomLevel('halfHour')}
              className={cn(
                'px-2 py-1 text-xs',
                zoomLevel === 'halfHour' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50'
              )}
            >
              30m
            </button>
            <button
              onClick={() => setZoomLevel('quarter')}
              className={cn(
                'px-2 py-1 text-xs rounded-r-md',
                zoomLevel === 'quarter' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50'
              )}
            >
              15m
            </button>
          </div>

          {/* Day Indicator */}
          <div className="text-sm text-gray-600">
            Day {currentDayIndex + 1} of {days.length}
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Time Labels */}
        <div className="w-20 border-r bg-gray-50 flex-shrink-0">
          <div className="sticky top-0 bg-gray-50 border-b p-2 text-xs font-medium text-gray-600">
            Time
          </div>
          <div className="relative">
            {timeSlots.map((slot, index) => (
              <div
                key={slot.value}
                className={cn(
                  'border-b border-gray-200 px-2 py-1 text-xs text-gray-600',
                  zoomLevel === 'hour' ? 'h-16' : zoomLevel === 'halfHour' ? 'h-8' : 'h-4'
                )}
              >
                {slot.label}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 relative overflow-y-auto">
          {/* Grid Lines */}
          <div className="absolute inset-0">
            {timeSlots.map((slot, index) => (
              <DroppableTimeSlot
                key={slot.value}
                dayId={currentDay.id}
                timeSlot={slot.value}
                disabled={readOnly}
                className={cn(
                  'border-b border-gray-100 cursor-pointer hover:bg-blue-50',
                  zoomLevel === 'hour' ? 'h-16' : zoomLevel === 'halfHour' ? 'h-8' : 'h-4'
                )}
              >
                <div 
                  className="w-full h-full"
                  onClick={() => handleTimeSlotClick(slot.value)}
                />
              </DroppableTimeSlot>
            ))}
          </div>

          {/* Activities */}
          <SortableContext 
            items={dayActivities.map(a => a.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="absolute inset-0 p-2">
              {dayActivities.map((activity, index) => (
                <DraggableActivity
                  key={activity.id}
                  activity={activity}
                  variant="timeline"
                  sourceId={currentDay.id}
                  sourceType="day"
                  sourceIndex={index}
                  selected={selectedActivityId === activity.id}
                  onClick={() => handleActivityClick(activity)}
                  onEdit={onActivityUpdate}
                  onDelete={onActivityDelete}
                  disabled={readOnly}
                  style={activity.style}
                  className="absolute left-2 right-2"
                />
              ))}
            </div>
          </SortableContext>

          {/* Empty State */}
          {dayActivities.length === 0 && !readOnly && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">No activities planned</p>
                <p className="text-xs text-gray-500">Click on a time slot to add an activity</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Day Notes */}
      {currentDay.notes && (
        <div className="border-t p-4 bg-gray-50">
          <div className="text-sm font-medium text-gray-900 mb-1">Day Notes</div>
          <div className="text-sm text-gray-600">{currentDay.notes}</div>
        </div>
      )}
    </div>
  );
}

// Activity Card Component for detailed view
interface ActivityCardProps {
  activity: ItineraryActivity;
  onEdit?: (activity: ItineraryActivity) => void;
  onDelete?: (activityId: string) => void;
  className?: string;
}

export function ActivityCard({ activity, onEdit, onDelete, className }: ActivityCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={cn('bg-white rounded-lg border shadow-sm p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{activity.title}</h3>
          
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {format(parseISO(activity.startTime), 'h:mm a')} - 
                {format(parseISO(activity.endTime), 'h:mm a')}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{activity.location.name}</span>
            </div>
          </div>

          {activity.description && (
            <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
          )}

          <div className="flex items-center gap-4 mt-3">
            <span className={cn(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              getActivityTypeColor(activity.type)
            )}>
              {activity.type}
            </span>
            
            <span className={cn(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              activity.status === 'confirmed' ? 'bg-green-100 text-green-800' :
              activity.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              activity.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            )}>
              {activity.status}
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="relative ml-4">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border z-20">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onEdit?.(activity);
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete?.(activity.id);
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function for activity type colors (used in both components)
function getActivityTypeColor(type: string): string {
  switch (type) {
    case 'meal': return 'bg-orange-100 border-orange-300 text-orange-800';
    case 'transport': return 'bg-blue-100 border-blue-300 text-blue-800';
    case 'accommodation': return 'bg-green-100 border-green-300 text-green-800';
    case 'activity':
    default: return 'bg-purple-100 border-purple-300 text-purple-800';
  }
} 