'use client';

import { useState, useEffect } from 'react';
import { 
  Navigation, 
  Clock, 
  MapPin, 
  Settings, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Car,
  Bike,
  User,
  Bus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { RouteService, RouteSegment, RouteCalculationResult, RouteOptions, TravelModes } from './RouteService';
import { MapLocation } from './GoogleMap';

interface RoutePanelProps {
  locations: MapLocation[];
  onRouteCalculated?: (result: RouteCalculationResult) => void;
  onTravelModeChange?: (travelMode: google.maps.TravelMode) => void;
  className?: string;
  defaultTravelMode?: google.maps.TravelMode;
  showOptimization?: boolean;
  autoCalculate?: boolean;
}

export function RoutePanel({
  locations,
  onRouteCalculated,
  onTravelModeChange,
  className,
  defaultTravelMode = TravelModes.DRIVING,
  showOptimization = true,
  autoCalculate = true
}: RoutePanelProps) {
  const [routeResult, setRouteResult] = useState<RouteCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode>(defaultTravelMode);
  const [routeOptions, setRouteOptions] = useState<RouteOptions>({
    travelMode: defaultTravelMode,
    avoidHighways: false,
    avoidTolls: false,
    avoidFerries: false,
    optimizeWaypoints: false
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Calculate routes when locations or options change
  useEffect(() => {
    if (autoCalculate && locations.length >= 2) {
      calculateRoutes();
    }
  }, [locations, routeOptions, autoCalculate]);

  const calculateRoutes = async () => {
    if (locations.length < 2) {
      setRouteResult(null);
      return;
    }

    setIsCalculating(true);
    
    try {
      const result = await RouteService.calculateMultipleRoutes(locations, routeOptions);
      setRouteResult(result);
      onRouteCalculated?.(result);
    } catch (error) {
      console.error('Error calculating routes:', error);
      setRouteResult({
        segments: [],
        totalDistance: '0 km',
        totalDuration: '0 mins',
        totalDistanceValue: 0,
        totalDurationValue: 0,
        success: false,
        errors: ['Failed to calculate routes']
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleTravelModeChange = (newTravelMode: google.maps.TravelMode) => {
    setTravelMode(newTravelMode);
    setRouteOptions(prev => ({ ...prev, travelMode: newTravelMode }));
    onTravelModeChange?.(newTravelMode);
  };

  const handleOptionChange = (option: keyof RouteOptions, value: boolean) => {
    setRouteOptions(prev => ({ ...prev, [option]: value }));
  };

  const optimizeRoute = async () => {
    if (locations.length < 3) return;

    setIsCalculating(true);
    
    try {
      const start = locations[0];
      const end = locations[locations.length - 1];
      const waypoints = locations.slice(1, -1);
      
      const result = await RouteService.optimizeRoute(start, waypoints, end, {
        ...routeOptions,
        optimizeWaypoints: true
      });
      
      setRouteResult(result);
      onRouteCalculated?.(result);
    } catch (error) {
      console.error('Error optimizing route:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const getTravelModeIcon = (mode: google.maps.TravelMode) => {
    switch (mode) {
      case TravelModes.DRIVING: return <Car className="h-4 w-4" />;
      case TravelModes.WALKING: return <User className="h-4 w-4" />;
      case TravelModes.BICYCLING: return <Bike className="h-4 w-4" />;
      case TravelModes.TRANSIT: return <Bus className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

  const travelModeOptions = [
    { mode: TravelModes.DRIVING, label: 'Driving', icon: Car },
    { mode: TravelModes.WALKING, label: 'Walking', icon: User },
    { mode: TravelModes.BICYCLING, label: 'Cycling', icon: Bike },
    { mode: TravelModes.TRANSIT, label: 'Transit', icon: Bus }
  ];

  if (locations.length < 2) {
    return (
      <div className={cn('bg-white rounded-lg border p-4', className)}>
        <div className="text-center text-gray-500">
          <Navigation className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Add at least 2 locations to see route information</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Route Information</h3>
          {isCalculating && (
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <Settings className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Travel Mode Selector */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">Travel Mode:</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {travelModeOptions.map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => handleTravelModeChange(mode)}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors',
                    travelMode === mode
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Route Settings */}
          {showSettings && (
            <div className="p-4 border-b bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Route Options</h4>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={routeOptions.avoidHighways}
                    onChange={(e) => handleOptionChange('avoidHighways', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Avoid highways</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={routeOptions.avoidTolls}
                    onChange={(e) => handleOptionChange('avoidTolls', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Avoid tolls</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={routeOptions.avoidFerries}
                    onChange={(e) => handleOptionChange('avoidFerries', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Avoid ferries</span>
                </label>
              </div>
            </div>
          )}

          {/* Route Summary */}
          {routeResult && (
            <div className="p-4">
              {routeResult.success ? (
                <>
                  {/* Total Summary */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">Total Route</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-700">
                        <MapPin className="h-4 w-4" />
                        <span>{routeResult.totalDistance}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-green-700">
                        <Clock className="h-4 w-4" />
                        <span>{routeResult.totalDuration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Route Segments */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Route Segments</h4>
                    
                    {routeResult.segments.map((segment, index) => (
                      <RouteSegmentCard
                        key={segment.id}
                        segment={segment}
                        index={index + 1}
                      />
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <button
                      onClick={calculateRoutes}
                      disabled={isCalculating}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RefreshCw className={cn('h-4 w-4', isCalculating && 'animate-spin')} />
                      Recalculate
                    </button>
                    
                    {showOptimization && locations.length >= 3 && (
                      <button
                        onClick={optimizeRoute}
                        disabled={isCalculating}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        <Navigation className="h-4 w-4" />
                        Optimize
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <span className="font-medium text-red-900">Route calculation failed</span>
                    {routeResult.errors && (
                      <div className="text-sm text-red-700 mt-1">
                        {routeResult.errors.map((error, index) => (
                          <div key={index}>{error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Route Segment Card Component
interface RouteSegmentCardProps {
  segment: RouteSegment;
  index: number;
}

function RouteSegmentCard({ segment, index }: RouteSegmentCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
        {index}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-900 truncate">
            {segment.origin.name}
          </span>
          <span className="text-gray-400">→</span>
          <span className="font-medium text-gray-900 truncate">
            {segment.destination.name}
          </span>
        </div>
        
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <span>{RouteService.getTravelModeIcon(segment.travelMode)}</span>
            <span>{segment.distance}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{segment.duration}</span>
          </div>
        </div>
      </div>
      
      {segment.warnings && segment.warnings.length > 0 && (
        <div title={segment.warnings.join(', ')}>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </div>
      )}
    </div>
  );
} 