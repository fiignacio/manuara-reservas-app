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
import { calculatePrice, calculateRemainingBalance, updatePaymentStatus, updateReservationStatus as updateReservationAutoStatus } from './pricing';
import { checkCabinAvailability, getNextAvailableDate } from './availability';

const COLLECTION_NAME = 'reservas';

// Cabin type mapping for legacy data
const CABIN_TYPE_MAPPING: Record<string, string> = {
  'Cabaña Pequeña': 'Cabaña Pequeña (Max 3p)',
  'Cabaña Mediana 1': 'Cabaña Mediana 1 (Max 4p)',
  'Cabaña Mediana 2': 'Cabaña Mediana 2 (Max 4p)',
  'Cabaña Grande': 'Cabaña Grande (Max 6p)',
  'Pequeña': 'Cabaña Pequeña (Max 3p)',
  'Mediana 1': 'Cabaña Mediana 1 (Max 4p)',
  'Mediana 2': 'Cabaña Mediana 2 (Max 4p)',
  'Grande': 'Cabaña Grande (Max 6p)'
};

// Date normalization - convert DD-MM-YYYY to YYYY-MM-DD
const normalizeDateFormat = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // If in DD-MM-YYYY format, convert to YYYY-MM-DD
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  }
  
  return dateStr; // Return original if format not recognized
};

// Cabin type normalization
const normalizeCabinType = (cabinType: string): string => {
  if (!cabinType) return '';
  return CABIN_TYPE_MAPPING[cabinType] || cabinType;
};

// Normalize reservation data to ensure consistent date formats
const normalizeReservation = (rawReservation: any): Reservation => {
  const checkIn = rawReservation.checkIn && typeof rawReservation.checkIn === 'object' && rawReservation.checkIn.toDate 
    ? formatDateToISO(rawReservation.checkIn.toDate())
    : normalizeDateFormat(rawReservation.checkIn?.split('T')[0] || rawReservation.checkIn);

  const checkOut = rawReservation.checkOut && typeof rawReservation.checkOut === 'object' && rawReservation.checkOut.toDate 
    ? formatDateToISO(rawReservation.checkOut.toDate())
    : normalizeDateFormat(rawReservation.checkOut?.split('T')[0] || rawReservation.checkOut);

  const actualCheckIn = rawReservation.actualCheckIn && typeof rawReservation.actualCheckIn === 'object' && rawReservation.actualCheckIn.toDate 
    ? rawReservation.actualCheckIn.toDate().toISOString()
    : rawReservation.actualCheckIn;

  const actualCheckOut = rawReservation.actualCheckOut && typeof rawReservation.actualCheckOut === 'object' && rawReservation.actualCheckOut.toDate 
    ? rawReservation.actualCheckOut.toDate().toISOString()
    : rawReservation.actualCheckOut;

  const confirmationSentDate = rawReservation.confirmationSentDate && typeof rawReservation.confirmationSentDate === 'object' && rawReservation.confirmationSentDate.toDate 
    ? rawReservation.confirmationSentDate.toDate().toISOString()
    : rawReservation.confirmationSentDate;

  const createdAt = rawReservation.createdAt?.toDate ? rawReservation.createdAt.toDate() : rawReservation.createdAt;
  const updatedAt = rawReservation.updatedAt?.toDate ? rawReservation.updatedAt.toDate() : rawReservation.updatedAt;

  const reservation = {
    ...rawReservation,
    id: rawReservation.id,
    checkIn,
    checkOut,
    actualCheckIn,
    actualCheckOut,
    confirmationSentDate,
    createdAt,
    updatedAt,
    // Normalize cabin type
    cabinType: normalizeCabinType(rawReservation.cabinType || ''),
    // Ensure payments array exists
    payments: rawReservation.payments || [],
    // Set default status values if missing
    paymentStatus: rawReservation.paymentStatus || 'pending_deposit',
    reservationStatus: rawReservation.reservationStatus || 'pending_checkin'
  } as Reservation;

  return reservation;
};

export const createReservation = async (data: ReservationFormData): Promise<string> => {
  // Validation
  if (!data.checkIn || !data.checkOut) {
    throw new Error('Las fechas de check-in y check-out son obligatorias.');
  }
  
  const dateValidation = validateReservationDates(data.checkIn, data.checkOut);
  if (!dateValidation.isValid) {
    throw new Error(dateValidation.error);
  }
  
  const capacityValidation = validateCabinCapacity(data.cabinType, data.adults, data.children, data.babies);
  if (!capacityValidation.isValid) {
    throw new Error(capacityValidation.error);
  }
  
  const isAvailable = await checkCabinAvailability(data.cabinType, data.checkIn, data.checkOut);
  if (!isAvailable) {
    const nextAvailable = await getNextAvailableDate(data.cabinType, data.checkIn);
    throw new Error(`La ${data.cabinType} no está disponible para las fechas seleccionadas (${formatDateForDisplay(data.checkIn)} - ${formatDateForDisplay(data.checkOut)}). Próxima fecha disponible: ${nextAvailable ? formatDateForDisplay(nextAvailable) : 'No disponible'}`);
  }

  // Calculate price and statuses
  const totalPrice = calculatePrice(data);
  const paymentStatus = 'pending_deposit' as const;
  const reservationStatus = 'pending_checkin' as const;

  const reservationData = {
    ...data,
    totalPrice,
    payments: [],
    remainingBalance: totalPrice,
    paymentStatus,
    reservationStatus,
    checkInStatus: 'pending' as const,
    checkOutStatus: 'pending' as const,
    confirmationSent: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), reservationData);
  return docRef.id;
};

