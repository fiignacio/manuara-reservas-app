
export type NotificationType = 
  | 'checkin_reminder'
  | 'checkout_reminder' 
  | 'flight_delay'
  | 'maintenance_alert'
  | 'payment_reminder'
  | 'welcome_message'
  | 'cleaning_schedule';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationStatus = 'pending' | 'sent' | 'read' | 'completed' | 'archived' | 'cancelled' | 'snoozed';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  recipientId: string; // reservation ID or staff ID
  recipientEmail?: string;
  scheduledAt: Date;
  sentAt?: Date;
  readAt?: Date;
  completedAt?: Date;
  completedBy?: string;
  archivedAt?: Date;
  snoozedUntil?: Date;
  isActive: boolean;
  notes?: string;
  actionTaken?: string;
  metadata?: {
    reservationId?: string;
    cabinType?: string;
    flightNumber?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  triggerHours: number; // Hours before/after event
  isEnabled: boolean;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  templates: NotificationTemplate[];
}

export interface NotificationAction {
  id: string;
  notificationId: string;
  action: 'sent' | 'read' | 'completed' | 'archived' | 'snoozed' | 'cancelled';
  performedBy: string;
  performedAt: Date;
  notes?: string;
}
