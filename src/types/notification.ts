export type NotificationType = 
  | 'checkin_reminder'
  | 'checkout_reminder' 
  | 'flight_delay'
  | 'maintenance_alert'
  | 'payment_reminder'
  | 'welcome_message'
  | 'cleaning_schedule';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  recipientId: string; // reservation ID or staff ID
  recipientEmail?: string;
  scheduledAt: Date;
  sentAt?: Date;
  readAt?: Date;
  isActive: boolean;
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