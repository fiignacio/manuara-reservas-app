import { doc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Reservation } from '@/types/reservation';
import { updatePaymentStatus, updateReservationStatus } from './pricing';

const COLLECTION_NAME = 'reservas';

// Function to automatically update statuses for all reservations
export const updateAllReservationStatuses = async (): Promise<void> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const snapshot = await getDocs(q);
    
    const updates: Promise<void>[] = [];
    
    snapshot.forEach((docSnapshot) => {
      const reservation = docSnapshot.data() as Reservation;
      const newPaymentStatus = updatePaymentStatus(reservation);
      const newReservationStatus = updateReservationStatus(reservation);
      
      // Only update if status has changed
      if (reservation.paymentStatus !== newPaymentStatus || 
          reservation.reservationStatus !== newReservationStatus) {
        const docRef = doc(db, COLLECTION_NAME, docSnapshot.id);
        updates.push(updateDoc(docRef, {
          paymentStatus: newPaymentStatus,
          reservationStatus: newReservationStatus,
          updatedAt: new Date()
        }));
      }
    });
    
    await Promise.all(updates);
  } catch (error) {
    console.error('Error updating reservation statuses:', error);
    throw error;
  }
};

// Function to mark departed reservations as departed automatically
export const processDepartedReservations = async (): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Simplify query to avoid complex index requirements
    // First get all reservations that are checked out
    const q = query(
      collection(db, COLLECTION_NAME),
      where('checkOutStatus', '==', 'checked_out')
    );
    
    const snapshot = await getDocs(q);
    const updates: Promise<void>[] = [];
    
    snapshot.forEach((docSnapshot) => {
      const reservation = docSnapshot.data();
      
      // Filter in memory to avoid complex query
      const shouldMarkDeparted = 
        reservation.checkOut <= yesterdayStr && 
        reservation.reservationStatus !== 'departed';
        
      if (shouldMarkDeparted) {
        const docRef = doc(db, COLLECTION_NAME, docSnapshot.id);
        updates.push(updateDoc(docRef, {
          reservationStatus: 'departed',
          updatedAt: new Date()
        }));
      }
    });
    
    await Promise.all(updates);
    return updates.length;
  } catch (error) {
    console.error('Error processing departed reservations:', error);
    throw error;
  }
};

// Function to be called periodically (e.g., on app load or daily)
export const runStatusMaintenance = async (): Promise<{ updated: number; departed: number }> => {
  try {
    await updateAllReservationStatuses();
    const departedCount = await processDepartedReservations();
    
    return {
      updated: 0, // We don't track exact count of updated reservations
      departed: departedCount
    };
  } catch (error) {
    console.error('Error running status maintenance:', error);
    throw error;
  }
};