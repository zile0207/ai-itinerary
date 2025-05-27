'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Search, Navigation, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MapLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: 'activity' | 'accommodation' | 'transport';
  duration?: number;
  notes?: string;
}

export interface MapRoute {
  origin: MapLocation;
  destination: MapLocation;
  travelMode: google.maps.TravelMode;
  duration?: string;
  distance?: string;
  polyline?: string;
  color?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
}

interface GoogleMapProps {
  locations: MapLocation[];
  routes?: MapRoute[];
  onLocationSelect?: (location: MapLocation) => void;
  onLocationAdd?: (location: MapLocation) => void;
  onLocationUpdate?: (location: MapLocation) => void;
  onLocationDelete?: (locationId: string) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
  showSearch?: boolean;
  showRoutes?: boolean;
  interactive?: boolean;
}

export function GoogleMap({
  locations = [],
  routes = [],
  onLocationSelect,
  onLocationAdd,
  onLocationUpdate,
  onLocationDelete,
  center = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  zoom = 12,
  height = '400px',
  className,
  showSearch = true,
  showRoutes = true,
  interactive = true
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const routesRef = useRef<google.maps.DirectionsRenderer[]>([]);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.');
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });

        await loader.load();

        if (!mapRef.current) return;

        // Initialize map
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // Initialize search autocomplete
        if (showSearch && searchInputRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
            types: ['establishment', 'geocode'],
            fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types']
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location && place.name && place.formatted_address) {
              const newLocation: MapLocation = {
                id: place.place_id || `loc_${Date.now()}`,
                name: place.name,
                address: place.formatted_address,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                type: 'activity'
              };
              
              onLocationAdd?.(newLocation);
              setSearchQuery('');
            }
          });

          autocompleteRef.current = autocomplete;
        }

        // Add click listener for adding locations
        if (interactive) {
          map.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode(
                { location: event.latLng },
                (results, status) => {
                  if (status === 'OK' && results?.[0]) {
                    const result = results[0];
                    const newLocation: MapLocation = {
                      id: `loc_${Date.now()}`,
                      name: result.formatted_address.split(',')[0],
                      address: result.formatted_address,
                      lat: event.latLng!.lat(),
                      lng: event.latLng!.lng(),
                      type: 'activity'
                    };
                    
                    onLocationAdd?.(newLocation);
                  }
                }
              );
            }
          });
        }

        setIsLoaded(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError(err instanceof Error ? err.message : 'Failed to load Google Maps');
        setIsLoading(false);
      }
    };

    initMap();
  }, [center, zoom, showSearch, interactive, onLocationAdd]);

  // Update markers when locations change
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const markers = markersRef.current;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers.clear();

    // Add new markers
    locations.forEach((location, index) => {
      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map,
        title: location.name,
        label: {
          text: (index + 1).toString(),
          color: 'white',
          fontWeight: 'bold'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: getMarkerColor(location.type),
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2
        }
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(location)
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        onLocationSelect?.(location);
      });

      markers.set(location.id, marker);
    });

    // Adjust map bounds to fit all markers
    if (locations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach(location => {
        bounds.extend({ lat: location.lat, lng: location.lng });
      });
      map.fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = google.maps.event.addListener(map, 'bounds_changed', () => {
        if (map.getZoom()! > 15) map.setZoom(15);
        google.maps.event.removeListener(listener);
      });
    }
  }, [isLoaded, locations, onLocationSelect]);

  // Update routes when routes change
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !showRoutes) return;

    const map = mapInstanceRef.current;

    // Clear existing routes
    routesRef.current.forEach(renderer => renderer.setMap(null));
    routesRef.current = [];

    // Add new routes
    routes.forEach((route, index) => {
      // If route has polyline data, use it directly
      if (route.polyline) {
        const decodedPath = google.maps.geometry.encoding.decodePath(route.polyline);
        const polyline = new google.maps.Polyline({
          path: decodedPath,
          strokeColor: route.color || getRouteColor(index),
          strokeWeight: route.strokeWeight || 4,
          strokeOpacity: route.strokeOpacity || 0.8,
          map
        });

        // Create a fake renderer to maintain consistency
        const fakeRenderer = {
          setMap: (map: google.maps.Map | null) => {
            polyline.setMap(map);
          }
        } as google.maps.DirectionsRenderer;
        
        routesRef.current.push(fakeRenderer);
      } else {
        // Use directions service for real-time calculation
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: route.color || getRouteColor(index),
            strokeWeight: route.strokeWeight || 4,
            strokeOpacity: route.strokeOpacity || 0.8
          }
        });

        directionsRenderer.setMap(map);
        routesRef.current.push(directionsRenderer);

        directionsService.route(
          {
            origin: { lat: route.origin.lat, lng: route.origin.lng },
            destination: { lat: route.destination.lat, lng: route.destination.lng },
            travelMode: route.travelMode
          },
          (result, status) => {
            if (status === 'OK' && result) {
              directionsRenderer.setDirections(result);
            }
          }
        );
      }
    });
  }, [isLoaded, routes, showRoutes]);

  const getMarkerColor = (type?: string): string => {
    switch (type) {
      case 'accommodation': return '#10B981'; // Green
      case 'transport': return '#3B82F6'; // Blue
      case 'activity':
      default: return '#EF4444'; // Red
    }
  };

  const getRouteColor = (index: number): string => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[index % colors.length];
  };

  const createInfoWindowContent = (location: MapLocation): string => {
    return `
      <div class="p-2 max-w-xs">
        <h3 class="font-semibold text-gray-900 mb-1">${location.name}</h3>
        <p class="text-sm text-gray-600 mb-2">${location.address}</p>
        ${location.duration ? `<p class="text-xs text-gray-500 flex items-center gap-1"><span>⏱️</span> ${location.duration} minutes</p>` : ''}
        ${location.notes ? `<p class="text-xs text-gray-700 mt-1">${location.notes}</p>` : ''}
      </div>
    `;
  };

  if (error) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 rounded-lg', className)} style={{ height }}>
        <div className="text-center p-6">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Map Error</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <p className="text-xs text-gray-500">
            Make sure to add your Google Maps API key to the environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Search Bar */}
      {showSearch && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className={cn('absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-20')}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full rounded-lg"
        style={{ height }}
      />

      {/* Map Controls */}
      {isLoaded && locations.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-white rounded-lg shadow-lg p-2 space-y-2">
            <div className="text-xs text-gray-600 font-medium">
              {locations.length} location{locations.length !== 1 ? 's' : ''}
            </div>
            {routes.length > 0 && (
              <div className="text-xs text-gray-600">
                <Navigation className="h-3 w-3 inline mr-1" />
                {routes.length} route{routes.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Map service utility functions
export class MapService {
  private static directionsService: google.maps.DirectionsService | null = null;
  
  static async calculateRoute(
    origin: MapLocation,
    destination: MapLocation,
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
  ): Promise<{ duration: string; distance: string } | null> {
    if (!this.directionsService) {
      this.directionsService = new google.maps.DirectionsService();
    }

    return new Promise((resolve) => {
      this.directionsService!.route(
        {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode
        },
        (result, status) => {
          if (status === 'OK' && result?.routes[0]?.legs[0]) {
            const leg = result.routes[0].legs[0];
            resolve({
              duration: leg.duration?.text || '',
              distance: leg.distance?.text || ''
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  static async geocodeAddress(address: string): Promise<MapLocation | null> {
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const result = results[0];
          const location = result.geometry.location;
          
          resolve({
            id: `loc_${Date.now()}`,
            name: result.formatted_address.split(',')[0],
            address: result.formatted_address,
            lat: location.lat(),
            lng: location.lng(),
            type: 'activity'
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  static calculateDistance(loc1: MapLocation, loc2: MapLocation): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLng = this.toRadians(loc2.lng - loc1.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.lat)) * Math.cos(this.toRadians(loc2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
} 