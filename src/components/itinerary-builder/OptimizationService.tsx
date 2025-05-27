'use client';

import { ItineraryDay, ItineraryActivity } from './TimelineView';
import { MapLocation } from './GoogleMap';
import { RouteService, RouteSegment } from './RouteService';

export type OptimizationType = 
  | 'route_optimization'
  | 'time_efficiency' 
  | 'proximity_grouping'
  | 'travel_reduction'
  | 'schedule_gaps'
  | 'transportation_mode'
  | 'activity_sequence';

export type OptimizationPriority = 'minimize_travel' | 'maximize_sightseeing' | 'balanced' | 'time_efficient';

export interface OptimizationSuggestion {
  id: string;
  type: OptimizationType;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  savings: {
    time?: string;
    distance?: string;
    timeValue?: number; // in minutes
    distanceValue?: number; // in meters
  };
  confidence: number; // 0-100
  priority: number; // 1-10, higher is more important
  affectedDays: string[];
  affectedActivities: string[];
  suggestion: {
    action: 'reorder' | 'move' | 'swap' | 'combine' | 'split' | 'change_transport';
    data: any;
  };
  beforeScore: number;
  afterScore: number;
  reasons: string[];
}

export interface ItineraryScore {
  overall: number; // 0-100
  efficiency: number;
  convenience: number;
  logical: number;
  details: {
    totalTravelTime: number;
    averageDistance: number;
    timeGaps: number;
    proximityScore: number;
    sequenceScore: number;
  };
}

export interface OptimizationOptions {
  priority: OptimizationPriority;
  maxSuggestions: number;
  minConfidence: number;
  allowReordering: boolean;
  allowDayChanges: boolean;
  preferredTransport: string; // Changed from google.maps.TravelMode to string
  maxTravelTime: number; // minutes
  considerOpeningHours: boolean;
}

class OptimizationServiceClass {
  private defaultOptions: OptimizationOptions = {
    priority: 'balanced',
    maxSuggestions: 10,
    minConfidence: 60,
    allowReordering: true,
    allowDayChanges: false,
    preferredTransport: 'DRIVING', // Changed to string literal
    maxTravelTime: 45,
    considerOpeningHours: false
  };

  private isGoogleMapsAvailable(): boolean {
    return typeof window !== 'undefined' && typeof google !== 'undefined' && !!google.maps;
  }

  private getTravelMode(mode: string): any {
    if (!this.isGoogleMapsAvailable()) {
      return mode; // Return string if Google Maps not available
    }
    
    switch (mode) {
      case 'DRIVING': return google.maps.TravelMode.DRIVING;
      case 'WALKING': return google.maps.TravelMode.WALKING;
      case 'BICYCLING': return google.maps.TravelMode.BICYCLING;
      case 'TRANSIT': return google.maps.TravelMode.TRANSIT;
      default: return google.maps.TravelMode.DRIVING;
    }
  }

  async analyzeItinerary(
    days: ItineraryDay[],
    options: Partial<OptimizationOptions> = {}
  ): Promise<{ score: ItineraryScore; suggestions: OptimizationSuggestion[] }> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Calculate current itinerary score
    const score = await this.calculateItineraryScore(days);
    
    // Generate optimization suggestions
    const suggestions: OptimizationSuggestion[] = [];
    
    // Add various types of suggestions
    suggestions.push(...await this.analyzeRouteOptimization(days, opts));
    suggestions.push(...await this.analyzeTimeEfficiency(days, opts));
    suggestions.push(...await this.analyzeProximityGrouping(days, opts));
    suggestions.push(...await this.analyzeScheduleGaps(days, opts));
    suggestions.push(...await this.analyzeTransportationModes(days, opts));
    
