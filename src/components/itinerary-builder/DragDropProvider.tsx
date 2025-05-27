'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  DropAnimation,
  defaultDropAnimationSideEffects,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  UniqueIdentifier,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  TouchSensor
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

import { ItineraryActivity, ItineraryDay } from './TimelineView';
import { ActivityCard } from './ActivityCard';

export interface DragData {
  type: 'activity' | 'timeSlot';
  activity?: ItineraryActivity;
  sourceId: string;
  sourceType: 'day' | 'column' | 'timeSlot';
  sourceIndex?: number;
}

export interface DropData {
  id: string;
  type: 'day' | 'column' | 'timeSlot';
  accepts: ('activity' | 'timeSlot')[];
  data?: any;
}

interface DragDropProviderProps {
  children: React.ReactNode;
  days: ItineraryDay[];
  onActivityMove?: (
    activityId: string,
    sourceId: string,
    destinationId: string,
    sourceIndex: number,
    destinationIndex: number
  ) => void;
  onActivityReorder?: (
    dayId: string,
    oldIndex: number,
    newIndex: number
  ) => void;
  onTimeSlotDrop?: (
    activityId: string,
    dayId: string,
    timeSlot: string
  ) => void;
  disabled?: boolean;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export function DragDropProvider({
  children,
  days,
  onActivityMove,
  onActivityReorder,
  onTimeSlotDrop,
  disabled = false
}: DragDropProviderProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [dragData, setDragData] = useState<DragData | null>(null);

  // Configure sensors for different input methods
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom collision detection algorithm
  const collisionDetection = useCallback((args: any) => {
    // First, let's see if there are any collisions with the pointer
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    // If there are no pointer collisions, use rectangle intersection
    const intersectionCollisions = rectIntersection(args);
    
    if (intersectionCollisions.length > 0) {
      return intersectionCollisions;
    }

    // Finally, use closest center as fallback
    return closestCenter(args);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);

    // Extract drag data from the active element
    const dragData = active.data.current as DragData;
    setDragData(dragData);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over logic if needed for visual feedback
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDragData(null);

    if (!over || !dragData) {
      return;
    }

    const overId = over.id;
    const overData = over.data.current as DropData;
    
    // Handle different drop scenarios
    if (dragData.type === 'activity' && dragData.activity) {
      const activity = dragData.activity;
      
      // Dropping activity on a time slot
      if (overData?.type === 'timeSlot') {
        const [dayId, timeSlot] = overId.toString().split('_');
        onTimeSlotDrop?.(activity.id, dayId, timeSlot);
        return;
      }

      // Dropping activity on a day (for reordering within day)
      if (overData?.type === 'day') {
        const destinationDayId = overId.toString();
        const sourceDayId = dragData.sourceId;
        
        if (sourceDayId === destinationDayId) {
          // Reordering within the same day
          const sourceIndex = dragData.sourceIndex ?? 0;
          const destinationIndex = overData.data?.index ?? 0;
          
          if (sourceIndex !== destinationIndex) {
            onActivityReorder?.(sourceDayId, sourceIndex, destinationIndex);
          }
        } else {
          // Moving between different days
          const sourceIndex = dragData.sourceIndex ?? 0;
          const destinationIndex = overData.data?.index ?? 0;
          
          onActivityMove?.(
            activity.id,
            sourceDayId,
            destinationDayId,
            sourceIndex,
            destinationIndex
          );
        }
        return;
      }

      // Dropping activity on a column (for Kanban view)
      if (overData?.type === 'column') {
        const destinationColumnId = overId.toString();
        const sourceColumnId = dragData.sourceId;
        const sourceIndex = dragData.sourceIndex ?? 0;
        const destinationIndex = overData.data?.index ?? 0;
        
        onActivityMove?.(
          activity.id,
          sourceColumnId,
          destinationColumnId,
          sourceIndex,
          destinationIndex
        );
        return;
      }
    }
  }, [dragData, onActivityMove, onActivityReorder, onTimeSlotDrop]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setDragData(null);
  }, []);

  // Get the active activity for the drag overlay
  const activeActivity = dragData?.activity;

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
    >
      {children}
      
      <DragOverlay dropAnimation={dropAnimation}>
        {activeActivity ? (
          <ActivityCard
            activity={activeActivity}
            variant="compact"
            selected={false}
            draggable={false}
            showActions={false}
            className="opacity-90 shadow-lg rotate-3 scale-105"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Hook for drag and drop functionality
export function useDragAndDrop(
  days: ItineraryDay[],
  onDaysUpdate: (days: ItineraryDay[]) => void
) {
  const handleActivityMove = useCallback((
    activityId: string,
    sourceId: string,
    destinationId: string,
    sourceIndex: number,
    destinationIndex: number
  ) => {
    const newDays = [...days];
    
    // Find source and destination days/columns
    const sourceDay = newDays.find(day => day.id === sourceId);
    const destinationDay = newDays.find(day => day.id === destinationId);
    
    if (!sourceDay || !destinationDay) {
      console.warn('Source or destination day not found');
      return;
    }

    // Find the activity to move
    const activityToMove = sourceDay.activities.find(activity => activity.id === activityId);
    if (!activityToMove) {
      console.warn('Activity to move not found');
      return;
    }

    // Remove activity from source
    sourceDay.activities = sourceDay.activities.filter(activity => activity.id !== activityId);
    
    // Add activity to destination
    destinationDay.activities.splice(destinationIndex, 0, activityToMove);
    
    onDaysUpdate(newDays);
  }, [days, onDaysUpdate]);

  const handleActivityReorder = useCallback((
    dayId: string,
    oldIndex: number,
    newIndex: number
  ) => {
    const newDays = [...days];
    const day = newDays.find(d => d.id === dayId);
    
    if (!day) {
      console.warn('Day not found for reordering');
      return;
    }

    // Reorder activities within the day
    const [movedActivity] = day.activities.splice(oldIndex, 1);
    day.activities.splice(newIndex, 0, movedActivity);
    
    onDaysUpdate(newDays);
  }, [days, onDaysUpdate]);

  const handleTimeSlotDrop = useCallback((
    activityId: string,
    dayId: string,
    timeSlot: string
  ) => {
    const newDays = [...days];
    
    // Find the activity in any day
    let sourceDay: ItineraryDay | undefined;
    let activityToMove: ItineraryActivity | undefined;
    
    for (const day of newDays) {
      const activity = day.activities.find(a => a.id === activityId);
      if (activity) {
        sourceDay = day;
        activityToMove = activity;
        break;
      }
    }
    
    if (!activityToMove || !sourceDay) {
      console.warn('Activity not found for time slot drop');
      return;
    }

    const destinationDay = newDays.find(day => day.id === dayId);
    if (!destinationDay) {
      console.warn('Destination day not found');
      return;
    }

    // Parse time slot (format: "HH:MM")
    const [hours, minutes] = timeSlot.split(':').map(Number);
    
    // Update activity time based on time slot
    const activityDate = new Date(destinationDay.date);
    const startTime = new Date(activityDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + activityToMove.duration);
    
    const updatedActivity = {
      ...activityToMove,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    };

    // Remove from source day if different
    if (sourceDay.id !== destinationDay.id) {
      sourceDay.activities = sourceDay.activities.filter(a => a.id !== activityId);
    } else {
      // Remove from same day for repositioning
      destinationDay.activities = destinationDay.activities.filter(a => a.id !== activityId);
    }
    
    // Add to destination day at appropriate position (sorted by time)
    const insertIndex = destinationDay.activities.findIndex(
      activity => new Date(activity.startTime) > startTime
    );
    
    if (insertIndex === -1) {
      destinationDay.activities.push(updatedActivity);
    } else {
      destinationDay.activities.splice(insertIndex, 0, updatedActivity);
    }
    
    onDaysUpdate(newDays);
  }, [days, onDaysUpdate]);

  return {
    handleActivityMove,
    handleActivityReorder,
    handleTimeSlotDrop
  };
}

// Utility function to create drag data
export function createDragData(
  type: 'activity' | 'timeSlot',
  sourceId: string,
  sourceType: 'day' | 'column' | 'timeSlot',
  activity?: ItineraryActivity,
  sourceIndex?: number
): DragData {
  return {
    type,
    activity,
    sourceId,
    sourceType,
    sourceIndex
  };
}

// Utility function to create drop data
export function createDropData(
  id: string,
  type: 'day' | 'column' | 'timeSlot',
  accepts: ('activity' | 'timeSlot')[],
  data?: any
): DropData {
  return {
    id,
    type,
    accepts,
    data
  };
} 