'use client';

import { getSocket } from '@/lib/socket/client';
import type { Comment } from '@/lib/socket/types';

// Notification types aligned with our useNotifications hook
export interface NotificationData {
  id: string;
  type: 'comment' | 'mention' | 'update' | 'join' | 'leave' | 'permission' | 'version' | 'system';
  title: string;
  message: string;
  createdAt: Date;
  userId?: string; // The user who triggered the notification
  targetId?: string; // The item being referenced (itinerary, comment, etc.)
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>; // Additional data
}

export class NotificationService {
  private static instance: NotificationService | null = null;
  private socket = getSocket();
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Generate notification for new comment
  createCommentNotification(comment: Comment, itineraryId: string, currentUserId: string): NotificationData {
    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'comment',
      title: 'New Comment',
      message: `${comment.authorName} commented: "${this.truncateText(comment.content, 60)}"`,
      createdAt: new Date(),
      userId: comment.authorId,
      targetId: itineraryId,
      priority: 'medium',
      metadata: {
        commentId: comment.id,
        itineraryId,
        commentContent: comment.content,
        authorName: comment.authorName,
        entityType: comment.entityType,
        entityId: comment.entityId
      }
    };
  }

  // Generate notification for mention in comment
  createMentionNotification(
    comment: Comment, 
    mentionedUserId: string, 
    mentionedUserName: string,
    itineraryId: string
  ): NotificationData {
    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'mention',
      title: 'You were mentioned',
      message: `${comment.authorName} mentioned you: "${this.truncateText(comment.content, 50)}"`,
      createdAt: new Date(),
      userId: comment.authorId,
      targetId: itineraryId,
      priority: 'high',
      metadata: {
        commentId: comment.id,
        itineraryId,
        mentionedUserId,
        mentionedUserName,
        commentContent: comment.content,
        authorName: comment.authorName,
        entityType: comment.entityType,
        entityId: comment.entityId
      }
    };
  }

  // Generate notification for user joining trip
  createUserJoinedNotification(userName: string, userAvatarUrl: string | undefined, itineraryId: string, userId: string): NotificationData {
    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'join',
      title: 'User Joined',
      message: `${userName} joined the trip`,
      createdAt: new Date(),
      userId,
      targetId: itineraryId,
      priority: 'low',
      metadata: {
        itineraryId,
        userName,
        userAvatarUrl
      }
    };
  }

  // Generate notification for user leaving trip
  createUserLeftNotification(userName: string, itineraryId: string, userId: string): NotificationData {
    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'leave',
      title: 'User Left',
      message: `${userName} left the trip`,
      createdAt: new Date(),
      userId,
      targetId: itineraryId,
      priority: 'low',
      metadata: {
        itineraryId,
        userName
      }
    };
  }

  // Generate notification for itinerary updates
  createItineraryUpdateNotification(
    updaterName: string, 
    updateType: string, 
    itineraryId: string, 
    userId: string,
    details?: string
  ): NotificationData {
    const updateMessages = {
      'activity_added': 'added a new activity',
      'activity_updated': 'updated an activity',
      'activity_removed': 'removed an activity',
      'day_updated': 'updated a day',
      'itinerary_updated': 'updated the itinerary',
      'general': 'made changes'
    };

    const message = updateMessages[updateType as keyof typeof updateMessages] || updateMessages.general;

    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'update',
      title: 'Itinerary Updated',
      message: `${updaterName} ${message}${details ? `: ${details}` : ''}`,
      createdAt: new Date(),
      userId,
      targetId: itineraryId,
      priority: 'medium',
      metadata: {
        itineraryId,
        updateType,
        updaterName,
        details
      }
    };
  }

  // Generate notification for permission changes
  createPermissionChangeNotification(
    targetUserName: string,
    newRole: string,
    changerName: string,
    itineraryId: string,
    changerId: string,
    targetUserId: string
  ): NotificationData {
    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'permission',
      title: 'Permission Changed',
      message: `${changerName} changed ${targetUserName}'s role to ${newRole}`,
      createdAt: new Date(),
      userId: changerId,
      targetId: itineraryId,
      priority: 'medium',
      metadata: {
        itineraryId,
        targetUserId,
        targetUserName,
        newRole,
        changerName,
        changerId
      }
    };
  }

  // Generate system notification
  createSystemNotification(title: string, message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): NotificationData {
    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'system',
      title,
      message,
      createdAt: new Date(),
      priority,
      metadata: {
        isSystemGenerated: true
      }
    };
  }

  // Send notification via Socket.io
  sendNotification(notification: NotificationData, targetUserIds?: string[]): void {
    console.log('[NotificationService] Sending notification:', notification);
    
    // Convert NotificationData to Socket Notification format
    const socketNotification = {
      id: notification.id,
      type: notification.type,
      message: notification.message,
      userId: notification.userId || '',
      timestamp: notification.createdAt,
      read: false
    };
    
    if (targetUserIds && targetUserIds.length > 0) {
      // Send to specific users
      targetUserIds.forEach(userId => {
        this.socket.emit('send-targeted-notification', {
          userId,
          notification: socketNotification
        });
      });
    } else {
      // Broadcast to current room/trip
      this.socket.emit('send-notification', socketNotification);
    }
  }

  // Handle comment notifications with mention detection
  handleCommentAdded(comment: Comment, itineraryId: string, currentUserId: string, allUsers: Array<{id: string, name: string}>): void {
    // Create comment notification
    const commentNotification = this.createCommentNotification(comment, itineraryId, currentUserId);
    
    // Send to all users except the comment author
    const recipientIds = allUsers
      .filter(user => user.id !== comment.authorId)
      .map(user => user.id);
    
    if (recipientIds.length > 0) {
      this.sendNotification(commentNotification, recipientIds);
    }

    // Check for mentions and create mention notifications
    const mentionMatches = comment.content.match(/@(\w+)/g);
    if (mentionMatches && comment.mentions) {
      comment.mentions.forEach(mentionedUserId => {
        const mentionedUser = allUsers.find(user => user.id === mentionedUserId);
        if (mentionedUser && mentionedUser.id !== comment.authorId) {
          const mentionNotification = this.createMentionNotification(
            comment,
            mentionedUser.id,
            mentionedUser.name,
            itineraryId
          );
          this.sendNotification(mentionNotification, [mentionedUser.id]);
        }
      });
    }
  }

  // Utility function to truncate text
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Extract mentions from comment content
  static extractMentions(content: string, allUsers: Array<{id: string, name: string}>): string[] {
    const mentionPattern = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      const mentionName = match[1];
      const user = allUsers.find(u => 
        u.name.toLowerCase().includes(mentionName.toLowerCase())
      );
      if (user && !mentions.includes(user.id)) {
        mentions.push(user.id);
      }
    }

    return mentions;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance(); 