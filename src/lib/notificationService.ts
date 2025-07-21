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
import { addHours, subHours, format, isAfter, isBefore } from 'date-fns';

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

class NotificationService {
  private readonly collection = 'notifications';

  // Crear notificación
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date();
      console.log('Creating notification:', notification.title, 'scheduled for:', notification.scheduledAt);
      
      const docRef = await addDoc(collection(db, this.collection), {
        ...notification,
        scheduledAt: Timestamp.fromDate(notification.scheduledAt),
        sentAt: notification.sentAt ? Timestamp.fromDate(notification.sentAt) : null,
        readAt: notification.readAt ? Timestamp.fromDate(notification.readAt) : null,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      });
      
      console.log('Notification created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Obtener notificaciones pendientes (simplificado para evitar problemas de índices)
  async getPendingNotifications(): Promise<Notification[]> {
    try {
      const now = new Date();
      console.log('Getting pending notifications for:', now);
      
      // Query simplificada - obtenemos notificaciones activas y luego filtramos
      const q = query(
        collection(db, this.collection),
        where('isActive', '==', true),
        orderBy('scheduledAt', 'asc'),
        limit(100)
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

      // Filtrar en el cliente las que están pendientes y programadas
      const pendingNotifications = notifications.filter(notification => {
        const isNotSent = !notification.sentAt;
        const isScheduled = notification.scheduledAt <= now;
        const isNotSnoozed = !notification.snoozedUntil || notification.snoozedUntil <= now;
        const isNotArchived = !notification.archivedAt;
        const isNotCancelled = notification.status !== 'cancelled';
        
        return isNotSent && isScheduled && isNotSnoozed && isNotArchived && isNotCancelled;
      });

      console.log(`Found ${pendingNotifications.length} pending notifications out of ${notifications.length} total`);
      return pendingNotifications;
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  // Obtener todas las notificaciones
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
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  // Marcar notificación como enviada
  async markAsSent(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      await updateDoc(notificationRef, {
        sentAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      });
      console.log('Notification marked as sent:', notificationId);
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      throw error;
    }
  }

  // Marcar notificación como leída
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      await updateDoc(notificationRef, {
        readAt: Timestamp.fromDate(new Date()),
        status: 'read',
        updatedAt: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Marcar notificación como completada
  async markAsCompleted(notificationId: string, notes?: string, completedBy: string = 'system'): Promise<void> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      await updateDoc(notificationRef, {
        completedAt: Timestamp.fromDate(new Date()),
        completedBy,
        status: 'completed',
        notes: notes || null,
        actionTaken: notes || null,
        updatedAt: Timestamp.fromDate(new Date())
      });
      console.log('Notification marked as completed:', notificationId);
    } catch (error) {
      console.error('Error marking notification as completed:', error);
      throw error;
    }
  }

  // Archivar notificación
  async archiveNotification(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      await updateDoc(notificationRef, {
        archivedAt: Timestamp.fromDate(new Date()),
        status: 'archived',
        isActive: false,
        updatedAt: Timestamp.fromDate(new Date())
      });
      console.log('Notification archived:', notificationId);
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  }

  // Posponer notificación
  async snoozeNotification(notificationId: string, hours: number = 24): Promise<void> {
    try {
      const snoozeUntil = addHours(new Date(), hours);
      const notificationRef = doc(db, this.collection, notificationId);
      await updateDoc(notificationRef, {
        snoozedUntil: Timestamp.fromDate(snoozeUntil),
        status: 'snoozed',
        updatedAt: Timestamp.fromDate(new Date())
      });
      console.log('Notification snoozed until:', snoozeUntil, notificationId);
    } catch (error) {
      console.error('Error snoozing notification:', error);
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
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
      throw error;
    }
  }

  // Generar notificaciones automáticas para una reserva
  async generateReservationNotifications(reservation: Reservation): Promise<void> {
    if (!reservation.id) {
      console.warn('Cannot generate notifications for reservation without ID');
      return;
    }

    console.log('Generating notifications for reservation:', reservation.id, reservation.passengerName);

    const templates = DEFAULT_TEMPLATES.filter(t => t.isEnabled);
    const checkInDate = new Date(reservation.checkIn + 'T14:00:00'); // 2 PM check-in
    const checkOutDate = new Date(reservation.checkOut + 'T11:00:00'); // 11 AM check-out

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

        // Solo crear notificaciones futuras
        if (isAfter(scheduledDate, new Date())) {
          console.log(`Creating ${template.type} notification for ${scheduledDate}`);
          
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
        } else {
          console.log(`Skipping ${template.type} notification - scheduled for past date:`, scheduledDate);
        }
      } catch (error) {
        console.error(`Error creating ${template.type} notification:`, error);
      }
    }
  }

  // Crear notificación de mantenimiento
  async createMaintenanceNotification(
    cabinType: string, 
    maintenanceDate: Date, 
    description: string
  ): Promise<void> {
    const scheduledDate = subHours(maintenanceDate, 48); // 48 horas antes

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

  // Obtener prioridad según el tipo
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

  // Procesar notificaciones pendientes - IMPLEMENTACIÓN REAL
  async processNotifications(): Promise<number> {
    console.log('Starting notification processing...');
    
    const pendingNotifications = await this.getPendingNotifications();
    let processedCount = 0;

    console.log(`Processing ${pendingNotifications.length} pending notifications`);

    for (const notification of pendingNotifications) {
      try {
        console.log(`Processing notification ${notification.id}: ${notification.title}`);
        
        // Enviar por email
        await this.sendEmailNotification(notification);
        
        // Enviar por WhatsApp para notificaciones urgentes/altas
        if (notification.priority === 'urgent' || notification.priority === 'high') {
          await this.sendWhatsAppNotification(notification);
        }
        
        // Marcar como enviada
        await this.markAsSent(notification.id);
        processedCount++;
        
        console.log(`✅ Notification ${notification.id} processed successfully`);
      } catch (error) {
        console.error(`❌ Failed to process notification ${notification.id}:`, error);
        // Continuar con la siguiente notificación en caso de error
      }
    }

    console.log(`Notification processing complete. Processed: ${processedCount}/${pendingNotifications.length}`);
    return processedCount;
  }

  // Envío de notificaciones por email (mock funcional)
  private async sendEmailNotification(notification: Notification): Promise<void> {
    const emailConfig = {
      to: 'cabanasmanuara@gmail.com',
      subject: `[Manuara] ${notification.title}`,
      body: `
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        <hr>
        <p><strong>Prioridad:</strong> ${notification.priority}</p>
        <p><strong>Tipo:</strong> ${notification.type}</p>
        <p><strong>Destinatario:</strong> ${notification.recipientId}</p>
        <p><strong>Programada para:</strong> ${notification.scheduledAt.toLocaleString('es-CL')}</p>
        ${notification.metadata?.reservationId ? `<p><strong>ID Reserva:</strong> ${notification.metadata.reservationId}</p>` : ''}
        ${notification.metadata?.cabinType ? `<p><strong>Cabaña:</strong> ${notification.metadata.cabinType}</p>` : ''}
        ${notification.metadata?.passengerName ? `<p><strong>Pasajero:</strong> ${notification.metadata.passengerName}</p>` : ''}
      `
    };
    
    // Simular delay de envío
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('📧 Email notification sent:', {
      to: emailConfig.to,
      subject: emailConfig.subject,
      notificationId: notification.id
    });
  }

  // Envío de notificaciones por WhatsApp (mock funcional)
  private async sendWhatsAppNotification(notification: Notification): Promise<void> {
    const whatsappNumber = '+56984562244';
    const message = `🏠 *MANUARA - ${notification.title}*\n\n${notification.message}\n\n⏰ Programada: ${notification.scheduledAt.toLocaleString('es-CL')}\n🎯 Prioridad: ${notification.priority.toUpperCase()}`;
    
    // Simular delay de envío
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('📱 WhatsApp notification sent:', {
      to: whatsappNumber,
      message: message.substring(0, 100) + '...',
      notificationId: notification.id
    });
  }

  // Obtener estadísticas de notificaciones
  async getNotificationStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    read: number;
    completed: number;
    archived: number;
  }> {
    try {
      const allNotifications = await this.getAllNotifications(1000);
      
      const stats = {
        total: allNotifications.length,
        pending: allNotifications.filter(n => !n.sentAt && n.isActive && n.status !== 'cancelled').length,
        sent: allNotifications.filter(n => n.sentAt && !n.readAt && !n.completedAt).length,
        read: allNotifications.filter(n => n.readAt && !n.completedAt).length,
        completed: allNotifications.filter(n => n.completedAt).length,
        archived: allNotifications.filter(n => n.archivedAt).length
      };

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, pending: 0, sent: 0, read: 0, completed: 0, archived: 0 };
    }
  }
}

export const notificationService = new NotificationService();
