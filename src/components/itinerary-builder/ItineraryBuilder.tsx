'use client';

import { useState, useCallback } from 'react';
import { Calendar, Map, LayoutGrid, Settings, Plus, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

// shadcn UI imports
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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
      <Card className={cn('flex flex-col h-full', className)}>
        {/* Header */}
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl font-semibold text-gray-900">Itinerary Builder</CardTitle>
              
              {/* Activity Count Badge */}
              <Badge variant="secondary" className="text-xs">
                {days.reduce((total, day) => total + day.activities.length, 0)} activities
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {/* Kanban Group By Selector */}
              {viewMode === 'kanban' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Group by:</span>
                  <Select value={kanbanGroupBy} onValueChange={(value: KanbanGroupBy) => setKanbanGroupBy(value)}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="type">Activity Type</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Add Activity Button */}
              {!readOnly && (
                <Button
                  onClick={() => handleActivityAddWrapper(days[0]?.id || 'day-1')}
                  className="h-8"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              )}

              {/* Settings */}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* View Mode Selector using Tabs */}
          <Tabs value={viewMode} onValueChange={(value: string) => setViewMode(value as ViewMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {viewModeButtons.map(({ mode, icon: Icon, label }) => (
                <TabsTrigger key={mode} value={mode} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-hidden p-0">
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
        </CardContent>

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
      </Card>
    </DragDropProvider>
  );
}

// Export types for external use
export type { ItineraryDay, ItineraryActivity, MapLocation, KanbanGroupBy }; 