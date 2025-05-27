/**
 * Data Freshness Validation System
 * 
 * Provides comprehensive data freshness tracking, validation, and re-verification
 * for travel information to ensure users receive current and accurate data.
 */

import { Citation } from './citation-manager';

// Data freshness interfaces
export interface FreshnessMetadata {
  dataTimestamp: string;
  sourceTimestamp?: string;
  lastValidated: string;
  validationMethod: ValidationMethod;
  freshnessScore: number; // 0-1 score
  expiryDate: string;
  stalenessIndicators: StalenessIndicator[];
  refreshRecommendation: RefreshRecommendation;
}

export interface StalenessIndicator {
  type: StalenessType;
  severity: StalenessSeverity;
  message: string;
  detectedAt: string;
  threshold: number;
  actualValue: number;
}

export interface RefreshRecommendation {
  shouldRefresh: boolean;
  urgency: RefreshUrgency;
  reason: string;
  estimatedCost?: number; // API call cost estimate
  alternatives?: string[];
}

export interface DataFreshnessConfig {
  maxAge: {
    general: number; // hours
    pricing: number; // hours
    events: number; // hours
    weather: number; // hours
    transportation: number; // hours
    accommodation: number; // hours
  };
  validationInterval: number; // hours
  stalenessThresholds: {
    warning: number; // hours
    critical: number; // hours
  };
  autoRefreshEnabled: boolean;
  costThreshold: number; // max cost for auto-refresh
}

export interface FreshnessValidationResult {
  isValid: boolean;
  isFresh: boolean;
  freshnessScore: number;
  metadata: FreshnessMetadata;
  recommendations: RefreshRecommendation[];
  issues: StalenessIndicator[];
  nextValidation: string;
}

export interface DataSource {
  id: string;
  type: DataSourceType;
  url?: string;
  lastAccessed: string;
  responseTime: number;
  reliability: number; // 0-1 score
  freshnessMetadata: FreshnessMetadata;
}

// Enums
export enum ValidationMethod {
  TIMESTAMP_CHECK = 'timestamp_check',
  CONTENT_HASH = 'content_hash',
  API_VERIFICATION = 'api_verification',
  MANUAL_REVIEW = 'manual_review',
  AUTOMATED_SCRAPING = 'automated_scraping'
}

export enum StalenessType {
  AGE_EXCEEDED = 'age_exceeded',
  SOURCE_OUTDATED = 'source_outdated',
  CONTENT_CHANGED = 'content_changed',
  SEASONAL_DRIFT = 'seasonal_drift',
  PRICE_VOLATILITY = 'price_volatility',
  EVENT_EXPIRED = 'event_expired',
  POLICY_CHANGED = 'policy_changed'
}

export enum StalenessSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RefreshUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  IMMEDIATE = 'immediate'
}

export enum DataSourceType {
  PERPLEXITY_RESEARCH = 'perplexity_research',
  PRICING_API = 'pricing_api',
  WEATHER_API = 'weather_api',
  EVENTS_API = 'events_api',
  TRANSPORTATION_API = 'transportation_api',
  ACCOMMODATION_API = 'accommodation_api',
  USER_GENERATED = 'user_generated',
  CACHED_DATA = 'cached_data'
}

// Data Freshness Manager
export class DataFreshnessManager {
  private config: DataFreshnessConfig;
  private dataSources: Map<string, DataSource> = new Map();
  private validationHistory: Map<string, FreshnessValidationResult[]> = new Map();

  constructor(config?: Partial<DataFreshnessConfig>) {
    this.config = {
      maxAge: {
        general: 24, // 24 hours
        pricing: 6,  // 6 hours
        events: 12,  // 12 hours
        weather: 3,  // 3 hours
        transportation: 8, // 8 hours
        accommodation: 12  // 12 hours
      },
      validationInterval: 4, // 4 hours
      stalenessThresholds: {
        warning: 12, // 12 hours
        critical: 48 // 48 hours
      },
      autoRefreshEnabled: true,
      costThreshold: 0.10, // $0.10
      ...config
    };
  }

