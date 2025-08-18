import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { CheckInOutData } from '@/types/reservation';

const COLLECTION_NAME = 'reservations';

// Check-in/Check-out functions
export const updateCheckInOut = async (data: CheckInOutData): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, data.reservationId);
  
  const updateData = data.type === 'check_in' 
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
  
  await updateDoc(docRef, updateData);
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