import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  doc, 
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Reservation, ReservationFormData } from '@/types/reservation';
import { addDays, getTomorrowDate } from './dateUtils';
import { validateReservationDates, validateCabinCapacity } from './validation';
import { calculatePrice, calculateRemainingBalance, updatePaymentStatus } from './pricing';
import { checkCabinAvailability, getNextAvailableDate } from './availability';

const COLLECTION_NAME = 'reservations';

export const createReservation = async (data: ReservationFormData): Promise<string> => {
  try {
    if (!data.checkIn || !data.checkOut) {
      throw new Error('Las fechas de check-in y check-out son obligatorias.');
    }
    
    // Validar fechas antes de verificar disponibilidad
    const dateValidation = validateReservationDates(data.checkIn, data.checkOut);
    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }
    
    // Validar capacidad de la cabaña
    const capacityValidation = validateCabinCapacity(data.cabinType, data.adults, data.children, data.babies);
    if (!capacityValidation.isValid) {
      throw new Error(capacityValidation.error);
    }
    
    // Validar disponibilidad antes de crear
    const isAvailable = await checkCabinAvailability(data.cabinType, data.checkIn, data.checkOut);
    
    if (!isAvailable) {
      const nextAvailable = await getNextAvailableDate(data.cabinType, data.checkIn);
      throw new Error(`La ${data.cabinType} no está disponible para las fechas seleccionadas (${new Date(data.checkIn).toLocaleDateString('es-ES')} - ${new Date(data.checkOut).toLocaleDateString('es-ES')}). Próxima fecha disponible: ${nextAvailable ? new Date(nextAvailable).toLocaleDateString('es-ES') : 'No disponible'}`);
    }

    const totalPrice = calculatePrice(data);
    const reservation = {
      ...data,
      totalPrice,
      remainingBalance: totalPrice,
      paymentStatus: 'pending' as const,
      checkInStatus: 'pending' as const,
      checkOutStatus: 'pending' as const,
      confirmationSent: false,
      payments: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), reservation);
    return docRef.id;
  } catch (error) {
    console.error('Error creating reservation:', error);
    throw error;
  }
};

export const updateReservation = async (id: string, data: ReservationFormData, shouldUpdateDates: boolean = true): Promise<void> => {
  try {
    // Validar capacidad de la cabaña siempre
    const capacityValidation = validateCabinCapacity(data.cabinType, data.adults, data.children, data.babies);
    if (!capacityValidation.isValid) {
      throw new Error(capacityValidation.error);
    }
    
    // Solo validar fechas si shouldUpdateDates es true
    if (shouldUpdateDates) {
      if (!data.checkIn || !data.checkOut) {
        throw new Error('Las fechas de check-in y check-out son obligatorias.');
      }
      const dateValidation = validateReservationDates(data.checkIn, data.checkOut);
      if (!dateValidation.isValid) {
        throw new Error(dateValidation.error);
      }
      
      const isAvailable = await checkCabinAvailability(data.cabinType, data.checkIn, data.checkOut, id);
      
      if (!isAvailable) {
        const nextAvailable = await getNextAvailableDate(data.cabinType, data.checkIn);
        throw new Error(`La ${data.cabinType} no está disponible para las fechas seleccionadas (${new Date(data.checkIn).toLocaleDateString('es-ES')} - ${new Date(data.checkOut).toLocaleDateString('es-ES')}). Próxima fecha disponible: ${nextAvailable ? new Date(nextAvailable).toLocaleDateString('es-ES') : 'No disponible'}`);
      }
    }

    const totalPrice = calculatePrice(data);
    
    // Get current reservation to preserve payments
    const reservations = await getAllReservations();
    const currentReservation = reservations.find((r: any) => r.id === id);
    const payments = currentReservation?.payments || [];
    
    // Recalculate remaining balance and payment status
    const updatedReservation = {
      ...data,
      totalPrice,
      payments
    } as any;
    
    const remainingBalance = calculateRemainingBalance(updatedReservation);
    const paymentStatus = updatePaymentStatus(updatedReservation);
    
    const reservation = {
      ...data,
      totalPrice,
      remainingBalance,
      paymentStatus,
      updatedAt: Timestamp.now()
    };
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, reservation);
  } catch (error) {
    console.error('Error updating reservation:', error);
    throw error;
  }
};

export const deleteReservation = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

export const getAllReservations = async (): Promise<Reservation[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('checkIn', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Reservation[];
  } catch (error) {
    console.error('Error getting all reservations:', error);
    throw new Error('Error al obtener las reservas');
  }
};

export const getReservationsForDate = async (date: string): Promise<Reservation[]> => {
  try {
    // Query by checkIn only to avoid inequality on two different fields
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('checkIn', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    // Filter locally to find reservations that overlap with the given date
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as Reservation))
      .filter(reservation => {
        return reservation.checkIn <= date && reservation.checkOut > date;
      });
  } catch (error) {
    console.error('Error getting reservations for date:', error);
    throw new Error('Error al obtener las reservas para la fecha especificada');
  }
};

export const getTodayArrivals = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '==', today)
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as Reservation[];
};

export const getTodayDepartures = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '==', today)
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as Reservation[];
};

export const getUpcomingArrivals = async (days: number = 5): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = addDays(today, days);
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '>', today),
    where('checkIn', '<=', futureDate),
    orderBy('checkIn', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as Reservation[];
};

export const getUpcomingDepartures = async (days: number = 5): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = addDays(today, days);
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '>', today),
    where('checkOut', '<=', futureDate),
    orderBy('checkOut', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as Reservation[];
};

export const getTomorrowDepartures = async (): Promise<Reservation[]> => {
  const tomorrow = getTomorrowDate();
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '==', tomorrow)
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as Reservation[];
};

export const getArrivalsForDate = async (date: string): Promise<Reservation[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '==', date)
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as Reservation[];
};

export const deleteExpiredReservations = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '<', today)
  );
  
  const querySnapshot = await getDocs(q);
  
  const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  return querySnapshot.docs.length;
};