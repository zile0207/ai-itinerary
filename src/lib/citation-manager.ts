/**
 * Citation Management System
 * 
 * Provides comprehensive citation handling for Perplexity AI research results including:
 * - Citation parsing and validation
 * - Multiple citation formats (APA, MLA, Chicago, Web)
 * - Citation storage and retrieval
 * - Citation quality assessment
 * - Duplicate detection and merging
 * - Citation metadata extraction
 */

import { URL } from 'url';

// Citation types and interfaces
export interface Citation {
  id: string;
  url: string;
  title: string;
  domain: string;
  snippet?: string;
  accessDate: string;
  publishDate?: string;
  author?: string;
  siteName?: string;
  type: CitationType;
  quality: CitationQuality;
  metadata: CitationMetadata;
  relevanceScore?: number;
}

export interface CitationMetadata {
  extractedAt: string;
  sourceType: SourceType;
  language?: string;
  wordCount?: number;
  imageCount?: number;
  lastModified?: string;
  contentHash?: string;
  trustScore: number; // 0-1 based on domain reputation and content quality
  isPaywalled?: boolean;
  requiresLogin?: boolean;
}

export interface CitationQuality {
  score: number; // 0-1 overall quality score
  factors: {
    domainReputation: number;
    contentFreshness: number;
    relevanceToQuery: number;
    authorCredibility: number;
    sourceReliability: number;
  };
  issues: CitationIssue[];
  recommendations: string[];
}

export interface CitationIssue {
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  suggestion?: string;
}

export interface FormattedCitation {
  format: CitationFormat;
  text: string;
  html: string;
  shortForm: string;
  inlineForm: string;
}

export interface CitationGroup {
  topic: string;
  citations: Citation[];
  relevanceScore: number;
  summary?: string;
}

// Enums
export enum CitationType {
  WEBSITE = 'website',
  NEWS_ARTICLE = 'news_article',
  BLOG_POST = 'blog_post',
  ACADEMIC_PAPER = 'academic_paper',
  GOVERNMENT_SITE = 'government_site',
  TRAVEL_GUIDE = 'travel_guide',
  REVIEW_SITE = 'review_site',
  SOCIAL_MEDIA = 'social_media',
  FORUM = 'forum',
  WIKI = 'wiki',
  UNKNOWN = 'unknown'
}

export enum SourceType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  UNKNOWN = 'unknown'
}

export enum CitationFormat {
  APA = 'apa',
  MLA = 'mla',
  CHICAGO = 'chicago',
  WEB = 'web',
  INLINE = 'inline',
  SHORT = 'short'
}

export enum IssueType {
  BROKEN_LINK = 'broken_link',
  OUTDATED_CONTENT = 'outdated_content',
  LOW_QUALITY_SOURCE = 'low_quality_source',
  PAYWALL = 'paywall',
  MISSING_METADATA = 'missing_metadata',
  DUPLICATE_SOURCE = 'duplicate_source',
  UNRELIABLE_DOMAIN = 'unreliable_domain',
  INSUFFICIENT_CONTENT = 'insufficient_content'
}

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Citation parsing and validation
export class CitationManager {
  private citations: Map<string, Citation> = new Map();
  private domainReputationCache: Map<string, number> = new Map();
  private duplicateThreshold = 0.8; // Similarity threshold for duplicate detection

  constructor() {
    this.initializeDomainReputations();
  }

  /**
   * Parse citations from Perplexity API response
   */
  parseCitations(citationsData: unknown[]): Citation[] {
    if (!Array.isArray(citationsData)) {
      return [];
    }

    const parsedCitations: Citation[] = [];

    for (const citationData of citationsData) {
      try {
        const citation = this.parseSingleCitation(citationData);
        if (citation) {
          parsedCitations.push(citation);
        }
      } catch (error) {
        console.warn('Failed to parse citation:', error);
      }
    }

    return this.deduplicateCitations(parsedCitations);
  }

  /**
   * Parse a single citation from raw data
   */
  private parseSingleCitation(data: unknown): Citation | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const citationData = data as Record<string, unknown>;
    
    // Extract URL and validate
    const url = this.extractString(citationData, 'url');
    if (!url || !this.isValidUrl(url)) {
      return null;
    }

    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;

    // Extract basic information
    const title = this.extractString(citationData, 'title') || this.generateTitleFromUrl(url);
    const snippet = this.extractString(citationData, 'snippet') || this.extractString(citationData, 'text');
    const author = this.extractString(citationData, 'author');
    const siteName = this.extractString(citationData, 'site_name') || domain;
    const publishDate = this.extractString(citationData, 'published_date') || this.extractString(citationData, 'date');

