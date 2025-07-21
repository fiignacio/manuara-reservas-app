
import { useEffect, useRef } from 'react';
import { notificationService } from '../lib/notificationService';
import { deleteExpiredReservations } from '../lib/reservationService';

export const useNotificationProcessor = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Procesar notificaciones cada 5 minutos
    const processNotifications = async () => {
      try {
        console.log('Auto-processing notifications...');
        const processedCount = await notificationService.processNotifications();
        if (processedCount > 0) {
          console.log(`Auto-processed ${processedCount} notifications`);
        }

        // También eliminar reservas vencidas
        const deletedReservations = await deleteExpiredReservations();
        if (deletedReservations > 0) {
          console.log(`Auto-deleted ${deletedReservations} expired reservations`);
        }
      } catch (error) {
        console.error('Error in auto-processing notifications:', error);
      }
    };

    // Procesar inmediatamente al montar
    processNotifications();

    // Configurar intervalo
    intervalRef.current = setInterval(processNotifications, 5 * 60 * 1000); // 5 minutos

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const manualProcess = async () => {
    try {
      const processedCount = await notificationService.processNotifications();
      const deletedReservations = await deleteExpiredReservations();
      return { processedCount, deletedReservations };
    } catch (error) {
      console.error('Error in manual processing:', error);
      throw error;
    }
  };

  return { manualProcess };
};
