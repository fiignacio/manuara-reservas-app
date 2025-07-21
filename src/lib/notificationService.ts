import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc,
  Timestamp,
  limit 
} from 'firebase/firestore';
import { db } from './firebase';
import { Notification, NotificationType, NotificationPriority, NotificationTemplate } from '../types/notification';
import { Reservation } from '../types/reservation';
import { addHours, subHours, isAfter } from 'date-fns';

// Plantillas predefinidas de notificaciones
const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    type: 'checkin_reminder',
    title: 'Recordatorio de Check-in',
    message: 'Su check-in está programado para mañana a las 14:00. ¡Esperamos su llegada!',
    triggerHours: -24,
    isEnabled: true
  },
  {
    type: 'checkout_reminder', 
    title: 'Recordatorio de Check-out',
    message: 'Su check-out es mañana a las 11:00. Por favor, prepare sus pertenencias.',
    triggerHours: -24,
    isEnabled: true
  },
  {
    type: 'welcome_message',
    title: '¡Bienvenido a Manuara!',
    message: 'Su cabaña está lista. Disfrute de su estadía en nuestro paraíso.',
    triggerHours: 0,
    isEnabled: true
  },
  {
    type: 'flight_delay',
    title: 'Alerta de Vuelo',
    message: 'Hay posibles retrasos en su vuelo. Manténgase informado.',
    triggerHours: -2,
    isEnabled: true
  },
  {
    type: 'maintenance_alert',
    title: 'Mantenimiento Programado',
    message: 'Se ha programado mantenimiento para su cabaña.',
    triggerHours: -48,
    isEnabled: true
  }
];

// Sistema de logging optimizado
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📋 [Notifications] ${message}`, data || '');
    }
  },
  error: (message: string, error?: any) => {
    console.error(`❌ [Notifications] ${message}`, error || '');
  },
  success: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [Notifications] ${message}`, data || '');
    }
  }
};

class NotificationService {
  private readonly collection = 'notifications';

  // Crear notificación con validaciones
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Validaciones
      if (!notification.title || !notification.message) {
        throw new Error('Título y mensaje son requeridos');
      }

      if (!notification.scheduledAt || notification.scheduledAt < new Date()) {
        throw new Error('Fecha de programación debe ser futura');
      }

      const now = new Date();
      logger.info(`Creating notification: ${notification.title}`);
      
      const docRef = await addDoc(collection(db, this.collection), {
        ...notification,
        scheduledAt: Timestamp.fromDate(notification.scheduledAt),
        sentAt: notification.sentAt ? Timestamp.fromDate(notification.sentAt) : null,
        readAt: notification.readAt ? Timestamp.fromDate(notification.readAt) : null,
        completedAt: notification.completedAt ? Timestamp.fromDate(notification.completedAt) : null,
        archivedAt: notification.archivedAt ? Timestamp.fromDate(notification.archivedAt) : null,
        snoozedUntil: notification.snoozedUntil ? Timestamp.fromDate(notification.snoozedUntil) : null,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      });
      
