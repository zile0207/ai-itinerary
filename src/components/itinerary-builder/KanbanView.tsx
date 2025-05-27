'use client';

import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Plus, 
  MoreVertical, 
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Filter,
  Settings
} from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { ItineraryActivity, ItineraryDay } from './TimelineView';
import { MapLocation } from './GoogleMap';
import { DroppableColumn, SortableActivityList } from './DraggableActivity';

export type KanbanGroupBy = 'day' | 'type' | 'status' | 'location';

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  activities: ItineraryActivity[];
  maxActivities?: number;
}

interface KanbanViewProps {
  days: ItineraryDay[];
  groupBy?: KanbanGroupBy;
  onActivityAdd?: (columnId: string) => void;
  onActivityUpdate?: (activity: ItineraryActivity) => void;
  onActivityDelete?: (activityId: string) => void;
  onActivitySelect?: (activity: ItineraryActivity) => void;
  selectedActivityId?: string;
  className?: string;
  readOnly?: boolean;
}

export function KanbanView({
  days,
  groupBy = 'day',
  onActivityAdd,
  onActivityUpdate,
  onActivityDelete,
  onActivitySelect,
  selectedActivityId,
  className,
  readOnly = false
}: KanbanViewProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [currentGroupBy, setCurrentGroupBy] = useState<KanbanGroupBy>(groupBy);

  // Generate columns based on groupBy setting
  const columns = useMemo(() => {
    const allActivities = days.flatMap(day => 
      day.activities.map(activity => ({ ...activity, dayId: day.id, dayDate: day.date }))
    );

    switch (currentGroupBy) {
      case 'day':
        return days.map(day => ({
          id: day.id,
          title: day.title || format(parseISO(day.date), 'EEEE, MMM d'),
          color: 'bg-blue-50 border-blue-200',
          activities: day.activities
        }));

      case 'type':
        const typeGroups = {
          activity: { title: 'Activities', color: 'bg-purple-50 border-purple-200', activities: [] as ItineraryActivity[] },
          meal: { title: 'Meals', color: 'bg-orange-50 border-orange-200', activities: [] as ItineraryActivity[] },
          transport: { title: 'Transport', color: 'bg-blue-50 border-blue-200', activities: [] as ItineraryActivity[] },
          accommodation: { title: 'Accommodation', color: 'bg-green-50 border-green-200', activities: [] as ItineraryActivity[] }
        };

        allActivities.forEach(activity => {
          if (typeGroups[activity.type]) {
            typeGroups[activity.type].activities.push(activity);
          }
        });

        return Object.entries(typeGroups).map(([type, group]) => ({
          id: type,
          ...group
        }));

      case 'status':
        const statusGroups = {
          planned: { title: 'Planned', color: 'bg-gray-50 border-gray-200', activities: [] as ItineraryActivity[] },
          confirmed: { title: 'Confirmed', color: 'bg-green-50 border-green-200', activities: [] as ItineraryActivity[] },
          completed: { title: 'Completed', color: 'bg-blue-50 border-blue-200', activities: [] as ItineraryActivity[] },
          cancelled: { title: 'Cancelled', color: 'bg-red-50 border-red-200', activities: [] as ItineraryActivity[] }
        };

        allActivities.forEach(activity => {
          if (statusGroups[activity.status]) {
            statusGroups[activity.status].activities.push(activity);
          }
        });

        return Object.entries(statusGroups).map(([status, group]) => ({
          id: status,
          ...group
        }));

      case 'location':
        const locationGroups: Record<string, { title: string; color: string; activities: ItineraryActivity[] }> = {};
        
        allActivities.forEach(activity => {
          const locationKey = activity.location.name;
          if (!locationGroups[locationKey]) {
            locationGroups[locationKey] = {
              title: activity.location.name,
              color: 'bg-indigo-50 border-indigo-200',
              activities: []
            };
          }
          locationGroups[locationKey].activities.push(activity);
        });

        return Object.entries(locationGroups).map(([locationKey, group]) => ({
          id: locationKey,
          ...group
        }));

      default:
        return [];
    }
  }, [days, currentGroupBy]);

  const handleActivityClick = (activity: ItineraryActivity) => {
    onActivitySelect?.(activity);
  };

  const handleAddActivity = (columnId: string) => {
    if (!readOnly && onActivityAdd) {
      onActivityAdd(columnId);
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'meal': return '🍽️';
      case 'transport': return '🚗';
      case 'accommodation': return '🏨';
      case 'activity':
      default: return '📍';
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

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Kanban Board</h2>
          
          {/* Group By Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Group by:</span>
            <select
              value={currentGroupBy}
              onChange={(e) => setCurrentGroupBy(e.target.value as KanbanGroupBy)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Day</option>
              <option value="type">Activity Type</option>
              <option value="status">Status</option>
              <option value="location">Location</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-6 p-6 h-full min-w-max">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onActivityClick={handleActivityClick}
              onActivityAdd={() => handleAddActivity(column.id)}
              onActivityUpdate={onActivityUpdate}
              onActivityDelete={onActivityDelete}
              selectedActivityId={selectedActivityId}
              readOnly={readOnly}
              groupBy={currentGroupBy}
            />
          ))}

          {/* Add Column (for certain group types) */}
          {(currentGroupBy === 'day' || currentGroupBy === 'location') && !readOnly && (
            <div className="w-80 flex-shrink-0">
              <button
                onClick={() => {/* Handle add column */}}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                <div className="text-center">
                  <Plus className="h-6 w-6 mx-auto mb-2" />
                  <span className="text-sm">
                    Add {currentGroupBy === 'day' ? 'Day' : 'Location'}
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Kanban Column Component
interface KanbanColumnProps {
  column: KanbanColumn;
  onActivityClick: (activity: ItineraryActivity) => void;
  onActivityAdd: () => void;
  onActivityUpdate?: (activity: ItineraryActivity) => void;
  onActivityDelete?: (activityId: string) => void;
  selectedActivityId?: string;
  readOnly?: boolean;
  groupBy: KanbanGroupBy;
}

function KanbanColumn({
  column,
  onActivityClick,
  onActivityAdd,
  onActivityUpdate,
  onActivityDelete,
  selectedActivityId,
  readOnly = false,
  groupBy
}: KanbanColumnProps) {
  const [showMenu, setShowMenu] = useState(false);

  const sortedActivities = useMemo(() => {
    return [...column.activities].sort((a, b) => {
      // Sort by start time for better organization
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [column.activities]);

  return (
    <div className="w-80 flex-shrink-0 flex flex-col">
      {/* Column Header */}
      <div className={cn('rounded-t-lg border-2 p-4', column.color)}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{column.title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {column.activities.length} {column.activities.length === 1 ? 'activity' : 'activities'}
            </p>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <MoreVertical className="h-4 w-4" />
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
                        onActivityAdd();
                        setShowMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Add Activity
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Column Content */}
      <DroppableColumn
        columnId={column.id}
        disabled={readOnly}
        className="flex-1 bg-white border-l-2 border-r-2 border-b-2 border-gray-200 rounded-b-lg overflow-y-auto"
      >
        <SortableContext 
          items={sortedActivities.map(a => a.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="p-3 space-y-3">
            <SortableActivityList
              activities={sortedActivities}
              sourceId={column.id}
              sourceType="column"
              variant="kanban"
              selectedActivityId={selectedActivityId}
              showDate={groupBy !== 'day'}
              onActivityClick={onActivityClick}
              onActivityEdit={onActivityUpdate}
              onActivityDelete={onActivityDelete}
              disabled={readOnly}
            />

            {/* Add Activity Button */}
            {!readOnly && (
              <button
                onClick={onActivityAdd}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="h-4 w-4 mx-auto mb-1" />
                <span className="text-sm">Add Activity</span>
              </button>
            )}

            {/* Empty State */}
            {column.activities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No activities yet</p>
              </div>
            )}
          </div>
        </SortableContext>
      </DroppableColumn>
    </div>
  );
}

 