  /**
   * Validate data freshness for a given data source
   */
  validateFreshness(
    dataId: string, 
    data: any, 
    sourceType: DataSourceType,
    citations?: Citation[]
  ): FreshnessValidationResult {
    const dataSource = this.getOrCreateDataSource(dataId, sourceType, data);
    const freshnessMetadata = this.calculateFreshnessMetadata(dataSource, data, citations);
    
    const stalenessIndicators = this.detectStalenessIndicators(dataSource, freshnessMetadata);
    const refreshRecommendations = this.generateRefreshRecommendations(
      dataSource, 
      freshnessMetadata, 
      stalenessIndicators
    );

    const result: FreshnessValidationResult = {
      isValid: stalenessIndicators.filter(i => i.severity === StalenessSeverity.CRITICAL).length === 0,
      isFresh: freshnessMetadata.freshnessScore >= 0.7,
      freshnessScore: freshnessMetadata.freshnessScore,
      metadata: freshnessMetadata,
      recommendations: refreshRecommendations,
      issues: stalenessIndicators,
      nextValidation: this.calculateNextValidation(dataSource)
    };

    // Store validation result
    this.storeValidationResult(dataId, result);
    
    // Update data source
    dataSource.freshnessMetadata = freshnessMetadata;
    dataSource.lastAccessed = new Date().toISOString();
    this.dataSources.set(dataId, dataSource);

    return result;
  }

  /**
   * Validate freshness for itinerary data
   */
  validateItineraryFreshness(itinerary: any): {
    overall: FreshnessValidationResult;
    byComponent: Record<string, FreshnessValidationResult>;
    recommendations: string[];
  } {
    const componentResults: Record<string, FreshnessValidationResult> = {};
    const allIssues: StalenessIndicator[] = [];
    const allRecommendations: RefreshRecommendation[] = [];

    // Validate metadata freshness
    if (itinerary.metadata) {
      componentResults.metadata = this.validateFreshness(
        `${itinerary.id}_metadata`,
        itinerary.metadata,
        DataSourceType.PERPLEXITY_RESEARCH,
        itinerary.metadata.citationData
      );
      allIssues.push(...componentResults.metadata.issues);
      allRecommendations.push(...componentResults.metadata.recommendations);
    }

    // Validate pricing data
    if (itinerary.totalCost) {
      componentResults.pricing = this.validateFreshness(
        `${itinerary.id}_pricing`,
        itinerary.totalCost,
        DataSourceType.PRICING_API
      );
      allIssues.push(...componentResults.pricing.issues);
      allRecommendations.push(...componentResults.pricing.recommendations);
    }

    // Validate daily activities
    if (itinerary.days) {
      itinerary.days.forEach((day: any, index: number) => {
        const dayResult = this.validateFreshness(
          `${itinerary.id}_day_${index}`,
          day,
          DataSourceType.PERPLEXITY_RESEARCH
        );
        componentResults[`day_${index}`] = dayResult;
        allIssues.push(...dayResult.issues);
        allRecommendations.push(...dayResult.recommendations);
      });
    }

    // Calculate overall freshness
    const overallScore = Object.values(componentResults)
      .reduce((sum, result) => sum + result.freshnessScore, 0) / Object.keys(componentResults).length;

    const overallResult: FreshnessValidationResult = {
      isValid: allIssues.filter(i => i.severity === StalenessSeverity.CRITICAL).length === 0,
      isFresh: overallScore >= 0.7,
      freshnessScore: overallScore,
      metadata: this.createOverallMetadata(componentResults),
      recommendations: this.deduplicateRecommendations(allRecommendations),
      issues: allIssues,
      nextValidation: this.calculateNextValidation()
    };

    return {
      overall: overallResult,
      byComponent: componentResults,
      recommendations: this.generateActionableRecommendations(overallResult, componentResults)
    };
  }

  /**
   * Check if data needs refresh based on age and staleness
   */
  needsRefresh(dataId: string): boolean {
    const dataSource = this.dataSources.get(dataId);
    if (!dataSource) return true;

    const validation = this.validateFreshness(dataId, {}, dataSource.type);
    return !validation.isFresh || validation.recommendations.some(r => r.shouldRefresh);
  }

  /**
   * Get refresh cost estimate
   */
  getRefreshCostEstimate(dataId: string, refreshType: 'partial' | 'full' = 'partial'): number {
    const dataSource = this.dataSources.get(dataId);
    if (!dataSource) return 0.05; // Default cost

    // Cost estimation based on data source type and refresh scope
    const baseCosts = {
      [DataSourceType.PERPLEXITY_RESEARCH]: 0.08,
      [DataSourceType.PRICING_API]: 0.03,
      [DataSourceType.WEATHER_API]: 0.01,
      [DataSourceType.EVENTS_API]: 0.02,
      [DataSourceType.TRANSPORTATION_API]: 0.04,
      [DataSourceType.ACCOMMODATION_API]: 0.03,
      [DataSourceType.USER_GENERATED]: 0.00,
      [DataSourceType.CACHED_DATA]: 0.00
    };

    const baseCost = baseCosts[dataSource.type] || 0.05;
    const multiplier = refreshType === 'full' ? 2.5 : 1.0;
    
    return baseCost * multiplier;
  }

