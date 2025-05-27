'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

import { ItineraryActivity } from './TimelineView';
import { ActivityCard, ActivityCardVariant } from './ActivityCard';
import { createDragData, DragData } from './DragDropProvider';

interface DraggableActivityProps {
  activity: ItineraryActivity;
  variant?: ActivityCardVariant;
  sourceId: string;
  sourceType: 'day' | 'column' | 'timeSlot';
  sourceIndex: number;
  selected?: boolean;
  showDate?: boolean;
  onClick?: (activity: ItineraryActivity) => void;
  onEdit?: (activity: ItineraryActivity) => void;
  onDelete?: (activityId: string) => void;
  onDuplicate?: (activity: ItineraryActivity) => void;
  onShare?: (activity: ItineraryActivity) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function DraggableActivity({
  activity,
  variant = 'default',
  sourceId,
  sourceType,
  sourceIndex,
  selected = false,
  showDate = false,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
  className,
  style,
  disabled = false
}: DraggableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: activity.id,
    data: createDragData(
      'activity',
      sourceId,
      sourceType,
      activity,
      sourceIndex
    ) as DragData,
    disabled
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...style
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn(
        'relative',
        isDragging && 'opacity-50 z-50',
        isOver && 'ring-2 ring-blue-400',
        className
      )}
      {...attributes}
      {...listeners}
    >
      <ActivityCard
        activity={activity}
        variant={variant}
        selected={selected}
        draggable={!disabled}
        showDate={showDate}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onShare={onShare}
        className={cn(
          'transition-all duration-200',
          isDragging && 'cursor-grabbing',
          !disabled && 'cursor-grab hover:shadow-md'
        )}
      />
      
      {/* Drag indicator */}
      {!disabled && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full mt-1"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full mt-1"></div>
        </div>
      )}
    </div>
  );
}

// Droppable Time Slot Component
interface DroppableTimeSlotProps {
  dayId: string;
  timeSlot: string;
  children?: React.ReactNode;
  className?: string;
  onDrop?: (activityId: string, dayId: string, timeSlot: string) => void;
  disabled?: boolean;
}

export function DroppableTimeSlot({
  dayId,
  timeSlot,
  children,
  className,
  onDrop,
  disabled = false
}: DroppableTimeSlotProps) {
  const {
    setNodeRef,
    isOver,
    active
  } = useSortable({
    id: `${dayId}_${timeSlot}`,
    data: {
      type: 'timeSlot',
      accepts: ['activity'],
      dayId,
      timeSlot
    },
    disabled
  });

  const canDrop = active?.data.current?.type === 'activity';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-all duration-200',
        isOver && canDrop && 'bg-blue-50 border-blue-200',
        !disabled && 'hover:bg-gray-50',
        className
      )}
    >
      {children}
      
      {/* Drop indicator */}
      {isOver && canDrop && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-md bg-blue-50 bg-opacity-50 flex items-center justify-center">
          <span className="text-xs text-blue-600 font-medium">Drop here</span>
        </div>
      )}
    </div>
  );
}

// Droppable Column Component (for Kanban)
interface DroppableColumnProps {
  columnId: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function DroppableColumn({
  columnId,
  children,
  className,
  disabled = false
}: DroppableColumnProps) {
  const {
    setNodeRef,
    isOver,
    active
  } = useSortable({
    id: columnId,
    data: {
      type: 'column',
      accepts: ['activity'],
      columnId
    },
    disabled
  });

  const canDrop = active?.data.current?.type === 'activity';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-all duration-200',
        isOver && canDrop && 'bg-blue-50',
        className
      )}
    >
      {children}
      
      {/* Drop indicator for empty columns */}
      {isOver && canDrop && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-400 rounded"></div>
      )}
    </div>
  );
}

// Sortable Activity List Component
interface SortableActivityListProps {
  activities: ItineraryActivity[];
  sourceId: string;
  sourceType: 'day' | 'column';
  variant?: ActivityCardVariant;
  selectedActivityId?: string;
  showDate?: boolean;
  onActivityClick?: (activity: ItineraryActivity) => void;
  onActivityEdit?: (activity: ItineraryActivity) => void;
  onActivityDelete?: (activityId: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SortableActivityList({
  activities,
  sourceId,
  sourceType,
  variant = 'default',
  selectedActivityId,
  showDate = false,
  onActivityClick,
  onActivityEdit,
  onActivityDelete,
  className,
  disabled = false
}: SortableActivityListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {activities.map((activity, index) => (
        <DraggableActivity
          key={activity.id}
          activity={activity}
          variant={variant}
          sourceId={sourceId}
          sourceType={sourceType}
          sourceIndex={index}
          selected={selectedActivityId === activity.id}
          showDate={showDate}
          onClick={onActivityClick}
          onEdit={onActivityEdit}
          onDelete={onActivityDelete}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

// Drag Handle Component
interface DragHandleProps {
  className?: string;
  disabled?: boolean;
}

export function DragHandle({ className, disabled = false }: DragHandleProps) {
  if (disabled) return null;

  return (
    <div className={cn('cursor-grab active:cursor-grabbing', className)}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-gray-400"
      >
        <circle cx="3" cy="3" r="1" fill="currentColor" />
        <circle cx="9" cy="3" r="1" fill="currentColor" />
        <circle cx="3" cy="9" r="1" fill="currentColor" />
        <circle cx="9" cy="9" r="1" fill="currentColor" />
      </svg>
    </div>
  );
} 