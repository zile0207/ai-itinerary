export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'error';
  metadata?: {
    tokens?: number;
    model?: string;
    confidence?: number;
    processingTime?: number;
  };
  suggestions?: ChatSuggestion[];
  citations?: string[];
  relatedQuestions?: string[];
  actions?: MessageAction[];
  attachments?: ChatAttachment[];
  replyTo?: string; // ID of message being replied to
  isRetry?: boolean;
  errorDetails?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface ChatSuggestion {
  id: string;
  type: 'activity' | 'restaurant' | 'accommodation' | 'transportation' | 'general';
  title: string;
  description: string;
  confidence: number;
  data?: any; // Specific data for the suggestion type
  actions: SuggestionAction[];
}

export interface SuggestionAction {
  type: 'add_to_itinerary' | 'get_more_info' | 'find_alternatives' | 'book_now';
  label: string;
  data?: any;
}

export interface MessageAction {
  type: 'copy' | 'retry' | 'edit' | 'like' | 'dislike' | 'share' | 'apply_suggestion';
  label: string;
  icon?: string;
  onClick: () => void;
}

export interface ChatAttachment {
  id: string;
  type: 'url' | 'image' | 'document' | 'location';
  name: string;
  url?: string;
  data?: any;
  status: 'uploading' | 'processing' | 'ready' | 'error';
}

export interface ChatContext {
  itineraryId?: string;
  itinerary?: any; // Current itinerary data
  currentLocation?: {
    lat: number;
    lng: number;
    name?: string;
  };
  preferences?: UserPreferences;
  sessionId: string;
  conversationHistory: ChatMessage[];
  travelPreferences?: UserPreferences; // Alias for preferences
  urlAnalysis?: Array<{
    url: string;
    summary: string;
    metadata?: any;
  }>;
  attachmentAnalysis?: Array<{
    name: string;
    summary: string;
    type: string;
    metadata?: any;
  }>;
}

export interface UserPreferences {
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  interests?: string[];
  dietaryRestrictions?: string[];
  accessibility?: string[];
  travelStyle?: 'budget' | 'mid-range' | 'luxury' | 'backpacker';
  groupSize?: {
    adults: number;
    children: number;
    infants: number;
  };
}

export interface ChatConfig {
  maxMessageHistory: number;
  enableTypingIndicators: boolean;
  enableSuggestions: boolean;
  enableCitations: boolean;
  autoScrollEnabled: boolean;
  soundEnabled: boolean;
  maxAttachmentSize: number; // in bytes
  allowedAttachmentTypes: string[];
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  startedAt: Date;
  lastActivity: Date;
  messageCount: number;
  context: Partial<ChatContext>;
  settings: Partial<ChatConfig>;
}

export interface AIResponse {
  content: string;
  suggestions?: ChatSuggestion[];
  citations?: string[];
  relatedQuestions?: string[];
  confidence: number;
  processingTime: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
}

export interface ChatAnalytics {
  sessionId: string;
  messagesSent: number;
  messagesReceived: number;
  averageResponseTime: number;
  userSatisfaction?: number; // 1-5 rating
  topicCategories: string[];
  suggestionsAccepted: number;
  suggestionsDeclined: number;
}

// Event types for chat state management
export type ChatEvent =
  | { type: 'SEND_MESSAGE'; payload: { content: string; attachments?: ChatAttachment[] } }
  | { type: 'RECEIVE_MESSAGE'; payload: ChatMessage }
  | { type: 'MESSAGE_STATUS_UPDATE'; payload: { messageId: string; status: ChatMessage['status'] } }
  | { type: 'SET_TYPING'; payload: { isTyping: boolean } }
  | { type: 'CLEAR_CHAT'; payload?: undefined }
  | { type: 'RETRY_MESSAGE'; payload: { messageId: string } }
  | { type: 'APPLY_SUGGESTION'; payload: { suggestionId: string; messageId: string } }
  | { type: 'UPDATE_CONTEXT'; payload: Partial<ChatContext> }
  | { type: 'ADD_ATTACHMENT'; payload: ChatAttachment }
  | { type: 'REMOVE_ATTACHMENT'; payload: { attachmentId: string } }
  | { type: 'SET_CONFIG'; payload: Partial<ChatConfig> };

export interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  isConnected: boolean;
  context: ChatContext;
  config: ChatConfig;
  currentSession: ChatSession | null;
  error: string | null;
  attachments: ChatAttachment[];
}

// Utility types
export type MessageContentType = 'text' | 'suggestion' | 'error' | 'system' | 'attachment';

export interface MessageFilter {
  sender?: ChatMessage['sender'];
  dateRange?: {
    start: Date;
    end: Date;
  };
  contentType?: MessageContentType;
  hasAttachments?: boolean;
  hasSuggestions?: boolean;
}

export interface ChatPerformanceMetrics {
  averageResponseTime: number;
  messageDeliveryRate: number;
  errorRate: number;
  userEngagementScore: number;
  sessionDuration: number;
} 