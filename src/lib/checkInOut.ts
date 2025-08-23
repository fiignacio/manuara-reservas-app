import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { CheckInOutData, Reservation } from '@/types/reservation';
// Removed automatic status calculations to prevent loops

const COLLECTION_NAME = 'reservas';

// Check-in/Check-out functions with automatic status updates
export const updateCheckInOut = async (data: CheckInOutData): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, data.reservationId);
  
  // Get current reservation data to calculate new statuses
  const { getDoc } = await import('firebase/firestore');
  const reservationDoc = await getDoc(docRef);
  const currentReservation = reservationDoc.data() as Reservation;
  
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
};

export const markNoShow = async (reservationId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, reservationId);
  await updateDoc(docRef, {
    checkInStatus: 'no_show',
    updatedAt: Timestamp.now()
  });
};

export const markLateCheckout = async (reservationId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, reservationId);
  await updateDoc(docRef, {
    checkOutStatus: 'late_checkout',
    updatedAt: Timestamp.now()
  });
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
  const docRef = doc(db, COLLECTION_NAME, reservationId);
  await updateDoc(docRef, {
    confirmationSent: true,
    confirmationSentDate: new Date().toISOString(),
    confirmationMethod: method,
    ...(notes && { confirmationNotes: notes }),
    updatedAt: Timestamp.now()
  });
};