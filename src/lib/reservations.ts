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
import { addDays, getTomorrowDate, formatDateToISO, formatDateForDisplay, getTodayDate } from './dateUtils';
import { validateReservationDates, validateCabinCapacity } from './validation';
import { calculatePrice, calculateRemainingBalance, updatePaymentStatus } from './pricing';
import { checkCabinAvailability, getNextAvailableDate } from './availability';
import { toast } from '@/hooks/use-toast';

const COLLECTION_NAME = 'reservations';

// Normalize reservation data to ensure consistent date formats
const normalizeReservation = (rawReservation: any): Reservation => {
  const data = rawReservation;
  
  // Ensure checkIn and checkOut are always YYYY-MM-DD strings
  let checkIn = data.checkIn;
  let checkOut = data.checkOut;
  
  // Handle Timestamp objects from Firestore
  if (data.checkIn && typeof data.checkIn === 'object' && data.checkIn.toDate) {
    checkIn = formatDateToISO(data.checkIn.toDate());
  } else if (typeof data.checkIn === 'string' && data.checkIn.includes('T')) {
    // Handle ISO strings with time
    checkIn = data.checkIn.split('T')[0];
  }
  
  if (data.checkOut && typeof data.checkOut === 'object' && data.checkOut.toDate) {
    checkOut = formatDateToISO(data.checkOut.toDate());
  } else if (typeof data.checkOut === 'string' && data.checkOut.includes('T')) {
    // Handle ISO strings with time
    checkOut = data.checkOut.split('T')[0];
  }
  
  return {
    ...data,
    checkIn,
    checkOut,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
  } as Reservation;
};

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
      throw new Error(`La ${data.cabinType} no está disponible para las fechas seleccionadas (${formatDateForDisplay(data.checkIn)} - ${formatDateForDisplay(data.checkOut)}). Próxima fecha disponible: ${nextAvailable ? formatDateForDisplay(nextAvailable) : 'No disponible'}`);
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
        throw new Error(`La ${data.cabinType} no está disponible para las fechas seleccionadas (${formatDateForDisplay(data.checkIn)} - ${formatDateForDisplay(data.checkOut)}). Próxima fecha disponible: ${nextAvailable ? formatDateForDisplay(nextAvailable) : 'No disponible'}`);
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
    // Fetch all reservations without orderBy to avoid type conflicts
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    // Normalize and sort on client-side
    const reservations = querySnapshot.docs
      .map(doc => normalizeReservation({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    
    return reservations;
  } catch (error) {
    console.error('Error getting all reservations:', error);
    toast({
      title: "Error",
      description: "Error al obtener las reservas: " + (error instanceof Error ? error.message : 'Error desconocido'),
      variant: "destructive",
    });
    throw new Error('Error al obtener las reservas');
  }
};

export const getReservationsForDate = async (date: string): Promise<Reservation[]> => {
  try {
    // Fetch all reservations and filter client-side
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    // Normalize and filter locally to find reservations that overlap with the given date
    return querySnapshot.docs
      .map(doc => normalizeReservation({ id: doc.id, ...doc.data() }))
      .filter(reservation => {
        return reservation.checkIn <= date && reservation.checkOut > date;
      });
  } catch (error) {
    console.error('Error getting reservations for date:', error);
    toast({
      title: "Error",
      description: "Error al obtener las reservas para la fecha: " + (error instanceof Error ? error.message : 'Error desconocido'),
      variant: "destructive",
    });
    throw new Error('Error al obtener las reservas para la fecha especificada');
  }
};

export const getTodayArrivals = async (): Promise<Reservation[]> => {
  try {
    const today = getTodayDate();
    
    // Fetch all reservations and filter client-side for resilience
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    return querySnapshot.docs
      .map(doc => normalizeReservation({ id: doc.id, ...doc.data() }))
      .filter(reservation => reservation.checkIn === today);
  } catch (error) {
    console.error('Error getting today arrivals:', error);
    toast({
      title: "Error",
      description: "Error al obtener llegadas de hoy: " + (error instanceof Error ? error.message : 'Error desconocido'),
      variant: "destructive",
    });
    return [];
  }
};

export const getTodayDepartures = async (): Promise<Reservation[]> => {
  try {
    const today = getTodayDate();
    
    // Fetch all reservations and filter client-side for resilience
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    return querySnapshot.docs
      .map(doc => normalizeReservation({ id: doc.id, ...doc.data() }))
      .filter(reservation => reservation.checkOut === today);
  } catch (error) {
    console.error('Error getting today departures:', error);
    toast({
      title: "Error",
      description: "Error al obtener salidas de hoy: " + (error instanceof Error ? error.message : 'Error desconocido'),
      variant: "destructive",
    });
    return [];
  }
};

export const getUpcomingArrivals = async (days: number = 5): Promise<Reservation[]> => {
  try {
    const today = getTodayDate();
    const futureDate = addDays(today, days);
    
    // Fetch all reservations and filter client-side for resilience
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    return querySnapshot.docs
      .map(doc => normalizeReservation({ id: doc.id, ...doc.data() }))
      .filter(reservation => reservation.checkIn > today && reservation.checkIn <= futureDate)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  } catch (error) {
    console.error('Error getting upcoming arrivals:', error);
    toast({
      title: "Error",
      description: "Error al obtener próximas llegadas: " + (error instanceof Error ? error.message : 'Error desconocido'),
      variant: "destructive",
    });
    return [];
  }
};

export const getUpcomingDepartures = async (days: number = 5): Promise<Reservation[]> => {
  try {
    const today = getTodayDate();
    const futureDate = addDays(today, days);
    
    // Fetch all reservations and filter client-side for resilience
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    return querySnapshot.docs
      .map(doc => normalizeReservation({ id: doc.id, ...doc.data() }))
      .filter(reservation => reservation.checkOut > today && reservation.checkOut <= futureDate)
      .sort((a, b) => a.checkOut.localeCompare(b.checkOut));
  } catch (error) {
    console.error('Error getting upcoming departures:', error);
    toast({
      title: "Error",
      description: "Error al obtener próximas salidas: " + (error instanceof Error ? error.message : 'Error desconocido'),
      variant: "destructive",
    });
    return [];
  }
};

export const getTomorrowDepartures = async (): Promise<Reservation[]> => {
  try {
    const tomorrow = getTomorrowDate();
    
    // Fetch all reservations and filter client-side for resilience
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    return querySnapshot.docs
      .map(doc => normalizeReservation({ id: doc.id, ...doc.data() }))
      .filter(reservation => reservation.checkOut === tomorrow);
  } catch (error) {
    console.error('Error getting tomorrow departures:', error);
    toast({
      title: "Error",
      description: "Error al obtener salidas de mañana: " + (error instanceof Error ? error.message : 'Error desconocido'),
      variant: "destructive",
    });
    return [];
  }
};

export const getArrivalsForDate = async (date: string): Promise<Reservation[]> => {
  try {
    // Fetch all reservations and filter client-side for resilience
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    return querySnapshot.docs
      .map(doc => normalizeReservation({ id: doc.id, ...doc.data() }))
      .filter(reservation => reservation.checkIn === date);
  } catch (error) {
    console.error('Error getting arrivals for date:', error);
    toast({
      title: "Error",
      description: "Error al obtener llegadas para la fecha: " + (error instanceof Error ? error.message : 'Error desconocido'),
      variant: "destructive",
    });
    return [];
  }
};

export const deleteExpiredReservations = async (): Promise<number> => {
  const today = getTodayDate();
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '<', today)
  );
  
  const querySnapshot = await getDocs(q);
  
  const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  return querySnapshot.docs.length;
};