  /**
   * Schedule automatic refresh if enabled and cost-effective
   */
  scheduleAutoRefresh(dataId: string): boolean {
    if (!this.config.autoRefreshEnabled) return false;

    const cost = this.getRefreshCostEstimate(dataId);
    if (cost > this.config.costThreshold) return false;

    const dataSource = this.dataSources.get(dataId);
    if (!dataSource) return false;

    const validation = this.validateFreshness(dataId, {}, dataSource.type);
    const urgentRefresh = validation.recommendations.some(r => 
      r.shouldRefresh && (r.urgency === RefreshUrgency.HIGH || r.urgency === RefreshUrgency.IMMEDIATE)
    );

    if (urgentRefresh) {
      // In a real implementation, this would trigger an actual refresh
      console.log(`Scheduling auto-refresh for ${dataId} (cost: $${cost.toFixed(3)})`);
      return true;
    }

    return false;
  }

  /**
   * Get freshness statistics for monitoring
   */
  getFreshnessStatistics(): {
    totalSources: number;
    freshSources: number;
    staleSources: number;
    criticalSources: number;
    averageFreshness: number;
    oldestSource: { id: string; age: number };
    refreshCandidates: string[];
  } {
    const sources = Array.from(this.dataSources.values());
    
    const freshSources = sources.filter(s => s.freshnessMetadata.freshnessScore >= 0.7);
    const staleSources = sources.filter(s => s.freshnessMetadata.freshnessScore < 0.7);
    const criticalSources = sources.filter(s => 
      s.freshnessMetadata.stalenessIndicators.some(i => i.severity === StalenessSeverity.CRITICAL)
    );

    const averageFreshness = sources.length > 0 
      ? sources.reduce((sum, s) => sum + s.freshnessMetadata.freshnessScore, 0) / sources.length 
      : 0;

    const oldestSource = sources.reduce((oldest, current) => {
      const currentAge = Date.now() - new Date(current.freshnessMetadata.dataTimestamp).getTime();
      const oldestAge = Date.now() - new Date(oldest?.freshnessMetadata?.dataTimestamp || 0).getTime();
      return currentAge > oldestAge ? current : oldest;
    }, sources[0]);

    const refreshCandidates = sources
      .filter(s => this.needsRefresh(s.id))
      .map(s => s.id);

    return {
      totalSources: sources.length,
      freshSources: freshSources.length,
      staleSources: staleSources.length,
      criticalSources: criticalSources.length,
      averageFreshness,
      oldestSource: oldestSource ? {
        id: oldestSource.id,
        age: (Date.now() - new Date(oldestSource.freshnessMetadata.dataTimestamp).getTime()) / (1000 * 60 * 60) // hours
      } : { id: '', age: 0 },
      refreshCandidates
    };
  }

  /**
   * Private helper methods
   */

  private getOrCreateDataSource(dataId: string, type: DataSourceType, data: any): DataSource {
    if (this.dataSources.has(dataId)) {
      return this.dataSources.get(dataId)!;
    }

    const dataSource: DataSource = {
      id: dataId,
      type,
      lastAccessed: new Date().toISOString(),
      responseTime: 0,
      reliability: 0.8, // Default reliability
      freshnessMetadata: {
        dataTimestamp: new Date().toISOString(),
        lastValidated: new Date().toISOString(),
        validationMethod: ValidationMethod.TIMESTAMP_CHECK,
        freshnessScore: 1.0,
        expiryDate: this.calculateExpiryDate(type),
        stalenessIndicators: [],
        refreshRecommendation: {
          shouldRefresh: false,
          urgency: RefreshUrgency.LOW,
          reason: 'Data is fresh'
        }
      }
    };

    this.dataSources.set(dataId, dataSource);
    return dataSource;
  }

