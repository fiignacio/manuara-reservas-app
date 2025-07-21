import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc,
  Timestamp 
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
      const docRef = await addDoc(collection(db, this.collection), {
        ...notification,
        scheduledAt: Timestamp.fromDate(notification.scheduledAt),
        sentAt: notification.sentAt ? Timestamp.fromDate(notification.sentAt) : null,
        readAt: notification.readAt ? Timestamp.fromDate(notification.readAt) : null,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Obtener notificaciones pendientes
  async getPendingNotifications(): Promise<Notification[]> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.collection),
        where('isActive', '==', true),
        where('sentAt', '==', null),
        where('scheduledAt', '<=', Timestamp.fromDate(now)),
        orderBy('scheduledAt', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledAt: doc.data().scheduledAt.toDate(),
        sentAt: doc.data().sentAt?.toDate(),
        readAt: doc.data().readAt?.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Notification[];
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  // Obtener todas las notificaciones
  async getAllNotifications(limit: number = 50): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, this.collection),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.slice(0, limit).map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledAt: doc.data().scheduledAt.toDate(),
        sentAt: doc.data().sentAt?.toDate(),
        readAt: doc.data().readAt?.toDate(),
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
        updatedAt: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Generar notificaciones automáticas para una reserva
  async generateReservationNotifications(reservation: Reservation): Promise<void> {
    if (!reservation.id) return;

    const templates = DEFAULT_TEMPLATES.filter(t => t.isEnabled);
    const checkInDate = new Date(reservation.checkIn);
    const checkOutDate = new Date(reservation.checkOut);

    for (const template of templates) {
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
          scheduledDate = subHours(checkInDate, Math.abs(template.triggerHours));
          message = `${reservation.passengerName}, ${message} Vuelo ${reservation.arrivalFlight}.`;
          break;
        default:
          continue;
      }

      // Solo crear notificaciones futuras
      if (isAfter(scheduledDate, new Date())) {
        await this.createNotification({
          type: template.type,
          title: template.title,
          message,
          priority: this.getPriorityByType(template.type),
          recipientId: reservation.id,
          recipientEmail: '', // Se puede agregar email en el futuro
          scheduledAt: scheduledDate,
          isActive: true,
          metadata: {
            reservationId: reservation.id,
            cabinType: reservation.cabinType,
            flightNumber: template.type.includes('flight') ? reservation.arrivalFlight : undefined
          }
        });
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
        recipientId: 'staff',
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

  // Simular envío de notificaciones (en una implementación real, esto enviaría emails/push/WhatsApp)
  async processNotifications(): Promise<number> {
    const pendingNotifications = await this.getPendingNotifications();
    let processedCount = 0;

    for (const notification of pendingNotifications) {
      try {
        // Simular envío por email
        await this.sendEmailNotification(notification);
        
        // Simular envío por WhatsApp para notificaciones urgentes
        if (notification.priority === 'urgent' || notification.priority === 'high') {
          await this.sendWhatsAppNotification(notification);
        }
        
        console.log(`Sending notification: ${notification.title} to ${notification.recipientId}`);
        
        await this.markAsSent(notification.id);
        processedCount++;
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error);
      }
    }

    return processedCount;
  }

  // Envío de notificaciones por email
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
      `
    };
    
    // En una implementación real, aquí se enviaría el email usando un servicio como SendGrid, Nodemailer, etc.
    console.log('📧 Email enviado a:', emailConfig.to, 'Asunto:', emailConfig.subject);
  }

  // Envío de notificaciones por WhatsApp
  private async sendWhatsAppNotification(notification: Notification): Promise<void> {
    const whatsappNumber = '+56984562244';
    const message = `🏠 *MANUARA - ${notification.title}*\n\n${notification.message}\n\n⏰ Programada: ${notification.scheduledAt.toLocaleString('es-CL')}\n🎯 Prioridad: ${notification.priority.toUpperCase()}`;
    
    // En una implementación real, aquí se usaría la API de WhatsApp Business o un servicio como Twilio
    console.log('📱 WhatsApp enviado a:', whatsappNumber, 'Mensaje:', message);
  }

  // Obtener estadísticas de notificaciones
  async getNotificationStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    read: number;
  }> {
    try {
      const allNotifications = await this.getAllNotifications(1000);
      
      const stats = {
        total: allNotifications.length,
        pending: allNotifications.filter(n => !n.sentAt && n.isActive).length,
        sent: allNotifications.filter(n => n.sentAt && !n.readAt).length,
        read: allNotifications.filter(n => n.readAt).length
      };

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, pending: 0, sent: 0, read: 0 };
    }
  }
}

export const notificationService = new NotificationService();