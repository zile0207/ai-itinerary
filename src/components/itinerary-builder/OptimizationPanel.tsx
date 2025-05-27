'use client';

import { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Settings,
  RefreshCw,
  Lightbulb,
  ArrowRight,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { 
  OptimizationService, 
  OptimizationSuggestion, 
  ItineraryScore, 
  OptimizationOptions,
  OptimizationPriority,
  OptimizationType
} from './OptimizationService';
import { ItineraryDay } from './TimelineView';

interface OptimizationPanelProps {
  days: ItineraryDay[];
  onApplySuggestion?: (suggestion: OptimizationSuggestion, newDays: ItineraryDay[]) => void;
  onDaysChange?: (days: ItineraryDay[]) => void;
  className?: string;
  autoAnalyze?: boolean;
}

export function OptimizationPanel({
  days,
  onApplySuggestion,
  onDaysChange,
  className,
  autoAnalyze = true
}: OptimizationPanelProps) {
  const [score, setScore] = useState<ItineraryScore | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<Partial<OptimizationOptions>>({
    priority: 'balanced',
    maxSuggestions: 8,
    minConfidence: 65,
    allowReordering: true,
    allowDayChanges: false
  });
  const [showSettings, setShowSettings] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  // Auto-analyze when days change
  useEffect(() => {
    if (autoAnalyze && days.length > 0) {
      analyzeItinerary();
    }
  }, [days, options, autoAnalyze]);

  const analyzeItinerary = async () => {
    if (days.length === 0) return;
    
    setIsAnalyzing(true);
    
    try {
      const result = await OptimizationService.analyzeItinerary(days, options);
      setScore(result.score);
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error('Error analyzing itinerary:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplySuggestion = async (suggestion: OptimizationSuggestion) => {
    try {
      const newDays = OptimizationService.applySuggestion(days, suggestion);
      setAppliedSuggestions(prev => new Set([...prev, suggestion.id]));
      onApplySuggestion?.(suggestion, newDays);
      onDaysChange?.(newDays);
      
      // Re-analyze after applying suggestion
      setTimeout(() => analyzeItinerary(), 100);
    } catch (error) {
      console.error('Error applying suggestion:', error);
    }
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSuggestionIcon = (type: OptimizationType) => {
    switch (type) {
      case 'route_optimization': return <MapPin className="h-4 w-4" />;
      case 'time_efficiency': return <Clock className="h-4 w-4" />;
      case 'proximity_grouping': return <Target className="h-4 w-4" />;
      case 'schedule_gaps': return <Zap className="h-4 w-4" />;
      case 'transportation_mode': return <TrendingUp className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (days.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg border p-6', className)}>
        <div className="text-center text-gray-500">
          <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Add activities to see optimization suggestions</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Optimization</h3>
          {isAnalyzing && (
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
            onClick={analyzeItinerary}
            disabled={isAnalyzing}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Re-analyze
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Optimization Settings</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Priority</label>
              <select
                value={options.priority}
                onChange={(e) => setOptions(prev => ({ ...prev, priority: e.target.value as OptimizationPriority }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="minimize_travel">Minimize Travel</option>
                <option value="maximize_sightseeing">Maximize Sightseeing</option>
                <option value="balanced">Balanced</option>
                <option value="time_efficient">Time Efficient</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.allowReordering}
                  onChange={(e) => setOptions(prev => ({ ...prev, allowReordering: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Allow reordering
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.allowDayChanges}
                  onChange={(e) => setOptions(prev => ({ ...prev, allowDayChanges: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Allow day changes
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Score Display */}
      {score && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Itinerary Score</h4>
            <div className={cn('px-2 py-1 rounded-full text-sm font-medium', getScoreBackground(score.overall))}>
              <span className={getScoreColor(score.overall)}>{score.overall}/100</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center">
              <div className={cn('text-lg font-semibold', getScoreColor(score.efficiency))}>
                {score.efficiency}
              </div>
              <div className="text-xs text-gray-600">Efficiency</div>
            </div>
            
            <div className="text-center">
              <div className={cn('text-lg font-semibold', getScoreColor(score.convenience))}>
                {score.convenience}
              </div>
              <div className="text-xs text-gray-600">Convenience</div>
            </div>
            
            <div className="text-center">
              <div className={cn('text-lg font-semibold', getScoreColor(score.logical))}>
                {score.logical}
              </div>
              <div className="text-xs text-gray-600">Logic</div>
            </div>
          </div>

          {score.details && (
            <div className="mt-3 text-xs text-gray-600 space-y-1">
              <div>Travel time: {score.details.totalTravelTime}h</div>
              <div>Avg distance: {score.details.averageDistance}km</div>
              <div>Time gaps: {score.details.timeGaps}</div>
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto">
        {suggestions.length > 0 ? (
          <div className="p-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Suggestions ({suggestions.length})
            </h4>
            
            {suggestions.map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                isApplied={appliedSuggestions.has(suggestion.id)}
                isExpanded={expandedSuggestion === suggestion.id}
                onApply={() => handleApplySuggestion(suggestion)}
                onDismiss={() => handleDismissSuggestion(suggestion.id)}
                onToggleExpand={() => setExpandedSuggestion(
                  expandedSuggestion === suggestion.id ? null : suggestion.id
                )}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            {isAnalyzing ? (
              <div>
                <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-blue-600" />
                <p className="text-sm">Analyzing itinerary...</p>
              </div>
            ) : (
              <div>
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm">Your itinerary looks great!</p>
                <p className="text-xs mt-1">No major optimizations needed.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Suggestion Card Component
interface SuggestionCardProps {
  suggestion: OptimizationSuggestion;
  isApplied: boolean;
  isExpanded: boolean;
  onApply: () => void;
  onDismiss: () => void;
  onToggleExpand: () => void;
}

function SuggestionCard({
  suggestion,
  isApplied,
  isExpanded,
  onApply,
  onDismiss,
  onToggleExpand
}: SuggestionCardProps) {
  const getSuggestionIcon = (type: OptimizationType) => {
    switch (type) {
      case 'route_optimization': return <MapPin className="h-4 w-4" />;
      case 'time_efficiency': return <Clock className="h-4 w-4" />;
      case 'proximity_grouping': return <Target className="h-4 w-4" />;
      case 'schedule_gaps': return <Zap className="h-4 w-4" />;
      case 'transportation_mode': return <TrendingUp className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={cn(
      'border rounded-lg p-3 transition-all',
      isApplied ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200',
      'hover:shadow-sm'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            {getSuggestionIcon(suggestion.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h5 className="text-sm font-medium text-gray-900 truncate">
                {suggestion.title}
              </h5>
              
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                getImpactColor(suggestion.impact)
              )}>
                {suggestion.impact}
              </span>
            </div>
            
            <p className="text-xs text-gray-600 mb-2">
              {suggestion.description}
            </p>
            
            {/* Savings */}
            {(suggestion.savings.time || suggestion.savings.distance) && (
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {suggestion.savings.time && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Save {suggestion.savings.time}</span>
                  </div>
                )}
                {suggestion.savings.distance && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>Save {suggestion.savings.distance}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          <div className="text-xs text-gray-500">
            {suggestion.confidence}%
          </div>
          
          <button
            onClick={onToggleExpand}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <ChevronRight className={cn(
              'h-3 w-3 transition-transform',
              isExpanded && 'rotate-90'
            )} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-600 space-y-1 mb-3">
            {suggestion.reasons.map((reason, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Score:</span>
                <span className="text-red-600">{suggestion.beforeScore}</span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <span className="text-green-600">{suggestion.afterScore}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isApplied && (
                <>
                  <button
                    onClick={onDismiss}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 rounded"
                  >
                    <ThumbsDown className="h-3 w-3" />
                    Dismiss
                  </button>
                  
                  <button
                    onClick={onApply}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded font-medium"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    Apply
                  </button>
                </>
              )}
              
              {isApplied && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Applied
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 