    // Sort by priority and confidence
    const filteredSuggestions = suggestions
      .filter(s => s.confidence >= opts.minConfidence)
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.confidence - a.confidence;
      })
      .slice(0, opts.maxSuggestions);

    return { score, suggestions: filteredSuggestions };
  }

  async calculateItineraryScore(days: ItineraryDay[]): Promise<ItineraryScore> {
    let totalTravelTime = 0;
    let totalDistance = 0;
    let timeGaps = 0;
    let proximityViolations = 0;
    let sequenceViolations = 0;
    let totalSegments = 0;

    for (const day of days) {
      const activities = day.activities.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      for (let i = 0; i < activities.length - 1; i++) {
        const current = activities[i];
        const next = activities[i + 1];
        
        // Calculate travel metrics
        const distance = this.calculateDistance(current.location, next.location);
        totalDistance += distance;
        totalSegments++;

        // Estimate travel time (rough approximation)
        const estimatedTravelTime = distance / 40; // ~40 km/h average
        totalTravelTime += estimatedTravelTime;

        // Check time gaps
        const currentEnd = new Date(current.endTime).getTime();
        const nextStart = new Date(next.startTime).getTime();
        const gap = (nextStart - currentEnd) / (1000 * 60); // minutes
        
        if (gap > 120) timeGaps++; // More than 2 hours gap
        if (gap < estimatedTravelTime) sequenceViolations++; // Not enough travel time

        // Check proximity (if distance > 20km, it's a violation)
        if (distance > 20) proximityViolations++;
      }
    }

    const averageDistance = totalSegments > 0 ? totalDistance / totalSegments : 0;
    
    // Calculate component scores (0-100)
    const efficiency = Math.max(0, 100 - (totalTravelTime * 2)); // Penalize travel time
    const convenience = Math.max(0, 100 - (proximityViolations * 20)); // Penalize distant locations
    const logical = Math.max(0, 100 - (sequenceViolations * 15) - (timeGaps * 10)); // Penalize poor sequencing

    const overall = (efficiency + convenience + logical) / 3;

    return {
      overall: Math.round(overall),
      efficiency: Math.round(efficiency),
      convenience: Math.round(convenience),
      logical: Math.round(logical),
      details: {
        totalTravelTime: Math.round(totalTravelTime),
        averageDistance: Math.round(averageDistance * 10) / 10,
        timeGaps,
        proximityScore: Math.round(convenience),
        sequenceScore: Math.round(logical)
      }
    };
  }

  private async analyzeRouteOptimization(
    days: ItineraryDay[],
    options: OptimizationOptions
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    for (const day of days) {
      if (day.activities.length < 3) continue;

      const locations = day.activities.map(a => a.location);
      
      try {
        // Calculate current route
        const currentResult = await RouteService.calculateMultipleRoutes(locations, {
          travelMode: this.getTravelMode(options.preferredTransport)
        });

        // Try optimization
        const optimizedResult = await RouteService.optimizeRoute(
          locations[0],
          locations.slice(1, -1),
          locations[locations.length - 1],
          {
            travelMode: this.getTravelMode(options.preferredTransport),
            optimizeWaypoints: true
          }
        );

        if (optimizedResult.success && currentResult.success) {
          const timeSavings = currentResult.totalDurationValue - optimizedResult.totalDurationValue;
          const distanceSavings = currentResult.totalDistanceValue - optimizedResult.totalDistanceValue;

          if (timeSavings > 600 || distanceSavings > 2000) { // 10 minutes or 2km savings
            suggestions.push({
              id: `route_opt_${day.id}`,
              type: 'route_optimization',
              title: 'Optimize route order',
              description: `Reorder activities in ${day.date} for a more efficient route`,
              impact: timeSavings > 1800 ? 'high' : timeSavings > 900 ? 'medium' : 'low',
              savings: {
                time: this.formatDuration(timeSavings),
                distance: this.formatDistance(distanceSavings),
                timeValue: Math.round(timeSavings / 60),
                distanceValue: distanceSavings
              },
              confidence: 85,
              priority: 8,
              affectedDays: [day.id],
              affectedActivities: day.activities.map(a => a.id),
              suggestion: {
                action: 'reorder',
                data: optimizedResult.segments
              },
              beforeScore: 60,
              afterScore: 80,
              reasons: [
                'Current route has inefficient ordering',
                'Optimized route reduces backtracking',
                `Save ${this.formatDuration(timeSavings)} travel time`
              ]
            });
          }
        }
      } catch (error) {
        console.warn('Route optimization analysis failed:', error);
      }
    }

    return suggestions;
  }

  private async analyzeTimeEfficiency(
    days: ItineraryDay[],
    options: OptimizationOptions
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    for (const day of days) {
      const activities = day.activities.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      for (let i = 0; i < activities.length - 1; i++) {
        const current = activities[i];
        const next = activities[i + 1];
        
        const currentEnd = new Date(current.endTime);
        const nextStart = new Date(next.startTime);
        const gap = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60); // minutes

        // Suggest combining short gaps
        if (gap > 15 && gap < 60) {
          suggestions.push({
            id: `time_gap_${current.id}_${next.id}`,
            type: 'schedule_gaps',
            title: 'Close scheduling gap',
            description: `${gap}min gap between ${current.title} and ${next.title}`,
            impact: 'low',
            savings: { time: `${Math.round(gap)}min`, timeValue: gap },
            confidence: 70,
            priority: 4,
            affectedDays: [day.id],
            affectedActivities: [current.id, next.id],
            suggestion: {
              action: 'combine',
              data: { earlierEnd: current.id, laterStart: next.id, gap }
            },
            beforeScore: 70,
            afterScore: 75,
            reasons: [
              'Small gap can be eliminated',
              'Better time utilization',
              'Smoother day flow'
            ]
          });
        }
      }
    }

    return suggestions;
  }

  private async analyzeProximityGrouping(
    days: ItineraryDay[],
    options: OptimizationOptions
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Find activities that are close but on different days
    for (let i = 0; i < days.length - 1; i++) {
      for (let j = i + 1; j < days.length; j++) {
        const day1 = days[i];
        const day2 = days[j];

        for (const act1 of day1.activities) {
          for (const act2 of day2.activities) {
            const distance = this.calculateDistance(act1.location, act2.location);
            
            if (distance < 2 && options.allowDayChanges) { // Within 2km
              suggestions.push({
                id: `proximity_${act1.id}_${act2.id}`,
                type: 'proximity_grouping',
                title: 'Group nearby activities',
                description: `${act1.title} and ${act2.title} are only ${this.formatDistance(distance * 1000)} apart`,
                impact: 'medium',
                savings: {
                  distance: this.formatDistance(distance * 1000),
                  distanceValue: distance * 1000
                },
                confidence: 75,
                priority: 6,
                affectedDays: [day1.id, day2.id],
                affectedActivities: [act1.id, act2.id],
                suggestion: {
                  action: 'move',
                  data: { 
                    activityId: act2.id, 
                    fromDay: day2.id, 
                    toDay: day1.id 
                  }
                },
                beforeScore: 65,
                afterScore: 78,
                reasons: [
                  'Activities are very close geographically',
                  'Can reduce daily travel distances',
                  'Better area utilization'
                ]
              });
            }
          }
        }
      }
    }

    return suggestions;
  }

  private async analyzeScheduleGaps(
    days: ItineraryDay[],
    options: OptimizationOptions
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    for (const day of days) {
      const activities = day.activities.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      for (let i = 0; i < activities.length - 1; i++) {
        const current = activities[i];
        const next = activities[i + 1];
        
        const gap = (new Date(next.startTime).getTime() - new Date(current.endTime).getTime()) / (1000 * 60 * 60); // hours

        if (gap > 3) { // More than 3 hours gap
          suggestions.push({
            id: `schedule_gap_${current.id}_${next.id}`,
            type: 'schedule_gaps',
            title: 'Large scheduling gap detected',
            description: `${gap.toFixed(1)}h gap between activities`,
            impact: gap > 5 ? 'high' : 'medium',
            savings: { time: `${gap.toFixed(1)}h`, timeValue: gap * 60 },
            confidence: 80,
            priority: 7,
            affectedDays: [day.id],
            affectedActivities: [current.id, next.id],
            suggestion: {
              action: 'split',
              data: { gapStart: current.endTime, gapEnd: next.startTime, duration: gap }
            },
            beforeScore: 60,
            afterScore: 75,
            reasons: [
              'Large time gap may indicate poor planning',
              'Consider adding activity or adjusting times',
              'Better day structure needed'
            ]
          });
        }
      }
    }

    return suggestions;
  }

  private async analyzeTransportationModes(
    days: ItineraryDay[],
    options: OptimizationOptions
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    for (const day of days) {
      for (let i = 0; i < day.activities.length - 1; i++) {
        const current = day.activities[i];
        const next = day.activities[i + 1];
        const distance = this.calculateDistance(current.location, next.location);

        // Suggest walking for short distances
        if (distance < 1.5) { // Less than 1.5km
          suggestions.push({
            id: `transport_walk_${current.id}_${next.id}`,
            type: 'transportation_mode',
            title: 'Consider walking',
            description: `${this.formatDistance(distance * 1000)} walk between activities`,
            impact: 'low',
            savings: { distance: '0km' }, // Walking saves vehicle use
            confidence: 85,
            priority: 3,
            affectedDays: [day.id],
            affectedActivities: [current.id, next.id],
            suggestion: {
              action: 'change_transport',
              data: { mode: 'walking', from: current.id, to: next.id }
            },
            beforeScore: 70,
            afterScore: 75,
            reasons: [
              'Short distance ideal for walking',
              'No parking needed',
              'Environmental friendly option'
            ]
          });
        }
      }
    }

    return suggestions;
  }

  applySuggestion(
    days: ItineraryDay[],
    suggestion: OptimizationSuggestion
  ): ItineraryDay[] {
    const newDays = JSON.parse(JSON.stringify(days)); // Deep clone

    switch (suggestion.suggestion.action) {
      case 'reorder':
        return this.applyReorderSuggestion(newDays, suggestion);
      case 'move':
        return this.applyMoveSuggestion(newDays, suggestion);
      case 'combine':
        return this.applyCombineSuggestion(newDays, suggestion);
      default:
        console.warn('Unknown suggestion action:', suggestion.suggestion.action);
        return newDays;
    }
  }

  private applyReorderSuggestion(days: ItineraryDay[], suggestion: OptimizationSuggestion): ItineraryDay[] {
    const dayId = suggestion.affectedDays[0];
    const day = days.find(d => d.id === dayId);
    if (!day) return days;

    // Reorder based on optimized route segments
    const segments = suggestion.suggestion.data as RouteSegment[];
    const newOrder: ItineraryActivity[] = [];

    // Build new activity order from route segments
    if (segments.length > 0) {
      newOrder.push(day.activities.find(a => a.location.id === segments[0].origin.id)!);
      
      for (const segment of segments) {
        const destActivity = day.activities.find(a => a.location.id === segment.destination.id);
        if (destActivity && !newOrder.find(a => a.id === destActivity.id)) {
          newOrder.push(destActivity);
        }
      }
    }

    // Update the day with reordered activities
    day.activities = newOrder.filter(Boolean);
    return days;
  }

  private applyMoveSuggestion(days: ItineraryDay[], suggestion: OptimizationSuggestion): ItineraryDay[] {
    const { activityId, fromDay, toDay } = suggestion.suggestion.data;
    
    const fromDayObj = days.find(d => d.id === fromDay);
    const toDayObj = days.find(d => d.id === toDay);
    
    if (!fromDayObj || !toDayObj) return days;

    const activityIndex = fromDayObj.activities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) return days;

    const activity = fromDayObj.activities[activityIndex];
    fromDayObj.activities.splice(activityIndex, 1);
    toDayObj.activities.push(activity);

    return days;
  }

  private applyCombineSuggestion(days: ItineraryDay[], suggestion: OptimizationSuggestion): ItineraryDay[] {
    const { earlierEnd, laterStart } = suggestion.suggestion.data;
    
    for (const day of days) {
      const earlierActivity = day.activities.find(a => a.id === earlierEnd);
      const laterActivity = day.activities.find(a => a.id === laterStart);
      
      if (earlierActivity && laterActivity) {
        // Extend earlier activity or move later activity start time
        laterActivity.startTime = earlierActivity.endTime;
        break;
      }
    }

    return days;
  }

  private calculateDistance(loc1: MapLocation, loc2: MapLocation): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLon = this.toRadians(loc2.lng - loc1.lng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(loc1.lat)) * Math.cos(this.toRadians(loc2.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
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
}

// Export singleton instance
export const OptimizationService = new OptimizationServiceClass(); 