import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { CheckInOutData, Reservation } from '@/types/reservation';
import { logger } from './logger';
// Removed automatic status calculations to prevent loops

const COLLECTION_NAME = 'reservas';

// Check-in/Check-out functions with automatic status updates
export const updateCheckInOut = async (data: CheckInOutData): Promise<void> => {
  logger.info('checkInOut.updateCheckInOut.start', { 
    type: data.type,
    reservationId: data.reservationId 
  });
  logger.time('checkInOut.updateCheckInOut');

  try {
    const docRef = doc(db, COLLECTION_NAME, data.reservationId);
    
    // Get current reservation data to calculate new statuses
    const { getDoc } = await import('firebase/firestore');
    const reservationDoc = await getDoc(docRef);
    const currentReservation = reservationDoc.data() as Reservation;
    
    if (!currentReservation) {
      logger.error('checkInOut.updateCheckInOut.reservation.not_found', { 
        reservationId: data.reservationId 
      });
      throw new Error('Reserva no encontrada');
    }
    
    const baseUpdateData = data.type === 'check_in' 
      ? {
          actualCheckIn: data.actualDateTime,
          checkInStatus: 'checked_in',
          checkInNotes: data.notes || '',
          updatedAt: Timestamp.now()
        }
      : {
          actualCheckOut: data.actualDateTime,
          checkOutStatus: 'checked_out',
          checkOutNotes: data.notes || '',
          updatedAt: Timestamp.now()
        };
    
    // Calculate new statuses
    const tempReservation = { ...currentReservation };
    if (data.type === 'check_in') {
      tempReservation.checkInStatus = 'checked_in' as const;
      tempReservation.actualCheckIn = data.actualDateTime;
    } else {
      tempReservation.checkOutStatus = 'checked_out' as const;
      tempReservation.actualCheckOut = data.actualDateTime;
    }
    
    // Keep existing statuses to prevent automatic changes and loops
    const finalUpdateData = {
      ...baseUpdateData
    };
    
    await updateDoc(docRef, finalUpdateData);

    logger.info('checkInOut.updateCheckInOut.success', { 
      type: data.type,
      reservationId: data.reservationId 
    });
  } catch (error) {
    logger.error('checkInOut.updateCheckInOut.error', { 
      type: data.type,
      reservationId: data.reservationId,
      error: String(error) 
    });
    throw error;
  } finally {
    logger.timeEnd('checkInOut.updateCheckInOut');
  }
};

export const markNoShow = async (reservationId: string): Promise<void> => {
  logger.info('checkInOut.markNoShow.start', { reservationId });
  try {
    const docRef = doc(db, COLLECTION_NAME, reservationId);
    await updateDoc(docRef, {
      checkInStatus: 'no_show',
      updatedAt: Timestamp.now()
    });
    logger.info('checkInOut.markNoShow.success', { reservationId });
  } catch (error) {
    logger.error('checkInOut.markNoShow.error', { reservationId, error: String(error) });
    throw error;
  }
};

export const markLateCheckout = async (reservationId: string): Promise<void> => {
  logger.info('checkInOut.markLateCheckout.start', { reservationId });
  try {
    const docRef = doc(db, COLLECTION_NAME, reservationId);
    await updateDoc(docRef, {
      checkOutStatus: 'late_checkout',
      updatedAt: Timestamp.now()
    });
    logger.info('checkInOut.markLateCheckout.success', { reservationId });
  } catch (error) {
    logger.error('checkInOut.markLateCheckout.error', { reservationId, error: String(error) });
    throw error;
  }
};

// Wrapper functions for better API
export const performCheckIn = async (data: CheckInOutData): Promise<void> => {
  return await updateCheckInOut(data);
};

export const performCheckOut = async (data: CheckInOutData): Promise<void> => {
  return await updateCheckInOut(data);
};

// Confirmation functions
export const markConfirmationSent = async (
  reservationId: string, 
  method: 'email' | 'whatsapp' | 'manual',
  notes?: string
): Promise<void> => {
  logger.info('checkInOut.markConfirmationSent.start', { reservationId, method });
  try {
    const docRef = doc(db, COLLECTION_NAME, reservationId);
    await updateDoc(docRef, {
      confirmationSent: true,
      confirmationSentDate: new Date().toISOString(),
      confirmationMethod: method,
      ...(notes && { confirmationNotes: notes }),
      updatedAt: Timestamp.now()
    });
    logger.info('checkInOut.markConfirmationSent.success', { reservationId, method });
  } catch (error) {
    logger.error('checkInOut.markConfirmationSent.error', { reservationId, method, error: String(error) });
    throw error;
  }
};