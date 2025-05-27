import { ChatMessage, ChatSession, ChatContext, ChatConfig } from '@/types/chat';

const STORAGE_KEYS = {
  CHAT_MESSAGES: 'chat_messages',
  CHAT_SESSIONS: 'chat_sessions',
  CURRENT_SESSION: 'current_chat_session',
  CHAT_CONFIG: 'chat_config',
  CHAT_CONTEXT: 'chat_context'
} as const;

export class ChatStorage {
  private static instance: ChatStorage;
  private isClient: boolean;

  constructor() {
    this.isClient = typeof window !== 'undefined';
  }

  static getInstance(): ChatStorage {
    if (!ChatStorage.instance) {
      ChatStorage.instance = new ChatStorage();
    }
    return ChatStorage.instance;
  }

  // Message storage
  saveMessages(sessionId: string, messages: ChatMessage[]): void {
    if (!this.isClient) return;
    
    try {
      const key = `${STORAGE_KEYS.CHAT_MESSAGES}_${sessionId}`;
      const serializedMessages = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
        actions: undefined // Don't serialize functions
      }));
      localStorage.setItem(key, JSON.stringify(serializedMessages));
    } catch (error) {
      console.error('Failed to save chat messages:', error);
    }
  }

  getMessages(sessionId: string): ChatMessage[] {
    if (!this.isClient) return [];
    
    try {
      const key = `${STORAGE_KEYS.CHAT_MESSAGES}_${sessionId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];

      const messages = JSON.parse(stored);
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      return [];
    }
  }

  addMessage(sessionId: string, message: ChatMessage): void {
    const messages = this.getMessages(sessionId);
    messages.push(message);
    
    // Keep only the last 100 messages to prevent storage overflow
    const trimmedMessages = messages.slice(-100);
    this.saveMessages(sessionId, trimmedMessages);
  }

  updateMessage(sessionId: string, messageId: string, updates: Partial<ChatMessage>): void {
    const messages = this.getMessages(sessionId);
    const index = messages.findIndex(msg => msg.id === messageId);
    
    if (index !== -1) {
      messages[index] = { ...messages[index], ...updates };
      this.saveMessages(sessionId, messages);
    }
  }

  deleteMessage(sessionId: string, messageId: string): void {
    const messages = this.getMessages(sessionId);
    const filteredMessages = messages.filter(msg => msg.id !== messageId);
    this.saveMessages(sessionId, filteredMessages);
  }

  clearMessages(sessionId: string): void {
    if (!this.isClient) return;
    
    try {
      const key = `${STORAGE_KEYS.CHAT_MESSAGES}_${sessionId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear chat messages:', error);
    }
  }

  // Session storage
  saveSessions(sessions: ChatSession[]): void {
    if (!this.isClient) return;
    
    try {
      const serializedSessions = sessions.map(session => ({
        ...session,
        startedAt: session.startedAt.toISOString(),
        lastActivity: session.lastActivity.toISOString()
      }));
      localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(serializedSessions));
    } catch (error) {
      console.error('Failed to save chat sessions:', error);
    }
  }

  getSessions(): ChatSession[] {
    if (!this.isClient) return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      if (!stored) return [];

      const sessions = JSON.parse(stored);
      return sessions.map((session: any) => ({
        ...session,
        startedAt: new Date(session.startedAt),
        lastActivity: new Date(session.lastActivity)
      }));
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      return [];
    }
  }

  saveSession(session: ChatSession): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index !== -1) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    
    // Keep only the last 20 sessions
    const trimmedSessions = sessions.slice(-20);
    this.saveSessions(trimmedSessions);
  }

  getCurrentSession(): ChatSession | null {
    if (!this.isClient) return null;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      if (!stored) return null;

      const session = JSON.parse(stored);
      return {
        ...session,
        startedAt: new Date(session.startedAt),
        lastActivity: new Date(session.lastActivity)
      };
    } catch (error) {
      console.error('Failed to load current chat session:', error);
      return null;
    }
  }

  setCurrentSession(session: ChatSession | null): void {
    if (!this.isClient) return;
    
    try {
      if (session) {
        const serializedSession = {
          ...session,
          startedAt: session.startedAt.toISOString(),
          lastActivity: session.lastActivity.toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(serializedSession));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
      }
    } catch (error) {
      console.error('Failed to save current chat session:', error);
    }
  }

  deleteSession(sessionId: string): void {
    // Remove session from sessions list
    const sessions = this.getSessions();
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    this.saveSessions(filteredSessions);
    
    // Remove session messages
    this.clearMessages(sessionId);
    
    // Clear current session if it's the one being deleted
    const currentSession = this.getCurrentSession();
    if (currentSession?.id === sessionId) {
      this.setCurrentSession(null);
    }
  }

  // Configuration storage
  saveConfig(config: ChatConfig): void {
    if (!this.isClient) return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save chat config:', error);
    }
  }

  getConfig(): ChatConfig | null {
    if (!this.isClient) return null;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_CONFIG);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load chat config:', error);
      return null;
    }
  }

  // Context storage
  saveContext(sessionId: string, context: ChatContext): void {
    if (!this.isClient) return;
    
    try {
      const key = `${STORAGE_KEYS.CHAT_CONTEXT}_${sessionId}`;
      localStorage.setItem(key, JSON.stringify(context));
    } catch (error) {
      console.error('Failed to save chat context:', error);
    }
  }

  getContext(sessionId: string): ChatContext | null {
    if (!this.isClient) return null;
    
    try {
      const key = `${STORAGE_KEYS.CHAT_CONTEXT}_${sessionId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load chat context:', error);
      return null;
    }
  }

  // Utility methods
  getStorageUsage(): {
    messages: number;
    sessions: number;
    config: number;
    context: number;
    total: number;
  } {
    if (!this.isClient) return { messages: 0, sessions: 0, config: 0, context: 0, total: 0 };
    
    const getSize = (key: string): number => {
      const item = localStorage.getItem(key);
      return item ? new Blob([item]).size : 0;
    };

    const messages = Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_KEYS.CHAT_MESSAGES))
      .reduce((total, key) => total + getSize(key), 0);

    const sessions = getSize(STORAGE_KEYS.CHAT_SESSIONS);
    const config = getSize(STORAGE_KEYS.CHAT_CONFIG);
    const context = Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_KEYS.CHAT_CONTEXT))
      .reduce((total, key) => total + getSize(key), 0);

    const total = messages + sessions + config + context;

    return { messages, sessions, config, context, total };
  }

  clearAllChatData(): void {
    if (!this.isClient) return;
    
    try {
      // Remove all chat-related items
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.startsWith(STORAGE_KEYS.CHAT_MESSAGES) ||
        key.startsWith(STORAGE_KEYS.CHAT_CONTEXT) ||
        key === STORAGE_KEYS.CHAT_SESSIONS ||
        key === STORAGE_KEYS.CURRENT_SESSION ||
        key === STORAGE_KEYS.CHAT_CONFIG
      );

      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log(`Cleared ${keysToRemove.length} chat data items from localStorage`);
    } catch (error) {
      console.error('Failed to clear chat data:', error);
    }
  }

  // Export/Import functionality
  exportChatData(): string {
    if (!this.isClient) return '{}';
    
    try {
      const sessions = this.getSessions();
      const exportData: any = {
        sessions,
        config: this.getConfig(),
        timestamp: new Date().toISOString()
      };

      // Add messages for each session
      sessions.forEach(session => {
        exportData[`messages_${session.id}`] = this.getMessages(session.id);
        exportData[`context_${session.id}`] = this.getContext(session.id);
      });

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export chat data:', error);
      return '{}';
    }
  }

  importChatData(data: string): boolean {
    if (!this.isClient) return false;
    
    try {
      const importData = JSON.parse(data);
      
      // Import sessions
      if (importData.sessions) {
        this.saveSessions(importData.sessions);
      }
      
      // Import config
      if (importData.config) {
        this.saveConfig(importData.config);
      }
      
      // Import messages and contexts
      Object.keys(importData).forEach(key => {
        if (key.startsWith('messages_')) {
          const sessionId = key.replace('messages_', '');
          this.saveMessages(sessionId, importData[key]);
        } else if (key.startsWith('context_')) {
          const sessionId = key.replace('context_', '');
          this.saveContext(sessionId, importData[key]);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to import chat data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const chatStorage = ChatStorage.getInstance(); 