    // Generate citation ID
    const id = this.generateCitationId(url, title);

    // Determine citation type
    const type = this.determineCitationType(url, domain, title, siteName);

    // Extract metadata
    const metadata = this.extractMetadata(citationData, domain);

    // Assess citation quality
    const quality = this.assessCitationQuality(url, domain, title, snippet, author, publishDate, metadata);

    const citation: Citation = {
      id,
      url,
      title,
      domain,
      snippet,
      accessDate: new Date().toISOString(),
      publishDate,
      author,
      siteName,
      type,
      quality,
      metadata
    };

    // Store citation
    this.citations.set(id, citation);

    return citation;
  }

  /**
   * Validate and enhance citations
   */
  async validateCitations(citations: Citation[]): Promise<Citation[]> {
    const validatedCitations: Citation[] = [];

    for (const citation of citations) {
      try {
        const validatedCitation = await this.validateSingleCitation(citation);
        if (validatedCitation) {
          validatedCitations.push(validatedCitation);
        }
      } catch (error) {
        console.warn(`Failed to validate citation ${citation.id}:`, error);
        // Include original citation with validation issues noted
        citation.quality.issues.push({
          type: IssueType.MISSING_METADATA,
          severity: IssueSeverity.MEDIUM,
          message: 'Citation validation failed',
          suggestion: 'Manual verification recommended'
        });
        validatedCitations.push(citation);
      }
    }

    return validatedCitations;
  }

  /**
   * Validate a single citation
   */
  private async validateSingleCitation(citation: Citation): Promise<Citation | null> {
    // Check URL accessibility (simplified - in production, you might want to actually fetch)
    if (!this.isValidUrl(citation.url)) {
      citation.quality.issues.push({
        type: IssueType.BROKEN_LINK,
        severity: IssueSeverity.HIGH,
        message: 'Invalid or malformed URL',
        suggestion: 'Verify URL format and accessibility'
      });
    }

    // Check content freshness
    if (citation.publishDate) {
      const publishedDate = new Date(citation.publishDate);
      const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSincePublished > 365) {
        citation.quality.issues.push({
          type: IssueType.OUTDATED_CONTENT,
          severity: IssueSeverity.MEDIUM,
          message: `Content is ${Math.round(daysSincePublished)} days old`,
          suggestion: 'Consider finding more recent sources'
        });
      }
    }

    // Check domain reputation
    const domainReputation = this.getDomainReputation(citation.domain);
    if (domainReputation < 0.5) {
      citation.quality.issues.push({
        type: IssueType.UNRELIABLE_DOMAIN,
        severity: IssueSeverity.HIGH,
        message: 'Domain has low reputation score',
        suggestion: 'Verify information with additional sources'
      });
    }

    // Update quality score based on validation
    citation.quality = this.assessCitationQuality(
      citation.url,
      citation.domain,
      citation.title,
      citation.snippet,
      citation.author,
      citation.publishDate,
      citation.metadata
    );

    return citation;
  }

  /**
   * Format citations in various styles
   */
  formatCitation(citation: Citation, format: CitationFormat): FormattedCitation {
    const formatters = {
      [CitationFormat.APA]: this.formatAPA.bind(this),
      [CitationFormat.MLA]: this.formatMLA.bind(this),
      [CitationFormat.CHICAGO]: this.formatChicago.bind(this),
      [CitationFormat.WEB]: this.formatWeb.bind(this),
      [CitationFormat.INLINE]: this.formatInline.bind(this),
      [CitationFormat.SHORT]: this.formatShort.bind(this)
    };

    const formatter = formatters[format];
    if (!formatter) {
      throw new Error(`Unsupported citation format: ${format}`);
    }

    return formatter(citation);
  }

  /**
   * Group citations by topic or relevance
   */
  groupCitations(citations: Citation[], groupingStrategy: 'domain' | 'type' | 'quality' | 'topic'): CitationGroup[] {
    const groups: Map<string, Citation[]> = new Map();

    for (const citation of citations) {
      let groupKey: string;

      switch (groupingStrategy) {
        case 'domain':
          groupKey = citation.domain;
          break;
        case 'type':
          groupKey = citation.type;
          break;
        case 'quality':
          groupKey = citation.quality.score >= 0.8 ? 'high' : citation.quality.score >= 0.6 ? 'medium' : 'low';
          break;
        case 'topic':
          groupKey = this.extractTopicFromCitation(citation);
          break;
        default:
          groupKey = 'default';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(citation);
    }

    return Array.from(groups.entries()).map(([topic, citations]) => ({
      topic,
      citations: citations.sort((a, b) => (b.quality.score || 0) - (a.quality.score || 0)),
      relevanceScore: this.calculateGroupRelevance(citations),
      summary: this.generateGroupSummary(citations)
    }));
  }

  /**
   * Get citation statistics
   */
  getCitationStatistics(citations: Citation[]) {
    const stats = {
      total: citations.length,
      byType: {} as Record<CitationType, number>,
      byQuality: {
        high: 0,
        medium: 0,
        low: 0
      },
      averageQuality: 0,
      issueCount: 0,
      topDomains: [] as Array<{ domain: string; count: number; avgQuality: number }>
    };

    const domainStats = new Map<string, { count: number; totalQuality: number }>();

    for (const citation of citations) {
      // Count by type
      stats.byType[citation.type] = (stats.byType[citation.type] || 0) + 1;

      // Count by quality
      const qualityScore = citation.quality.score;
      if (qualityScore >= 0.8) stats.byQuality.high++;
      else if (qualityScore >= 0.6) stats.byQuality.medium++;
      else stats.byQuality.low++;

      // Sum quality for average
      stats.averageQuality += qualityScore;

      // Count issues
      stats.issueCount += citation.quality.issues.length;

      // Track domain stats
      const domainStat = domainStats.get(citation.domain) || { count: 0, totalQuality: 0 };
      domainStat.count++;
      domainStat.totalQuality += qualityScore;
      domainStats.set(citation.domain, domainStat);
    }

    // Calculate average quality
    stats.averageQuality = citations.length > 0 ? stats.averageQuality / citations.length : 0;

    // Get top domains
    stats.topDomains = Array.from(domainStats.entries())
      .map(([domain, stat]) => ({
        domain,
        count: stat.count,
        avgQuality: stat.totalQuality / stat.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Private helper methods
   */

  private extractString(obj: Record<string, unknown>, key: string): string | undefined {
    const value = obj[key];
    return typeof value === 'string' ? value : undefined;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private generateTitleFromUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const segments = pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1] || parsedUrl.hostname;
      
      return lastSegment
        .replace(/[-_]/g, ' ')
        .replace(/\.[^.]*$/, '') // Remove file extension
        .replace(/\b\w/g, l => l.toUpperCase()); // Title case
    } catch {
      return 'Untitled Source';
    }
  }

  private generateCitationId(url: string, title: string): string {
    const hash = this.simpleHash(url + title);
    return `cite_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private determineCitationType(url: string, domain: string, title: string, siteName?: string): CitationType {
    const lowerUrl = url.toLowerCase();
    const lowerDomain = domain.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const lowerSiteName = siteName?.toLowerCase() || '';

    // Government sites
    if (lowerDomain.includes('.gov') || lowerDomain.includes('government')) {
      return CitationType.GOVERNMENT_SITE;
    }

    // Academic papers
    if (lowerDomain.includes('scholar.') || lowerDomain.includes('academia.') || 
        lowerDomain.includes('researchgate.') || lowerUrl.includes('doi.org')) {
      return CitationType.ACADEMIC_PAPER;
    }

    // News sites
    if (lowerDomain.includes('news') || lowerDomain.includes('bbc.') || 
        lowerDomain.includes('cnn.') || lowerDomain.includes('reuters.') ||
        lowerSiteName.includes('news')) {
      return CitationType.NEWS_ARTICLE;
    }

    // Travel guides
    if (lowerDomain.includes('tripadvisor') || lowerDomain.includes('lonelyplanet') ||
        lowerDomain.includes('travel') || lowerTitle.includes('travel guide')) {
      return CitationType.TRAVEL_GUIDE;
    }

    // Review sites
    if (lowerDomain.includes('review') || lowerDomain.includes('yelp') ||
        lowerTitle.includes('review')) {
      return CitationType.REVIEW_SITE;
    }

    // Wikis
    if (lowerDomain.includes('wiki')) {
      return CitationType.WIKI;
    }

    // Social media
    if (lowerDomain.includes('facebook') || lowerDomain.includes('twitter') ||
        lowerDomain.includes('instagram') || lowerDomain.includes('linkedin')) {
      return CitationType.SOCIAL_MEDIA;
    }

    // Forums
    if (lowerDomain.includes('forum') || lowerDomain.includes('reddit') ||
        lowerUrl.includes('/forum/') || lowerUrl.includes('/discussion/')) {
      return CitationType.FORUM;
    }

    // Blog posts
    if (lowerUrl.includes('blog') || lowerDomain.includes('blog') ||
        lowerUrl.includes('/post/') || lowerSiteName.includes('blog')) {
      return CitationType.BLOG_POST;
    }

    return CitationType.WEBSITE;
  }

  private extractMetadata(data: Record<string, unknown>, domain: string): CitationMetadata {
    return {
      extractedAt: new Date().toISOString(),
      sourceType: this.determineSourceType(domain),
      language: this.extractString(data, 'language') || 'en',
      wordCount: this.extractNumber(data, 'word_count'),
      imageCount: this.extractNumber(data, 'image_count'),
      lastModified: this.extractString(data, 'last_modified'),
      contentHash: this.extractString(data, 'content_hash'),
      trustScore: this.getDomainReputation(domain),
      isPaywalled: this.extractBoolean(data, 'is_paywall'),
      requiresLogin: this.extractBoolean(data, 'requires_login')
    };
  }

  private extractNumber(obj: Record<string, unknown>, key: string): number | undefined {
    const value = obj[key];
    return typeof value === 'number' ? value : undefined;
  }

  private extractBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
    const value = obj[key];
    return typeof value === 'boolean' ? value : undefined;
  }

  private determineSourceType(domain: string): SourceType {
    const lowerDomain = domain.toLowerCase();
    
    if (lowerDomain.includes('.gov') || lowerDomain.includes('official')) {
      return SourceType.PRIMARY;
    }
    
    if (lowerDomain.includes('news') || lowerDomain.includes('journal')) {
      return SourceType.SECONDARY;
    }
    
    if (lowerDomain.includes('wiki') || lowerDomain.includes('encyclopedia')) {
      return SourceType.TERTIARY;
    }
    
    return SourceType.UNKNOWN;
  }

  private assessCitationQuality(
    url: string,
    domain: string,
    title: string,
    snippet?: string,
    author?: string,
    publishDate?: string,
    metadata?: CitationMetadata
  ): CitationQuality {
    const factors = {
      domainReputation: this.getDomainReputation(domain),
      contentFreshness: this.assessContentFreshness(publishDate),
      relevanceToQuery: this.assessRelevance(title, snippet),
      authorCredibility: this.assessAuthorCredibility(author),
      sourceReliability: this.assessSourceReliability(domain, metadata)
    };

    const score = Object.values(factors).reduce((sum, factor) => sum + factor, 0) / Object.keys(factors).length;

    const issues: CitationIssue[] = [];
    const recommendations: string[] = [];

    // Add issues based on factors
    if (factors.domainReputation < 0.5) {
      issues.push({
        type: IssueType.UNRELIABLE_DOMAIN,
        severity: IssueSeverity.HIGH,
        message: 'Low domain reputation',
        suggestion: 'Verify with additional sources'
      });
    }

    if (factors.contentFreshness < 0.3) {
      issues.push({
        type: IssueType.OUTDATED_CONTENT,
        severity: IssueSeverity.MEDIUM,
        message: 'Content may be outdated',
        suggestion: 'Look for more recent information'
      });
    }

    if (!author) {
      issues.push({
        type: IssueType.MISSING_METADATA,
        severity: IssueSeverity.LOW,
        message: 'No author information available'
      });
    }

    // Add recommendations
    if (score < 0.7) {
      recommendations.push('Consider finding additional sources to support this information');
    }

    if (factors.relevanceToQuery < 0.6) {
      recommendations.push('Verify relevance to the specific query or topic');
    }

    return {
      score,
      factors,
      issues,
      recommendations
    };
  }

  private getDomainReputation(domain: string): number {
    if (this.domainReputationCache.has(domain)) {
      return this.domainReputationCache.get(domain)!;
    }

    // Simple domain reputation scoring (in production, use a real reputation service)
    let score = 0.5; // Default neutral score

    const lowerDomain = domain.toLowerCase();

    // High reputation domains
    if (lowerDomain.includes('.gov') || lowerDomain.includes('.edu')) {
      score = 0.95;
    } else if (['bbc.com', 'reuters.com', 'ap.org', 'npr.org'].some(d => lowerDomain.includes(d))) {
      score = 0.9;
    } else if (['wikipedia.org', 'britannica.com'].some(d => lowerDomain.includes(d))) {
      score = 0.85;
    } else if (['tripadvisor.com', 'lonelyplanet.com'].some(d => lowerDomain.includes(d))) {
      score = 0.8;
    }

    // Lower reputation indicators
    if (lowerDomain.includes('blogspot') || lowerDomain.includes('wordpress')) {
      score = Math.min(score, 0.6);
    }

    this.domainReputationCache.set(domain, score);
    return score;
  }

  private assessContentFreshness(publishDate?: string): number {
    if (!publishDate) return 0.5; // Neutral if no date

    try {
      const published = new Date(publishDate);
      const now = new Date();
      const daysSince = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince < 30) return 1.0;
      if (daysSince < 90) return 0.8;
      if (daysSince < 365) return 0.6;
      if (daysSince < 730) return 0.4;
      return 0.2;
    } catch {
      return 0.5;
    }
  }

  private assessRelevance(title: string, snippet?: string): number {
    // Simple relevance scoring based on content quality indicators
    let score = 0.5;

    const content = (title + ' ' + (snippet || '')).toLowerCase();

    // Positive indicators
    if (content.includes('travel') || content.includes('tourism')) score += 0.2;
    if (content.includes('guide') || content.includes('tips')) score += 0.1;
    if (content.includes('review') || content.includes('experience')) score += 0.1;

    // Length indicators
    if (snippet && snippet.length > 100) score += 0.1;

    return Math.min(score, 1.0);
  }

  private assessAuthorCredibility(author?: string): number {
    if (!author) return 0.3;
    
    // Simple author credibility assessment
    let score = 0.5;

    if (author.includes('Dr.') || author.includes('PhD')) score += 0.3;
    if (author.includes('Editor') || author.includes('Staff')) score += 0.2;
    if (author.length > 5) score += 0.1; // Not just initials

    return Math.min(score, 1.0);
  }

  private assessSourceReliability(domain: string, metadata?: CitationMetadata): number {
    let score = this.getDomainReputation(domain);

    if (metadata) {
      if (metadata.sourceType === SourceType.PRIMARY) score += 0.1;
      if (metadata.trustScore) score = (score + metadata.trustScore) / 2;
      if (metadata.isPaywalled) score += 0.05; // Paywalled content often higher quality
    }

    return Math.min(score, 1.0);
  }

  private deduplicateCitations(citations: Citation[]): Citation[] {
    const unique: Citation[] = [];
    const seen = new Set<string>();

    for (const citation of citations) {
      const key = this.generateDeduplicationKey(citation);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(citation);
      }
    }

    return unique;
  }

  private generateDeduplicationKey(citation: Citation): string {
    // Use domain + simplified title for deduplication
    const simplifiedTitle = citation.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${citation.domain}:${simplifiedTitle.substring(0, 50)}`;
  }

  private extractTopicFromCitation(citation: Citation): string {
    const content = (citation.title + ' ' + (citation.snippet || '')).toLowerCase();
    
    // Simple topic extraction based on keywords
    if (content.includes('hotel') || content.includes('accommodation')) return 'Accommodation';
    if (content.includes('restaurant') || content.includes('food') || content.includes('dining')) return 'Dining';
    if (content.includes('activity') || content.includes('attraction') || content.includes('tour')) return 'Activities';
    if (content.includes('transport') || content.includes('flight') || content.includes('train')) return 'Transportation';
    if (content.includes('weather') || content.includes('climate')) return 'Weather';
    if (content.includes('culture') || content.includes('history')) return 'Culture & History';
    
    return 'General';
  }

  private calculateGroupRelevance(citations: Citation[]): number {
    if (citations.length === 0) return 0;
    
    const avgQuality = citations.reduce((sum, c) => sum + c.quality.score, 0) / citations.length;
    const avgRelevance = citations.reduce((sum, c) => sum + (c.relevanceScore || 0.5), 0) / citations.length;
    
    return (avgQuality + avgRelevance) / 2;
  }

  private generateGroupSummary(citations: Citation[]): string {
    if (citations.length === 0) return '';
    
    const topCitation = citations.sort((a, b) => b.quality.score - a.quality.score)[0];
    return `${citations.length} source${citations.length > 1 ? 's' : ''} including ${topCitation.siteName}`;
  }

  private initializeDomainReputations(): void {
    // Initialize with known high-quality domains
    const highQualityDomains = [
      'gov', 'edu', 'bbc.com', 'reuters.com', 'ap.org', 'npr.org',
      'wikipedia.org', 'britannica.com', 'tripadvisor.com', 'lonelyplanet.com'
    ];

    highQualityDomains.forEach(domain => {
      this.domainReputationCache.set(domain, 0.9);
    });
  }

  // Citation formatting methods
  private formatAPA(citation: Citation): FormattedCitation {
    const author = citation.author || citation.siteName || citation.domain;
    const year = citation.publishDate ? new Date(citation.publishDate).getFullYear() : 'n.d.';
    const accessDate = new Date(citation.accessDate).toLocaleDateString();

    const text = `${author} (${year}). ${citation.title}. Retrieved ${accessDate}, from ${citation.url}`;
    const html = `${author} (${year}). <em>${citation.title}</em>. Retrieved ${accessDate}, from <a href="${citation.url}">${citation.url}</a>`;
    const shortForm = `${author}, ${year}`;
    const inlineForm = `(${author}, ${year})`;

    return {
      format: CitationFormat.APA,
      text,
      html,
      shortForm,
      inlineForm
    };
  }

  private formatMLA(citation: Citation): FormattedCitation {
    const author = citation.author || citation.siteName || citation.domain;
    const accessDate = new Date(citation.accessDate).toLocaleDateString();

    const text = `${author}. "${citation.title}." Web. ${accessDate}. <${citation.url}>`;
    const html = `${author}. "<em>${citation.title}</em>." Web. ${accessDate}. &lt;<a href="${citation.url}">${citation.url}</a>&gt;`;
    const shortForm = `${author}`;
    const inlineForm = `(${author})`;

    return {
      format: CitationFormat.MLA,
      text,
      html,
      shortForm,
      inlineForm
    };
  }

  private formatChicago(citation: Citation): FormattedCitation {
    const author = citation.author || citation.siteName || citation.domain;
    const accessDate = new Date(citation.accessDate).toLocaleDateString();

    const text = `${author}. "${citation.title}." Accessed ${accessDate}. ${citation.url}.`;
    const html = `${author}. "<em>${citation.title}</em>." Accessed ${accessDate}. <a href="${citation.url}">${citation.url}</a>.`;
    const shortForm = `${author}`;
    const inlineForm = `(${author})`;

    return {
      format: CitationFormat.CHICAGO,
      text,
      html,
      shortForm,
      inlineForm
    };
  }

  private formatWeb(citation: Citation): FormattedCitation {
    const text = `${citation.title} - ${citation.siteName || citation.domain}`;
    const html = `<a href="${citation.url}" title="${citation.snippet || citation.title}">${citation.title}</a> - ${citation.siteName || citation.domain}`;
    const shortForm = citation.siteName || citation.domain;
    const inlineForm = `[${citation.siteName || citation.domain}]`;

    return {
      format: CitationFormat.WEB,
      text,
      html,
      shortForm,
      inlineForm
    };
  }

  private formatInline(citation: Citation): FormattedCitation {
    const text = `[${citation.siteName || citation.domain}]`;
    const html = `<a href="${citation.url}" class="citation-link" title="${citation.title}">[${citation.siteName || citation.domain}]</a>`;
    const shortForm = text;
    const inlineForm = text;

    return {
      format: CitationFormat.INLINE,
      text,
      html,
      shortForm,
      inlineForm
    };
  }

  private formatShort(citation: Citation): FormattedCitation {
    const text = citation.siteName || citation.domain;
    const html = `<a href="${citation.url}" title="${citation.title}">${citation.siteName || citation.domain}</a>`;
    const shortForm = text;
    const inlineForm = `(${text})`;

    return {
      format: CitationFormat.SHORT,
      text,
      html,
      shortForm,
      inlineForm
    };
  }
}

// Export default instance
export const citationManager = new CitationManager();

// Utility functions for common operations
export async function parseCitationsFromPerplexity(citationsData: unknown[]): Promise<Citation[]> {
  const citations = citationManager.parseCitations(citationsData);
  return await citationManager.validateCitations(citations);
}

export function formatCitationsForDisplay(citations: Citation[], format: CitationFormat = CitationFormat.WEB): FormattedCitation[] {
  return citations.map(citation => citationManager.formatCitation(citation, format));
}

export function getCitationsByQuality(citations: Citation[], minQuality: number = 0.6): Citation[] {
  return citations.filter(citation => citation.quality.score >= minQuality);
}

export function groupCitationsByTopic(citations: Citation[]): CitationGroup[] {
  return citationManager.groupCitations(citations, 'topic');
}

export function getCitationStatistics(citations: Citation[]) {
  return citationManager.getCitationStatistics(citations);
} 