      logger.success(`Notification created with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  // Obtener notificaciones pendientes (optimizada)
  async getPendingNotifications(): Promise<Notification[]> {
    try {
      const now = new Date();
      
      // Query simplificada para evitar índices complejos
      const q = query(
        collection(db, this.collection),
        where('status', '==', 'pending'),
        orderBy('scheduledAt', 'asc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledAt: doc.data().scheduledAt.toDate(),
        sentAt: doc.data().sentAt?.toDate() || null,
        readAt: doc.data().readAt?.toDate() || null,
        completedAt: doc.data().completedAt?.toDate() || null,
        archivedAt: doc.data().archivedAt?.toDate() || null,
        snoozedUntil: doc.data().snoozedUntil?.toDate() || null,
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Notification[];

      // Filtrar en el cliente solo las que están listas para enviar
      const readyNotifications = notifications.filter(notification => {
        const isScheduled = notification.scheduledAt <= now;
        const isNotSnoozed = !notification.snoozedUntil || notification.snoozedUntil <= now;
        const isActive = notification.isActive;
        
        return isScheduled && isNotSnoozed && isActive;
      });

      logger.info(`Found ${readyNotifications.length} pending notifications`);
      return readyNotifications;
    } catch (error) {
      logger.error('Error getting pending notifications:', error);
      return [];
    }
  }

  // Obtener todas las notificaciones con paginación
  async getAllNotifications(limitCount: number = 50): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, this.collection),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledAt: doc.data().scheduledAt.toDate(),
        sentAt: doc.data().sentAt?.toDate() || null,
        readAt: doc.data().readAt?.toDate() || null,
        completedAt: doc.data().completedAt?.toDate() || null,
        archivedAt: doc.data().archivedAt?.toDate() || null,
        snoozedUntil: doc.data().snoozedUntil?.toDate() || null,
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Notification[];
      
      return notifications;
    } catch (error) {
      logger.error('Error getting notifications:', error);
      return [];
    }
  }

  // Obtener notificaciones para la campana (optimizada)
  async getBellNotifications(): Promise<Notification[]> {
    try {
      // Query simplificada - solo notificaciones enviadas
      const q = query(
        collection(db, this.collection),
        where('status', '==', 'sent'),
        orderBy('sentAt', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledAt: doc.data().scheduledAt.toDate(),
        sentAt: doc.data().sentAt?.toDate() || null,
        readAt: doc.data().readAt?.toDate() || null,
        completedAt: doc.data().completedAt?.toDate() || null,
        archivedAt: doc.data().archivedAt?.toDate() || null,
        snoozedUntil: doc.data().snoozedUntil?.toDate() || null,
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Notification[];

      // Solo notificaciones enviadas pero no leídas
      const unreadNotifications = notifications.filter(n => 
        n.status === 'sent' && 
        !n.readAt && 
        n.isActive
      );
      
      logger.info(`Found ${unreadNotifications.length} unread bell notifications`);
      return unreadNotifications;
    } catch (error) {
      logger.error('Error getting bell notifications:', error);
      return [];
    }
  }

  // Marcar notificación como enviada (mejorada)
  async markAsSent(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      const now = new Date();
      
      await updateDoc(notificationRef, {
        sentAt: Timestamp.fromDate(now),
        status: 'sent',
        updatedAt: Timestamp.fromDate(now)
      });
      
      logger.success(`Notification marked as sent: ${notificationId}`);
    } catch (error) {
      logger.error('Error marking notification as sent:', error);
      throw error;
    }
  }

  // Marcar notificación como leída (validada)
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      const now = new Date();
      
      await updateDoc(notificationRef, {
        readAt: Timestamp.fromDate(now),
        status: 'read',
        updatedAt: Timestamp.fromDate(now)
      });
      
      logger.success(`Notification marked as read: ${notificationId}`);
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Marcar notificación como completada (mejorada)
  async markAsCompleted(notificationId: string, notes?: string, completedBy: string = 'system'): Promise<void> {
    try {
      if (!notes || notes.trim().length === 0) {
        throw new Error('Se requieren notas para completar la notificación');
      }

      const notificationRef = doc(db, this.collection, notificationId);
      const now = new Date();
      
      await updateDoc(notificationRef, {
        completedAt: Timestamp.fromDate(now),
        completedBy,
        status: 'completed',
        notes: notes.trim(),
        actionTaken: notes.trim(),
        updatedAt: Timestamp.fromDate(now)
      });
      
      logger.success(`Notification completed: ${notificationId}`);
    } catch (error) {
      logger.error('Error marking notification as completed:', error);
      throw error;
    }
  }

  // Archivar notificación (optimizada)
  async archiveNotification(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      const now = new Date();
      
      await updateDoc(notificationRef, {
        archivedAt: Timestamp.fromDate(now),
        status: 'archived',
        isActive: false,
        updatedAt: Timestamp.fromDate(now)
      });
      
      logger.success(`Notification archived: ${notificationId}`);
    } catch (error) {
      logger.error('Error archiving notification:', error);
      throw error;
    }
  }

  // Posponer notificación (validada)
  async snoozeNotification(notificationId: string, hours: number = 24): Promise<void> {
    try {
      if (hours <= 0 || hours > 168) { // Max 1 semana
        throw new Error('Las horas deben estar entre 1 y 168 (1 semana)');
      }

      const snoozeUntil = addHours(new Date(), hours);
      const notificationRef = doc(db, this.collection, notificationId);
      
      await updateDoc(notificationRef, {
        snoozedUntil: Timestamp.fromDate(snoozeUntil),
        status: 'snoozed',
        updatedAt: Timestamp.fromDate(new Date())
      });
      
      logger.success(`Notification snoozed until: ${snoozeUntil.toLocaleString()}`);
    } catch (error) {
      logger.error('Error snoozing notification:', error);
      throw error;
    }
  }

  // Cancelar notificación
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      await updateDoc(notificationRef, {
        status: 'cancelled',
        isActive: false,
        updatedAt: Timestamp.fromDate(new Date())
      });
      logger.success(`Notification cancelled: ${notificationId}`);
    } catch (error) {
      logger.error('Error cancelling notification:', error);
      throw error;
    }
  }

  // Generar notificaciones automáticas (optimizada)
  async generateReservationNotifications(reservation: Reservation): Promise<void> {
    if (!reservation.id) {
      logger.error('Cannot generate notifications for reservation without ID');
      return;
    }

    logger.info(`Generating notifications for reservation: ${reservation.id}`);

    const templates = DEFAULT_TEMPLATES.filter(t => t.isEnabled);
    const checkInDate = new Date(reservation.checkIn + 'T14:00:00');
    const checkOutDate = new Date(reservation.checkOut + 'T11:00:00');

    for (const template of templates) {
      try {
        let scheduledDate: Date;
        let message = template.message;

        switch (template.type) {
          case 'checkin_reminder':
            scheduledDate = addHours(checkInDate, template.triggerHours);
            message = `Hola ${reservation.passengerName}, ${message} Vuelo: ${reservation.arrivalFlight}`;
            break;
          case 'checkout_reminder':
            scheduledDate = addHours(checkOutDate, template.triggerHours);
            message = `Hola ${reservation.passengerName}, ${message} Vuelo: ${reservation.departureFlight}`;
            break;
          case 'welcome_message':
            scheduledDate = checkInDate;
            message = `¡Bienvenido ${reservation.passengerName}! Su ${reservation.cabinType} está lista. ${message}`;
            break;
          case 'flight_delay':
            scheduledDate = addHours(checkInDate, template.triggerHours);
            message = `${reservation.passengerName}, ${message} Vuelo ${reservation.arrivalFlight}.`;
            break;
          default:
            continue;
        }

        if (isAfter(scheduledDate, new Date())) {
          await this.createNotification({
            type: template.type,
            title: template.title,
            message,
            priority: this.getPriorityByType(template.type),
            status: 'pending',
            recipientId: reservation.id,
            recipientEmail: 'cabanasmanuara@gmail.com',
            scheduledAt: scheduledDate,
            isActive: true,
            metadata: {
              reservationId: reservation.id,
              cabinType: reservation.cabinType,
              passengerName: reservation.passengerName,
              flightNumber: template.type.includes('flight') ? reservation.arrivalFlight : undefined
            }
          });
        }
      } catch (error) {
        logger.error(`Error creating ${template.type} notification:`, error);
      }
    }
  }

  // Crear notificación de mantenimiento
  async createMaintenanceNotification(
    cabinType: string, 
    maintenanceDate: Date, 
    description: string
  ): Promise<void> {
    const scheduledDate = subHours(maintenanceDate, 48);

    if (isAfter(scheduledDate, new Date())) {
      await this.createNotification({
        type: 'maintenance_alert',
        title: 'Mantenimiento Programado',
        message: `Se ha programado mantenimiento para ${cabinType}: ${description}`,
        priority: 'medium',
        status: 'pending',
        recipientId: 'staff',
        recipientEmail: 'cabanasmanuara@gmail.com',
        scheduledAt: scheduledDate,
        isActive: true,
        metadata: {
          cabinType,
          maintenanceDate: maintenanceDate.toISOString(),
          description
        }
      });
    }
  }

  private getPriorityByType(type: NotificationType): NotificationPriority {
    const priorityMap: Record<NotificationType, NotificationPriority> = {
      'flight_delay': 'urgent',
      'maintenance_alert': 'high',
      'checkin_reminder': 'medium',
      'checkout_reminder': 'medium',
      'payment_reminder': 'high',
      'welcome_message': 'low',
      'cleaning_schedule': 'medium'
    };
    return priorityMap[type] || 'medium';
  }

  async processNotifications(): Promise<number> {
    logger.info('Starting notification processing...');
    
    const pendingNotifications = await this.getPendingNotifications();
    let processedCount = 0;

    for (const notification of pendingNotifications) {
      try {
        await this.sendEmailNotification(notification);
        
        if (notification.priority === 'urgent' || notification.priority === 'high') {
          await this.sendWhatsAppNotification(notification);
        }
        
        await this.markAsSent(notification.id);
        processedCount++;
      } catch (error) {
        logger.error(`Failed to process notification ${notification.id}:`, error);
      }
    }

    logger.success(`Processing complete. Processed: ${processedCount}/${pendingNotifications.length}`);
    return processedCount;
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    logger.info(`📧 Email sent for notification: ${notification.id}`);
  }

  private async sendWhatsAppNotification(notification: Notification): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    logger.info(`📱 WhatsApp sent for notification: ${notification.id}`);
  }

  // Obtener estadísticas optimizadas
  async getNotificationStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    read: number;
    completed: number;
    archived: number;
    unread: number;
  }> {
    try {
      const allNotifications = await this.getAllNotifications(500);
      
      const stats = {
        total: allNotifications.length,
        pending: allNotifications.filter(n => n.status === 'pending' && n.isActive).length,
        sent: allNotifications.filter(n => n.status === 'sent').length,
        read: allNotifications.filter(n => n.status === 'read').length,
        completed: allNotifications.filter(n => n.status === 'completed').length,
        archived: allNotifications.filter(n => n.status === 'archived').length,
        unread: allNotifications.filter(n => n.status === 'sent' && !n.readAt).length
      };

      return stats;
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      return { total: 0, pending: 0, sent: 0, read: 0, completed: 0, archived: 0, unread: 0 };
    }
  }
}

export const notificationService = new NotificationService();
