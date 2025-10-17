/**
 * NotificationCenter Types
 */

export type NotificationType = 'system' | 'approval' | 'event' | 'message';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  timestamp: Date | string;
  link?: string;
  avatar?: string;
  metadata?: any;
}

export interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNotificationClick: (notification: Notification) => void;
  enableSound?: boolean;
  pollInterval?: number;
  className?: string;
}

