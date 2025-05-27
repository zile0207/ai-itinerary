'use client';

import { MapLocation } from './GoogleMap';

export interface RouteSegment {
  id: string;
  origin: MapLocation;
  destination: MapLocation;
  travelMode: google.maps.TravelMode;
  distance?: string;
  duration?: string;
  distanceValue?: number; // in meters
  durationValue?: number; // in seconds
  polyline?: string;
  steps?: google.maps.DirectionsStep[];
  warnings?: string[];
}

export interface RouteCalculationResult {
  segments: RouteSegment[];
  totalDistance: string;
  totalDuration: string;
  totalDistanceValue: number;
  totalDurationValue: number;
  success: boolean;
  errors?: string[];
}

export interface RouteOptions {
  travelMode?: google.maps.TravelMode;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  optimizeWaypoints?: boolean;
  region?: string;
  language?: string;
}

class RouteServiceClass {
  private directionsService: google.maps.DirectionsService | null = null;
  private routeCache = new Map<string, RouteSegment>();
  private cacheExpiry = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    if (typeof window !== 'undefined' && window.google?.maps) {
      this.directionsService = new google.maps.DirectionsService();
    }
  }

  private getCacheKey(
    origin: MapLocation,
    destination: MapLocation,
    travelMode: google.maps.TravelMode,
    options?: RouteOptions
  ): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${origin.lat},${origin.lng}-${destination.lat},${destination.lng}-${travelMode}-${optionsStr}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheExpiry;
  }

  async calculateRoute(
    origin: MapLocation,
    destination: MapLocation,
    options: RouteOptions = {}
  ): Promise<RouteSegment | null> {
    if (!this.directionsService) {
      await this.initializeService();
      if (!this.directionsService) {
        console.error('Google Directions Service not available');
        return null;
      }
    }

    const travelMode = options.travelMode || google.maps.TravelMode.DRIVING;
    const cacheKey = this.getCacheKey(origin, destination, travelMode, options);
    
    // Check cache first
    const cached = this.routeCache.get(cacheKey);
    if (cached && this.isCacheValid(Date.now())) {
      return cached;
    }

    try {
      const request: google.maps.DirectionsRequest = {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode,
        avoidHighways: options.avoidHighways || false,
        avoidTolls: options.avoidTolls || false,
        avoidFerries: options.avoidFerries || false,
        region: options.region,
        language: options.language || 'en'
      };

      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        this.directionsService!.route(request, (result, status) => {
          if (status === 'OK' && result) {
            resolve(result);
          } else {
            reject(new Error(`Directions request failed: ${status}`));
          }
        });
      });

      if (result.routes[0]?.legs[0]) {
        const leg = result.routes[0].legs[0];
        const route: RouteSegment = {
          id: `${origin.id}-${destination.id}`,
          origin,
          destination,
          travelMode,
          distance: leg.distance?.text || '',
          duration: leg.duration?.text || '',
          distanceValue: leg.distance?.value || 0,
          durationValue: leg.duration?.value || 0,
          polyline: result.routes[0].overview_polyline,
          steps: leg.steps,
          warnings: result.routes[0].warnings
        };

        // Cache the result
        this.routeCache.set(cacheKey, route);
        
        return route;
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }

    return null;
  }

  async calculateMultipleRoutes(
    locations: MapLocation[],
    options: RouteOptions = {}
  ): Promise<RouteCalculationResult> {
    if (locations.length < 2) {
      return {
        segments: [],
        totalDistance: '0 km',
        totalDuration: '0 mins',
        totalDistanceValue: 0,
        totalDurationValue: 0,
        success: false,
        errors: ['At least 2 locations required']
      };
    }

    const segments: RouteSegment[] = [];
    const errors: string[] = [];
    let totalDistanceValue = 0;
    let totalDurationValue = 0;

    // Calculate routes between consecutive locations
    for (let i = 0; i < locations.length - 1; i++) {
      const origin = locations[i];
      const destination = locations[i + 1];

      try {
        const segment = await this.calculateRoute(origin, destination, options);
        if (segment) {
          segments.push(segment);
          totalDistanceValue += segment.distanceValue || 0;
          totalDurationValue += segment.durationValue || 0;
        } else {
          errors.push(`Failed to calculate route from ${origin.name} to ${destination.name}`);
        }
      } catch (error) {
        errors.push(`Error calculating route from ${origin.name} to ${destination.name}: ${error}`);
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      segments,
      totalDistance: this.formatDistance(totalDistanceValue),
      totalDuration: this.formatDuration(totalDurationValue),
      totalDistanceValue,
      totalDurationValue,
      success: segments.length > 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async optimizeRoute(
    start: MapLocation,
    waypoints: MapLocation[],
    end: MapLocation,
    options: RouteOptions = {}
  ): Promise<RouteCalculationResult> {
    if (!this.directionsService) {
      await this.initializeService();
      if (!this.directionsService) {
        return {
          segments: [],
          totalDistance: '0 km',
          totalDuration: '0 mins',
          totalDistanceValue: 0,
          totalDurationValue: 0,
          success: false,
          errors: ['Google Directions Service not available']
        };
      }
    }

    try {
      const request: google.maps.DirectionsRequest = {
        origin: { lat: start.lat, lng: start.lng },
        destination: { lat: end.lat, lng: end.lng },
        waypoints: waypoints.map(wp => ({
          location: { lat: wp.lat, lng: wp.lng },
          stopover: true
        })),
        optimizeWaypoints: options.optimizeWaypoints !== false,
        travelMode: options.travelMode || google.maps.TravelMode.DRIVING,
        avoidHighways: options.avoidHighways || false,
        avoidTolls: options.avoidTolls || false,
        avoidFerries: options.avoidFerries || false
      };

      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        this.directionsService!.route(request, (result, status) => {
          if (status === 'OK' && result) {
            resolve(result);
          } else {
            reject(new Error(`Directions request failed: ${status}`));
          }
        });
      });

      const segments: RouteSegment[] = [];
      let totalDistanceValue = 0;
      let totalDurationValue = 0;

      if (result.routes[0]?.legs) {
        const allLocations = [start, ...waypoints, end];
        
        result.routes[0].legs.forEach((leg, index) => {
          const segment: RouteSegment = {
            id: `${allLocations[index].id}-${allLocations[index + 1].id}`,
            origin: allLocations[index],
            destination: allLocations[index + 1],
            travelMode: options.travelMode || google.maps.TravelMode.DRIVING,
            distance: leg.distance?.text || '',
            duration: leg.duration?.text || '',
            distanceValue: leg.distance?.value || 0,
            durationValue: leg.duration?.value || 0,
            steps: leg.steps,
            warnings: result.routes[0].warnings
          };

          segments.push(segment);
          totalDistanceValue += segment.distanceValue || 0;
          totalDurationValue += segment.durationValue || 0;
        });
      }

      return {
        segments,
        totalDistance: this.formatDistance(totalDistanceValue),
        totalDuration: this.formatDuration(totalDurationValue),
        totalDistanceValue,
        totalDurationValue,
        success: true
      };
    } catch (error) {
      return {
        segments: [],
        totalDistance: '0 km',
        totalDuration: '0 mins',
        totalDistanceValue: 0,
        totalDurationValue: 0,
        success: false,
        errors: [`Route optimization failed: ${error}`]
      };
    }
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  getTravelModeIcon(travelMode: google.maps.TravelMode): string {
    switch (travelMode) {
      case google.maps.TravelMode.DRIVING:
        return '🚗';
      case google.maps.TravelMode.WALKING:
        return '🚶';
      case google.maps.TravelMode.BICYCLING:
        return '🚴';
      case google.maps.TravelMode.TRANSIT:
        return '🚌';
      default:
        return '🚗';
    }
  }

  getTravelModeColor(travelMode: google.maps.TravelMode): string {
    switch (travelMode) {
      case google.maps.TravelMode.DRIVING:
        return '#3B82F6'; // Blue
      case google.maps.TravelMode.WALKING:
        return '#10B981'; // Green
      case google.maps.TravelMode.BICYCLING:
        return '#F59E0B'; // Orange
      case google.maps.TravelMode.TRANSIT:
        return '#8B5CF6'; // Purple
      default:
        return '#3B82F6';
    }
  }

  clearCache(): void {
    this.routeCache.clear();
  }

  getCacheSize(): number {
    return this.routeCache.size;
  }
}

// Export singleton instance
export const RouteService = new RouteServiceClass();

// Export travel mode constants for convenience
export const TravelModes = {
  DRIVING: 'DRIVING' as google.maps.TravelMode,
  WALKING: 'WALKING' as google.maps.TravelMode,
  BICYCLING: 'BICYCLING' as google.maps.TravelMode,
  TRANSIT: 'TRANSIT' as google.maps.TravelMode
}; 