  private calculateFreshnessMetadata(
    dataSource: DataSource, 
    data: any, 
    citations?: Citation[]
  ): FreshnessMetadata {
    const now = new Date();
    const dataAge = now.getTime() - new Date(dataSource.freshnessMetadata.dataTimestamp).getTime();
    const ageHours = dataAge / (1000 * 60 * 60);

    // Calculate freshness score based on age and type
    const maxAge = this.getMaxAgeForType(dataSource.type);
    const freshnessScore = Math.max(0, Math.min(1, 1 - (ageHours / maxAge)));

    // Extract source timestamp from citations if available
    let sourceTimestamp: string | undefined;
    if (citations && citations.length > 0) {
      const mostRecentCitation = citations
        .filter(c => c.publishDate)
        .sort((a, b) => new Date(b.publishDate!).getTime() - new Date(a.publishDate!).getTime())[0];
      sourceTimestamp = mostRecentCitation?.publishDate;
    }

    return {
      dataTimestamp: dataSource.freshnessMetadata.dataTimestamp,
      sourceTimestamp,
      lastValidated: now.toISOString(),
      validationMethod: ValidationMethod.TIMESTAMP_CHECK,
      freshnessScore,
      expiryDate: this.calculateExpiryDate(dataSource.type),
      stalenessIndicators: [],
      refreshRecommendation: {
        shouldRefresh: freshnessScore < 0.7,
        urgency: this.calculateRefreshUrgency(freshnessScore, ageHours),
        reason: this.generateRefreshReason(freshnessScore, ageHours, dataSource.type)
      }
    };
  }

  private detectStalenessIndicators(
    dataSource: DataSource, 
    metadata: FreshnessMetadata
  ): StalenessIndicator[] {
    const indicators: StalenessIndicator[] = [];
    const now = new Date();
    const dataAge = now.getTime() - new Date(metadata.dataTimestamp).getTime();
    const ageHours = dataAge / (1000 * 60 * 60);

    // Age-based staleness
    if (ageHours > this.config.stalenessThresholds.critical) {
      indicators.push({
        type: StalenessType.AGE_EXCEEDED,
        severity: StalenessSeverity.CRITICAL,
        message: `Data is ${Math.round(ageHours)} hours old (critical threshold: ${this.config.stalenessThresholds.critical}h)`,
        detectedAt: now.toISOString(),
        threshold: this.config.stalenessThresholds.critical,
        actualValue: ageHours
      });
    } else if (ageHours > this.config.stalenessThresholds.warning) {
      indicators.push({
        type: StalenessType.AGE_EXCEEDED,
        severity: StalenessSeverity.MEDIUM,
        message: `Data is ${Math.round(ageHours)} hours old (warning threshold: ${this.config.stalenessThresholds.warning}h)`,
        detectedAt: now.toISOString(),
        threshold: this.config.stalenessThresholds.warning,
        actualValue: ageHours
      });
    }

    // Type-specific staleness checks
    const maxAge = this.getMaxAgeForType(dataSource.type);
    if (ageHours > maxAge) {
      indicators.push({
        type: StalenessType.SOURCE_OUTDATED,
        severity: ageHours > maxAge * 2 ? StalenessSeverity.HIGH : StalenessSeverity.MEDIUM,
        message: `${dataSource.type} data exceeds recommended age of ${maxAge} hours`,
        detectedAt: now.toISOString(),
        threshold: maxAge,
        actualValue: ageHours
      });
    }

    return indicators;
  }

  private generateRefreshRecommendations(
    dataSource: DataSource,
    metadata: FreshnessMetadata,
    indicators: StalenessIndicator[]
  ): RefreshRecommendation[] {
    const recommendations: RefreshRecommendation[] = [];

    const criticalIssues = indicators.filter(i => i.severity === StalenessSeverity.CRITICAL);
    const highIssues = indicators.filter(i => i.severity === StalenessSeverity.HIGH);

    if (criticalIssues.length > 0) {
      recommendations.push({
        shouldRefresh: true,
        urgency: RefreshUrgency.IMMEDIATE,
        reason: 'Critical staleness detected - immediate refresh required',
        estimatedCost: this.getRefreshCostEstimate(dataSource.id, 'full'),
        alternatives: ['Use cached data with staleness warning', 'Request user confirmation']
      });
    } else if (highIssues.length > 0) {
      recommendations.push({
        shouldRefresh: true,
        urgency: RefreshUrgency.HIGH,
        reason: 'High staleness detected - refresh recommended',
        estimatedCost: this.getRefreshCostEstimate(dataSource.id, 'partial'),
        alternatives: ['Schedule refresh for off-peak hours', 'Use cached data with warning']
      });
    } else if (metadata.freshnessScore < 0.7) {
      recommendations.push({
        shouldRefresh: true,
        urgency: RefreshUrgency.MEDIUM,
        reason: 'Data freshness below threshold - refresh suggested',
        estimatedCost: this.getRefreshCostEstimate(dataSource.id, 'partial'),
        alternatives: ['Schedule background refresh', 'Continue with current data']
      });
    }

    return recommendations;
  }