export const updateReservation = async (id: string, data: ReservationFormData, shouldUpdateDates: boolean = true): Promise<void> => {
  const capacityValidation = validateCabinCapacity(data.cabinType, data.adults, data.children, data.babies);
  if (!capacityValidation.isValid) {
    throw new Error(capacityValidation.error);
  }
  
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

  // Get current reservation to preserve payments
  const reservations = await getAllReservations();
  const reservation = reservations.find(r => r.id === id);
  if (!reservation) {
    throw new Error('Reserva no encontrada');
  }

  // Recalculate derived fields
  const totalPrice = calculatePrice(data);
  const currentBalance = reservation.totalPrice - (reservation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
  const newBalance = totalPrice - (reservation.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
  
  const tempReservation = { ...reservation, totalPrice, remainingBalance: newBalance } as Reservation;
  
  const updateData = {
    ...data,
    totalPrice,
    remainingBalance: newBalance,
    paymentStatus: updatePaymentStatus(tempReservation),
    reservationStatus: updateReservationAutoStatus(tempReservation),
    updatedAt: Timestamp.now()
  };

  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, updateData);
};

export const deleteReservation = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

export const getAllReservations = async (): Promise<Reservation[]> => {
  const reservations: Reservation[] = [];
  const seenIds = new Set<string>();
  
  // Read from primary collection (reservas)
  try {
    const q1 = query(collection(db, COLLECTION_NAME), orderBy('checkIn', 'asc'));
    const snapshot1 = await getDocs(q1);
    
    snapshot1.docs.forEach(doc => {
      const data = doc.data();
      reservations.push(normalizeReservation({ ...data, id: doc.id }));
      seenIds.add(doc.id);
    });
  } catch (error) {
    console.warn('Could not read from reservas collection:', error);
  }
  
  // Read from legacy collection (reservations) for any missing data
  try {
    const q2 = query(collection(db, 'reservations'), orderBy('checkIn', 'asc'));
    const snapshot2 = await getDocs(q2);
    
    snapshot2.docs.forEach(doc => {
      // Only add if not already seen from primary collection
      if (!seenIds.has(doc.id)) {
        const data = doc.data();
        reservations.push(normalizeReservation({ ...data, id: doc.id }));
      }
    });
  } catch (error) {
    console.warn('Could not read from reservations collection:', error);
  }
  
  // Sort by checkIn date after combining both collections
  const sortedReservations = reservations.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  
  // Update statuses for all reservations automatically
  try {
    const { runStatusMaintenance } = await import('./statusUpdater');
    runStatusMaintenance().catch(console.error); // Run in background without blocking
  } catch (error) {
    console.warn('Status maintenance failed:', error);
  }
  
  return sortedReservations;
};

export const getReservationsForDate = async (date: string): Promise<Reservation[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '<=', date),
    where('checkOut', '>', date)
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return normalizeReservation({ ...data, id: doc.id });
  });
};

export const getTodayArrivals = async (): Promise<Reservation[]> => {
  const today = getTodayDate();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '==', today)
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return normalizeReservation({ ...data, id: doc.id });
  });
};

export const getTodayDepartures = async (): Promise<Reservation[]> => {
  const today = getTodayDate();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '==', today)
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return normalizeReservation({ ...data, id: doc.id });
  });
};

export const getUpcomingArrivals = async (days: number = 5): Promise<Reservation[]> => {
  const today = getTodayDate();
  const futureDate = addDays(today, days);
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '>', today),
    where('checkIn', '<=', futureDate),
    orderBy('checkIn', 'asc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return normalizeReservation({ ...data, id: doc.id });
  });
};

export const getUpcomingDepartures = async (days: number = 5): Promise<Reservation[]> => {
  const today = getTodayDate();
  const futureDate = addDays(today, days);
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '>', today),
    where('checkOut', '<=', futureDate),
    orderBy('checkOut', 'asc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return normalizeReservation({ ...data, id: doc.id });
  });
};

export const getTomorrowDepartures = async (): Promise<Reservation[]> => {
  const tomorrow = getTomorrowDate();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '==', tomorrow)
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return normalizeReservation({ ...data, id: doc.id });
  });
};

export const getArrivalsForDate = async (date: string): Promise<Reservation[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '==', date)
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return normalizeReservation({ ...data, id: doc.id });
  });
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

// Update reservation status fields without requiring full form data
export const updateReservationStatuses = async (
  reservationId: string,
  statusUpdates: Partial<Pick<Reservation, 'paymentStatus' | 'reservationStatus' | 'checkInStatus' | 'checkOutStatus' | 'checkInNotes' | 'checkOutNotes'>>
): Promise<void> => {
  try {
    const reservationRef = doc(db, COLLECTION_NAME, reservationId);
    const updateData = {
      ...statusUpdates,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(reservationRef, updateData);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    throw new Error('No se pudo actualizar el estado de la reserva');
  }
};