'use client';

import React, { useState } from 'react';
import { MapPin, Globe, Search } from 'lucide-react';

interface Coordinates {
  lat: number;
  lng: number;
}

interface MapSelectorProps {
  onLocationSelect: (location: { name: string; coordinates: Coordinates; country?: string }) => void;
  selectedLocation?: { name: string; coordinates: Coordinates; country?: string };
  className?: string;
}

// Popular destinations with coordinates
const POPULAR_DESTINATIONS = [
  { name: 'Paris, France', coordinates: { lat: 48.8566, lng: 2.3522 }, country: 'France' },
  { name: 'Tokyo, Japan', coordinates: { lat: 35.6762, lng: 139.6503 }, country: 'Japan' },
  { name: 'New York City, USA', coordinates: { lat: 40.7128, lng: -74.0060 }, country: 'USA' },
  { name: 'London, England', coordinates: { lat: 51.5074, lng: -0.1278 }, country: 'England' },
  { name: 'Rome, Italy', coordinates: { lat: 41.9028, lng: 12.4964 }, country: 'Italy' },
  { name: 'Barcelona, Spain', coordinates: { lat: 41.3851, lng: 2.1734 }, country: 'Spain' },
  { name: 'Bali, Indonesia', coordinates: { lat: -8.3405, lng: 115.0920 }, country: 'Indonesia' },
  { name: 'Sydney, Australia', coordinates: { lat: -33.8688, lng: 151.2093 }, country: 'Australia' },
  { name: 'Dubai, UAE', coordinates: { lat: 25.2048, lng: 55.2708 }, country: 'UAE' },
  { name: 'Iceland', coordinates: { lat: 64.9631, lng: -19.0208 }, country: 'Iceland' },
  { name: 'Morocco', coordinates: { lat: 31.7917, lng: -7.0926 }, country: 'Morocco' },
  { name: 'Thailand', coordinates: { lat: 15.8700, lng: 100.9925 }, country: 'Thailand' },
  { name: 'Peru', coordinates: { lat: -9.1900, lng: -75.0152 }, country: 'Peru' },
  { name: 'Egypt', coordinates: { lat: 26.8206, lng: 30.8025 }, country: 'Egypt' },
  { name: 'Greece', coordinates: { lat: 39.0742, lng: 21.8243 }, country: 'Greece' }
];

export const MapSelector: React.FC<MapSelectorProps> = ({
  onLocationSelect,
  selectedLocation,
  className = ''
}) => {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  // Convert coordinates to SVG position (simplified world map projection)
  const coordsToSVG = (lat: number, lng: number) => {
    // Simple equirectangular projection
    const x = ((lng + 180) / 360) * 800;
    const y = ((90 - lat) / 180) * 400;
    return { x, y };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map Container */}
      <div className="relative bg-blue-50 rounded-lg border-2 border-blue-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Select Destination on Map</h3>
          </div>
          
          {/* Simple World Map SVG */}
          <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
            <svg
              viewBox="0 0 800 400"
              className="w-full h-64 cursor-pointer"
              style={{ background: 'linear-gradient(to bottom, #e0f2fe 0%, #81d4fa 100%)' }}
            >
              {/* Simple world map paths (very simplified) */}
              <g fill="#4ade80" stroke="#22c55e" strokeWidth="1">
                {/* North America */}
                <path d="M 100 80 L 200 80 L 250 120 L 200 180 L 100 160 Z" />
                {/* South America */}
                <path d="M 180 200 L 220 200 L 240 280 L 200 320 L 170 300 Z" />
                {/* Europe */}
                <path d="M 380 70 L 450 70 L 460 120 L 380 120 Z" />
                {/* Africa */}
                <path d="M 380 140 L 450 140 L 460 260 L 400 280 L 380 240 Z" />
                {/* Asia */}
                <path d="M 480 60 L 650 60 L 680 140 L 640 180 L 480 160 Z" />
                {/* Australia */}
                <path d="M 600 250 L 680 250 L 690 290 L 620 300 Z" />
              </g>
              
              {/* Destination markers */}
              {POPULAR_DESTINATIONS.map((dest, index) => {
                const svgPos = coordsToSVG(dest.coordinates.lat, dest.coordinates.lng);
                const isSelected = selectedLocation?.name === dest.name;
                const isHovered = hoveredLocation === dest.name;
                
                return (
                  <g key={index}>
                    <circle
                      cx={svgPos.x}
                      cy={svgPos.y}
                      r={isSelected ? 8 : isHovered ? 6 : 4}
                      fill={isSelected ? "#dc2626" : isHovered ? "#ea580c" : "#2563eb"}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredLocation(dest.name)}
                      onMouseLeave={() => setHoveredLocation(null)}
                      onClick={() => onLocationSelect(dest)}
                    />
                    {(isSelected || isHovered) && (
                      <text
                        x={svgPos.x}
                        y={svgPos.y - 12}
                        textAnchor="middle"
                        className="text-xs font-medium fill-gray-900 pointer-events-none"
                        style={{ textShadow: '1px 1px 2px white' }}
                      >
                        {dest.name.split(',')[0]}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          
          {selectedLocation && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Selected: {selectedLocation.name}</span>
              </div>
              <div className="text-sm text-green-700 mt-1">
                Coordinates: {selectedLocation.coordinates.lat.toFixed(4)}, {selectedLocation.coordinates.lng.toFixed(4)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Select Grid */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">Popular Destinations</h4>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {POPULAR_DESTINATIONS.map((dest, index) => {
            const isSelected = selectedLocation?.name === dest.name;
            return (
              <button
                key={index}
                onClick={() => onLocationSelect(dest)}
                className={`
                  p-3 text-left rounded-lg border transition-all duration-200 text-sm
                  ${isSelected 
                    ? 'bg-blue-100 border-blue-300 text-blue-900' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                  }
                `}
                onMouseEnter={() => setHoveredLocation(dest.name)}
                onMouseLeave={() => setHoveredLocation(null)}
              >
                <div className="font-medium">{dest.name.split(',')[0]}</div>
                <div className="text-xs text-gray-500">{dest.country}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">💡 How to select a destination:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Click on any pin on the map above</li>
          <li>• Or choose from the popular destinations grid</li>
          <li>• Selected location will show coordinates for precise planning</li>
          <li>• You can also type a custom destination in the input field above</li>
        </ul>
      </div>
    </div>
  );
}; 