  private getMaxAgeForType(type: DataSourceType): number {
    switch (type) {
      case DataSourceType.PRICING_API:
        return this.config.maxAge.pricing;
      case DataSourceType.WEATHER_API:
        return this.config.maxAge.weather;
      case DataSourceType.EVENTS_API:
        return this.config.maxAge.events;
      case DataSourceType.TRANSPORTATION_API:
        return this.config.maxAge.transportation;
      case DataSourceType.ACCOMMODATION_API:
        return this.config.maxAge.accommodation;
      default:
        return this.config.maxAge.general;
    }
  }

  private calculateExpiryDate(type: DataSourceType): string {
    const maxAge = this.getMaxAgeForType(type);
    const expiryDate = new Date(Date.now() + maxAge * 60 * 60 * 1000);
    return expiryDate.toISOString();
  }

  private calculateRefreshUrgency(freshnessScore: number, ageHours: number): RefreshUrgency {
    if (freshnessScore < 0.3 || ageHours > this.config.stalenessThresholds.critical) {
      return RefreshUrgency.IMMEDIATE;
    } else if (freshnessScore < 0.5 || ageHours > this.config.stalenessThresholds.warning) {
      return RefreshUrgency.HIGH;
    } else if (freshnessScore < 0.7) {
      return RefreshUrgency.MEDIUM;
    }
    return RefreshUrgency.LOW;
  }

  private generateRefreshReason(freshnessScore: number, ageHours: number, type: DataSourceType): string {
    if (freshnessScore < 0.3) {
      return `Data freshness critically low (${Math.round(freshnessScore * 100)}%)`;
    } else if (ageHours > this.getMaxAgeForType(type)) {
      return `Data age exceeds ${type} threshold (${Math.round(ageHours)}h)`;
    } else if (freshnessScore < 0.7) {
      return `Data freshness below optimal level (${Math.round(freshnessScore * 100)}%)`;
    }
    return 'Data is fresh';
  }

  private calculateNextValidation(dataSource?: DataSource): string {
    const interval = this.config.validationInterval;
    const nextValidation = new Date(Date.now() + interval * 60 * 60 * 1000);
    return nextValidation.toISOString();
  }

  private createOverallMetadata(componentResults: Record<string, FreshnessValidationResult>): FreshnessMetadata {
    const results = Object.values(componentResults);
    const averageScore = results.reduce((sum, r) => sum + r.freshnessScore, 0) / results.length;
    
    return {
      dataTimestamp: new Date().toISOString(),
      lastValidated: new Date().toISOString(),
      validationMethod: ValidationMethod.TIMESTAMP_CHECK,
      freshnessScore: averageScore,
      expiryDate: this.calculateExpiryDate(DataSourceType.PERPLEXITY_RESEARCH),
      stalenessIndicators: results.flatMap(r => r.issues),
      refreshRecommendation: {
        shouldRefresh: averageScore < 0.7,
        urgency: this.calculateRefreshUrgency(averageScore, 0),
        reason: `Overall freshness: ${Math.round(averageScore * 100)}%`
      }
    };
  }

  private deduplicateRecommendations(recommendations: RefreshRecommendation[]): RefreshRecommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.urgency}_${rec.reason}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private generateActionableRecommendations(
    overall: FreshnessValidationResult,
    components: Record<string, FreshnessValidationResult>
  ): string[] {
    const recommendations: string[] = [];

    if (!overall.isFresh) {
      recommendations.push('Consider refreshing itinerary data to ensure accuracy');
    }

    const criticalComponents = Object.entries(components)
      .filter(([_, result]) => result.issues.some(i => i.severity === StalenessSeverity.CRITICAL));

    if (criticalComponents.length > 0) {
      recommendations.push(`Critical data staleness detected in: ${criticalComponents.map(([name]) => name).join(', ')}`);
    }

    const pricingComponent = components.pricing;
    if (pricingComponent && !pricingComponent.isFresh) {
      recommendations.push('Pricing information may be outdated - verify current rates');
    }

    return recommendations;
  }

  private storeValidationResult(dataId: string, result: FreshnessValidationResult): void {
    if (!this.validationHistory.has(dataId)) {
      this.validationHistory.set(dataId, []);
    }
    
    const history = this.validationHistory.get(dataId)!;
    history.push(result);
    
    // Keep only last 10 validation results
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }
}

// Export default instance
export const dataFreshnessManager = new DataFreshnessManager();

// Utility functions
export function validateItineraryFreshness(itinerary: any) {
  return dataFreshnessManager.validateItineraryFreshness(itinerary);
}

export function checkDataFreshness(dataId: string, data: any, sourceType: DataSourceType) {
  return dataFreshnessManager.validateFreshness(dataId, data, sourceType);
}

export function getFreshnessStatistics() {
  return dataFreshnessManager.getFreshnessStatistics();
} 