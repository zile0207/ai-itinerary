'use client';

import { useState, useCallback } from 'react';
import { Calendar, Map, LayoutGrid, Settings, Plus, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

import { DragDropProvider, useDragAndDrop } from './DragDropProvider';
import { TimelineView, ItineraryDay, ItineraryActivity } from './TimelineView';
import { KanbanView, KanbanGroupBy } from './KanbanView';
import { GoogleMap, MapLocation, MapRoute } from './GoogleMap';
import { RoutePanel } from './RoutePanel';
import { RouteService, RouteCalculationResult, TravelModes } from './RouteService';
import { OptimizationPanel } from './OptimizationPanel';
import { OptimizationSuggestion } from './OptimizationService';

export type ViewMode = 'timeline' | 'kanban' | 'map' | 'optimize';

interface ItineraryBuilderProps {
  initialDays?: ItineraryDay[];
  onDaysChange?: (days: ItineraryDay[]) => void;
  onActivityAdd?: (dayId: string, timeSlot?: string) => void;
  onActivityUpdate?: (activity: ItineraryActivity) => void;
  onActivityDelete?: (activityId: string) => void;
  className?: string;
  readOnly?: boolean;
}

export function ItineraryBuilder({
  initialDays = [],
  onDaysChange,
  onActivityAdd,
  onActivityUpdate,
  onActivityDelete,
  className,
  readOnly = false
}: ItineraryBuilderProps) {
  const [days, setDays] = useState<ItineraryDay[]>(initialDays);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [kanbanGroupBy, setKanbanGroupBy] = useState<KanbanGroupBy>('day');
  const [selectedActivityId, setSelectedActivityId] = useState<string>();
  const [routeResult, setRouteResult] = useState<RouteCalculationResult | null>(null);
  const [currentTravelMode, setCurrentTravelMode] = useState<google.maps.TravelMode>(TravelModes.DRIVING);

  // Handle days update
  const handleDaysUpdate = useCallback((newDays: ItineraryDay[]) => {
    setDays(newDays);
    onDaysChange?.(newDays);
  }, [onDaysChange]);

  // Drag and drop handlers
  const {
    handleActivityMove,
    handleActivityReorder,
    handleTimeSlotDrop
  } = useDragAndDrop(days, handleDaysUpdate);

  // Activity handlers
  const handleActivitySelect = useCallback((activity: ItineraryActivity) => {
    setSelectedActivityId(activity.id);
  }, []);

  const handleActivityAddWrapper = useCallback((dayId: string, timeSlot?: string) => {
    onActivityAdd?.(dayId, timeSlot);
  }, [onActivityAdd]);

  const handleActivityUpdateWrapper = useCallback((activity: ItineraryActivity) => {
    onActivityUpdate?.(activity);
  }, [onActivityUpdate]);

  const handleActivityDeleteWrapper = useCallback((activityId: string) => {
    onActivityDelete?.(activityId);
    if (selectedActivityId === activityId) {
      setSelectedActivityId(undefined);
    }
  }, [onActivityDelete, selectedActivityId]);

  // Generate map data
  const mapLocations: MapLocation[] = days.flatMap(day => 
    day.activities.map(activity => activity.location)
  );

  const mapRoutes: MapRoute[] = routeResult?.segments.map(segment => ({
    origin: segment.origin,
    destination: segment.destination,
    travelMode: segment.travelMode,
    duration: segment.duration,
    distance: segment.distance,
    polyline: segment.polyline,
    color: RouteService.getTravelModeColor(segment.travelMode),
    strokeWeight: 4,
    strokeOpacity: 0.8
  })) || [];

  // Handle route calculation
  const handleRouteCalculated = useCallback((result: RouteCalculationResult) => {
    setRouteResult(result);
  }, []);

  const handleTravelModeChange = useCallback((travelMode: google.maps.TravelMode) => {
    setCurrentTravelMode(travelMode);
  }, []);

  // Handle optimization suggestions
  const handleApplyOptimization = useCallback((suggestion: OptimizationSuggestion, newDays: ItineraryDay[]) => {
    handleDaysUpdate(newDays);
  }, [handleDaysUpdate]);

  const viewModeButtons = [
    { mode: 'timeline' as ViewMode, icon: Calendar, label: 'Timeline' },
    { mode: 'kanban' as ViewMode, icon: LayoutGrid, label: 'Kanban' },
    { mode: 'map' as ViewMode, icon: Map, label: 'Map' },
    { mode: 'optimize' as ViewMode, icon: Target, label: 'Optimize' }
  ];

  return (
    <DragDropProvider
      days={days}
      onActivityMove={handleActivityMove}
      onActivityReorder={handleActivityReorder}
      onTimeSlotDrop={handleTimeSlotDrop}
      disabled={readOnly}
    >
      <div className={cn('flex flex-col h-full bg-gray-50', className)}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Itinerary Builder</h1>
            
            {/* View Mode Selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {viewModeButtons.map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Kanban Group By Selector */}
            {viewMode === 'kanban' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Group by:</span>
                <select
                  value={kanbanGroupBy}
                  onChange={(e) => setKanbanGroupBy(e.target.value as KanbanGroupBy)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day">Day</option>
                  <option value="type">Activity Type</option>
                  <option value="status">Status</option>
                  <option value="location">Location</option>
                </select>
              </div>
            )}

            {/* Add Activity Button */}
            {!readOnly && (
              <button
                onClick={() => handleActivityAddWrapper(days[0]?.id || 'day-1')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Activity
              </button>
            )}

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'timeline' && (
            <TimelineView
              days={days}
              onActivityAdd={handleActivityAddWrapper}
              onActivityUpdate={handleActivityUpdateWrapper}
              onActivityDelete={handleActivityDeleteWrapper}
              onActivitySelect={handleActivitySelect}
              selectedActivityId={selectedActivityId}
              readOnly={readOnly}
              className="h-full"
            />
          )}

          {viewMode === 'kanban' && (
            <KanbanView
              days={days}
              groupBy={kanbanGroupBy}
              onActivityAdd={handleActivityAddWrapper}
              onActivityUpdate={handleActivityUpdateWrapper}
              onActivityDelete={handleActivityDeleteWrapper}
              onActivitySelect={handleActivitySelect}
              selectedActivityId={selectedActivityId}
              readOnly={readOnly}
              className="h-full"
            />
          )}

          {viewMode === 'map' && (
            <div className="h-full flex">
              {/* Route Panel */}
              <div className="w-80 p-4">
                <RoutePanel
                  locations={mapLocations}
                  onRouteCalculated={handleRouteCalculated}
                  onTravelModeChange={handleTravelModeChange}
                  defaultTravelMode={currentTravelMode}
                  showOptimization={true}
                  autoCalculate={true}
                  className="h-full"
                />
              </div>

              {/* Map */}
              <div className="flex-1 p-4">
                <GoogleMap
                  locations={mapLocations}
                  routes={mapRoutes}
                  onLocationSelect={(location) => {
                    // Find activity with this location and select it
                    const activity = days
                      .flatMap(day => day.activities)
                      .find(activity => activity.location.id === location.id);
                    if (activity) {
                      handleActivitySelect(activity);
                    }
                  }}
                  onLocationAdd={(location) => {
                    // Handle adding new location as activity
                    handleActivityAddWrapper(days[0]?.id || 'day-1');
                  }}
                  showSearch={true}
                  showRoutes={true}
                  interactive={!readOnly}
                  height="100%"
                  className="rounded-lg overflow-hidden"
                />
              </div>
            </div>
          )}

          {viewMode === 'optimize' && (
            <div className="h-full p-4">
              <OptimizationPanel
                days={days}
                onApplySuggestion={handleApplyOptimization}
                onDaysChange={handleDaysUpdate}
                autoAnalyze={true}
                className="h-full"
              />
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-t text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>{days.length} day{days.length !== 1 ? 's' : ''}</span>
            <span>
              {days.reduce((total, day) => total + day.activities.length, 0)} activities
            </span>
            {viewMode === 'map' && routeResult && routeResult.success && (
              <>
                <span className="text-blue-600">
                  Total: {routeResult.totalDistance}
                </span>
                <span className="text-green-600">
                  {routeResult.totalDuration}
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {selectedActivityId && (
              <span className="text-blue-600">Activity selected</span>
            )}
            {!readOnly && (
              <span className="text-green-600">Drag & drop enabled</span>
            )}
            {viewMode === 'map' && routeResult?.segments && (
              <span className="text-gray-500">
                {routeResult.segments.length} route{routeResult.segments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </DragDropProvider>
  );
}

// Export types for external use
export type { ItineraryDay, ItineraryActivity, MapLocation, KanbanGroupBy }; 