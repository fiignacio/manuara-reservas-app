
import { useEffect, useRef } from 'react';
import { notificationService } from '../lib/notificationService';
import { deleteExpiredReservations } from '../lib/reservationService';

export const useNotificationProcessor = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Procesar notificaciones cada 5 minutos
    const processNotifications = async () => {
      try {
        await notificationService.processNotifications();
        await deleteExpiredReservations();
      } catch (error) {
        // Silent error handling for background process
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
      throw error;
    }
  };

  return { manualProcess };
};
