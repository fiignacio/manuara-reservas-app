import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Reservation, ReservationFormData, CheckInOutData } from '@/types/reservation';
import { Payment, PaymentFormData } from '@/types/payment';
import { addDays, getTomorrowDate } from './dateUtils';
import { notificationService } from './notificationService';

const COLLECTION_NAME = 'reservas';

// Clean reservation data to remove undefined fields and set defaults
const cleanReservationData = (data: Partial<Reservation>) => {
  const cleaned: Record<string, any> = {};
  
  // Copy all defined values
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });
  
  // Ensure critical fields have default values
  if (cleaned.useCustomPrice === undefined) {
    cleaned.useCustomPrice = false;
  }
  
  if (cleaned.babies === undefined) {
    cleaned.babies = 0;
  }
  
  // Only include customPrice if useCustomPrice is true
  if (!cleaned.useCustomPrice) {
    delete cleaned.customPrice;
  } else if (cleaned.customPrice === undefined) {
    cleaned.customPrice = 0;
  }
  
  return cleaned;
};

// Validate cabin capacity considering babies don't count towards the limit
export const validateCabinCapacity = (cabinType: string, adults: number, children: number, babies: number): { isValid: boolean; error?: string } => {
  const totalGuests = adults + children; // Babies don't count towards capacity limit
  const maxCapacity = cabinType.includes('Pequeña') ? 3 : 
                     cabinType.includes('Mediana') ? 4 : 6;
  
  if (totalGuests > maxCapacity) {
    return {
      isValid: false,
      error: `La ${cabinType} tiene capacidad máxima para ${maxCapacity} personas (adultos + niños), pero has seleccionado ${totalGuests} huéspedes (${adults} adultos + ${children} niños). Los bebés no cuentan para el límite de capacidad.`
    };
  }
  
  return { isValid: true };
};

export const calculatePrice = (data: ReservationFormData): number => {
  // If using custom price, return that value
  if (data.useCustomPrice && data.customPrice) {
    return data.customPrice;
  }

  // Otherwise calculate automatically
  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (nights <= 0) return 0;
  
  const costPerNightAdults = data.season === 'Alta' ? 30000 : 25000;
  const costPerNightChildren = 15000;
  // Babies don't pay
  
  const costPerNight = (data.adults * costPerNightAdults) + (data.children * costPerNightChildren);
  
  return costPerNight * nights;
};

export const calculateRemainingBalance = (reservation: Reservation): number => {
  const totalPaid = reservation.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, reservation.totalPrice - totalPaid);
};

export const updatePaymentStatus = (reservation: Reservation): 'pending' | 'partially_paid' | 'fully_paid' | 'overdue' => {
  const remainingBalance = calculateRemainingBalance(reservation);
  const totalPaid = reservation.payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  if (remainingBalance === 0) {
    return 'fully_paid';
  } else if (totalPaid > 0) {
    return 'partially_paid';
  } else {
    // Check if overdue (checkout date has passed)
    const checkOutDate = new Date(reservation.checkOut);
    const today = new Date();
    if (checkOutDate < today) {
      return 'overdue';
    }
    return 'pending';
  }
};

export const addPayment = async (reservationId: string, paymentData: PaymentFormData): Promise<void> => {
  console.log('Adding payment for reservation:', reservationId);
  
  // Get current reservation
  const reservations = await getAllReservations();
  const reservation = reservations.find(r => r.id === reservationId);
  
  if (!reservation) {
    throw new Error('Reserva no encontrada');
  }
  
  // Validate payment amount
  const currentBalance = calculateRemainingBalance(reservation);
  if (paymentData.amount > currentBalance) {
    throw new Error(`El monto del pago (${paymentData.amount.toLocaleString('es-CL')}) excede el balance pendiente (${currentBalance.toLocaleString('es-CL')})`);
  }
  
  if (paymentData.amount <= 0) {
    throw new Error('El monto del pago debe ser mayor a 0');
  }
  
  // Create new payment
  const newPayment: Payment = {
    ...paymentData,
    id: Date.now().toString(), // Simple ID generation
    createdAt: new Date()
  };
  
  // Update reservation with new payment
  const updatedPayments = [...reservation.payments, newPayment];
  const updatedReservation = {
    ...reservation,
    payments: updatedPayments
  };
  
  const newRemainingBalance = calculateRemainingBalance(updatedReservation);
  const newPaymentStatus = updatePaymentStatus(updatedReservation);
  
  const updateData = cleanReservationData({
    payments: updatedPayments,
    remainingBalance: newRemainingBalance,
    paymentStatus: newPaymentStatus,
    updatedAt: new Date()
  });
  
  await updateDoc(doc(db, COLLECTION_NAME, reservationId), updateData);
};

export const checkCabinAvailability = async (
  cabinType: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): Promise<boolean> => {
  let q = query(
    collection(db, COLLECTION_NAME),
    where('cabinType', '==', cabinType)
  );

  const querySnapshot = await getDocs(q);
  
  const conflictingReservations = querySnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Reservation))
    .filter(reservation => {
      // Excluir la reserva actual si estamos editando
      if (excludeReservationId && reservation.id === excludeReservationId) {
        return false;
      }

      const resCheckIn = reservation.checkIn;
      const resCheckOut = reservation.checkOut;

      return checkIn < resCheckOut && checkOut > resCheckIn;
    });

  return conflictingReservations.length === 0;
};

export const validateReservationDates = (checkIn: string, checkOut: string): { isValid: boolean; error?: string } => {
  const today = new Date().toISOString().split('T')[0];
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const maxDate = addDays(today, 730); // 2 años en el futuro
  const daysDifference = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  // Validar que check-in no sea en el pasado
  if (checkIn < today) {
    return {
      isValid: false,
      error: `La fecha de check-in no puede ser anterior a hoy (${new Date(today).toLocaleDateString('es-ES')})`
    };
  }

  // Validar que check-out sea posterior a check-in
  if (checkOut <= checkIn) {
    return {
      isValid: false,
      error: 'La fecha de check-out debe ser al menos un día después del check-in'
    };
  }

  // Validar que no sea muy lejana en el futuro
  if (checkIn > maxDate) {
    return {
      isValid: false,
      error: 'No se pueden hacer reservas con más de 2 años de anticipación'
    };
  }

  // Validar duración máxima de estancia
  if (daysDifference > 30) {
    return {
      isValid: false,
      error: 'La estancia máxima permitida es de 30 días'
    };
  }

  return { isValid: true };
};

export const getNextAvailableDate = async (cabinType: string, preferredCheckIn: string): Promise<string | null> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('cabinType', '==', cabinType),
    where('checkOut', '>', preferredCheckIn),
    orderBy('checkOut', 'asc')
  );

  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return preferredCheckIn; // Cabaña disponible desde la fecha preferida
  }

  // Buscar el primer gap disponible
  const reservations = querySnapshot.docs.map(doc => doc.data() as Reservation);
  
  for (const reservation of reservations) {
    if (preferredCheckIn < reservation.checkIn) {
      return preferredCheckIn; // Hay un gap antes de esta reserva
    }
    // La cabaña estará disponible desde el día de check-out de esta reserva
    preferredCheckIn = reservation.checkOut;
  }

  return preferredCheckIn;
};

export const createReservation = async (data: ReservationFormData): Promise<string> => {
  console.log('Creating reservation for:', data.passengerName);
  console.log('Form data received:', data);
  
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
  const reservation: Omit<Reservation, 'id'> = {
    ...data,
    totalPrice,
    payments: [],
    remainingBalance: totalPrice,
    paymentStatus: 'pending',
    checkInStatus: 'pending',
    checkOutStatus: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('Reservation object before cleaning:', reservation);
  
  // Clean the data before sending to Firebase
  const cleanedReservation = cleanReservationData(reservation);
  
  console.log('Cleaned reservation object:', cleanedReservation);
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedReservation);
  
  // Generar notificaciones automáticas para la nueva reserva
  try {
    const fullReservation: Reservation = {
      ...reservation,
      id: docRef.id
    };
    
    console.log('Generating notifications for new reservation:', docRef.id);
    await notificationService.generateReservationNotifications(fullReservation);
  } catch (error) {
    console.error('Error generating notifications for reservation:', error);
  }
  
  return docRef.id;
};

export const updateReservation = async (id: string, data: ReservationFormData, shouldUpdateDates: boolean = true): Promise<void> => {
  console.log('Updating reservation:', id, 'shouldUpdateDates:', shouldUpdateDates);
  console.log('Update data received:', data);
  
  // Validar capacidad de la cabaña siempre
  const capacityValidation = validateCabinCapacity(data.cabinType, data.adults, data.children, data.babies);
  if (!capacityValidation.isValid) {
    throw new Error(capacityValidation.error);
  }
  
  // Solo validar fechas si shouldUpdateDates es true
  if (shouldUpdateDates) {
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
  const currentReservation = reservations.find(r => r.id === id);
  const payments = currentReservation?.payments || [];
  
  // Recalculate remaining balance and payment status
  const updatedReservation = {
    ...data,
    totalPrice,
    payments
  } as Reservation;
  
  const remainingBalance = calculateRemainingBalance(updatedReservation);
  const paymentStatus = updatePaymentStatus(updatedReservation);
  
  const reservation: Partial<Reservation> = {
    ...data,
    totalPrice,
    remainingBalance,
    paymentStatus,
    updatedAt: new Date()
  };
  
  console.log('Reservation object before cleaning:', reservation);
  
  // Clean the data before sending to Firebase
  const cleanedReservation = cleanReservationData(reservation);
  
  console.log('Cleaned reservation object:', cleanedReservation);
  
  await updateDoc(doc(db, COLLECTION_NAME, id), cleanedReservation);
  
  // Regenerar notificaciones solo si las fechas se actualizaron
  if (shouldUpdateDates) {
    try {
      const fullReservation: Reservation = {
        ...reservation,
        id,
        payments,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Reservation;
      
      console.log('Regenerating notifications for updated reservation:', id);
      await notificationService.generateReservationNotifications(fullReservation);
    } catch (error) {
      console.error('Error regenerating notifications for reservation:', error);
    }
  }
};

export const deleteReservation = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};

export const getAllReservations = async (): Promise<Reservation[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('checkIn', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const getReservationsForDate = async (date: string): Promise<Reservation[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '<=', date),
    where('checkOut', '>', date)
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
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
    ...doc.data()
  } as Reservation));
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
    ...doc.data()
  } as Reservation));
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
    ...doc.data()
  } as Reservation));
};

export const getUpcomingDepartures = async (days: number = 5): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = addDays(today, days);
  
  console.log(`Getting upcoming departures from ${today} to ${futureDate}`);
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '>', today),
    where('checkOut', '<=', futureDate),
    orderBy('checkOut', 'asc')
  );
  const querySnapshot = await getDocs(q);
  
  const departures = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
  
  console.log(`Found ${departures.length} upcoming departures:`, 
    departures.map(d => ({
      id: d.id,
      passenger: d.passengerName,
      cabin: d.cabinType,
      checkOut: d.checkOut,
      flight: d.departureFlight
    }))
  );
  
  return departures;
};

export const getTomorrowDepartures = async (): Promise<Reservation[]> => {
  const tomorrow = getTomorrowDate();
  console.log('Getting tomorrow departures for date:', tomorrow);
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '==', tomorrow)
  );
  const querySnapshot = await getDocs(q);
  
  const departures = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
  
  console.log(`Found ${departures.length} departures for tomorrow (${tomorrow}):`, 
    departures.map(d => ({
      id: d.id,
      passenger: d.passengerName,
      cabin: d.cabinType,
      checkOut: d.checkOut,
      flight: d.departureFlight
    }))
  );
  
  return departures;
};

export const getArrivalsForDate = async (date: string): Promise<Reservation[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '==', date)
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const deleteExpiredReservations = async (): Promise<number> => {
  console.log('Checking for expired reservations...');
  
  const today = new Date().toISOString().split('T')[0];
  console.log('Today date:', today);
  
  // Buscar reservas que salieron antes de hoy (no igual a hoy)
  // Si checkout es '2025-01-21', se debe eliminar a partir del '2025-01-22'
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '<', today)
  );
  
  const querySnapshot = await getDocs(q);
  let deletedCount = 0;
  
  console.log(`Found ${querySnapshot.docs.length} reservations to evaluate for deletion`);
  
  // Eliminar reservas vencidas
  for (const docSnapshot of querySnapshot.docs) {
    try {
      const reservationData = docSnapshot.data();
      console.log(`Deleting expired reservation: ${docSnapshot.id}, checkout: ${reservationData.checkOut}, passenger: ${reservationData.passengerName}`);
      
      await deleteDoc(doc(db, COLLECTION_NAME, docSnapshot.id));
      deletedCount++;
    } catch (error) {
      console.error(`Error deleting expired reservation ${docSnapshot.id}:`, error);
    }
  }
  
  if (deletedCount > 0) {
    console.log(`Successfully deleted ${deletedCount} expired reservations`);
  } else {
    console.log('No expired reservations found');
  }
  
  return deletedCount;
};

// ============= CHECK-IN/CHECK-OUT FUNCTIONS =============

export const performCheckIn = async (data: CheckInOutData): Promise<void> => {
  try {
    const reservationRef = doc(db, COLLECTION_NAME, data.reservationId);
    const reservationSnap = await getDoc(reservationRef);
    
    if (!reservationSnap.exists()) {
      throw new Error('Reserva no encontrada');
    }

    const reservation = reservationSnap.data() as Reservation;
    
    // Validar que no haya check-in previo
    if (reservation.checkInStatus === 'checked_in') {
      throw new Error('Esta reserva ya tiene check-in registrado');
    }

    await updateDoc(reservationRef, {
      actualCheckIn: data.actualDateTime,
      checkInStatus: 'checked_in',
      checkInNotes: data.notes || '',
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('Error performing check-in:', error);
    throw error;
  }
};

export const performCheckOut = async (data: CheckInOutData): Promise<void> => {
  try {
    const reservationRef = doc(db, COLLECTION_NAME, data.reservationId);
    const reservationSnap = await getDoc(reservationRef);
    
    if (!reservationSnap.exists()) {
      throw new Error('Reserva no encontrada');
    }

    const reservation = reservationSnap.data() as Reservation;
    
    // Validar que haya check-in previo
    if (reservation.checkInStatus !== 'checked_in') {
      throw new Error('No se puede hacer check-out sin check-in previo');
    }

    // Validar que no haya check-out previo
    if (reservation.checkOutStatus === 'checked_out') {
      throw new Error('Esta reserva ya tiene check-out registrado');
    }

    await updateDoc(reservationRef, {
      actualCheckOut: data.actualDateTime,
      checkOutStatus: 'checked_out',
      checkOutNotes: data.notes || '',
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('Error performing check-out:', error);
    throw error;
  }
};

export const getCurrentlyStaying = async (): Promise<Reservation[]> => {
  try {
    const reservationsRef = collection(db, COLLECTION_NAME);
    const q = query(
      reservationsRef,
      where('checkInStatus', '==', 'checked_in'),
      where('checkOutStatus', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    const reservations: Reservation[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Reservation;
      reservations.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any)?.toDate?.(),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any)?.toDate?.()
      });
    });
    
    return reservations.sort((a, b) => a.passengerName.localeCompare(b.passengerName));
  } catch (error) {
    console.error('Error getting currently staying guests:', error);
    return [];
  }
};

export const getPendingCheckIns = async (date?: string): Promise<Reservation[]> => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const reservationsRef = collection(db, COLLECTION_NAME);
    const q = query(
      reservationsRef,
      where('checkIn', '==', targetDate),
      where('checkInStatus', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    const reservations: Reservation[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Reservation;
      reservations.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any)?.toDate?.(),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any)?.toDate?.()
      });
    });
    
    return reservations.sort((a, b) => a.passengerName.localeCompare(b.passengerName));
  } catch (error) {
    console.error('Error getting pending check-ins:', error);
    return [];
  }
};

export const getPendingCheckOuts = async (date?: string): Promise<Reservation[]> => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const reservationsRef = collection(db, COLLECTION_NAME);
    const q = query(
      reservationsRef,
      where('checkOut', '==', targetDate),
      where('checkOutStatus', '==', 'pending'),
      where('checkInStatus', '==', 'checked_in')
    );
    
    const querySnapshot = await getDocs(q);
    const reservations: Reservation[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Reservation;
      reservations.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any)?.toDate?.(),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any)?.toDate?.()
      });
    });
    
    return reservations.sort((a, b) => a.passengerName.localeCompare(b.passengerName));
  } catch (error) {
    console.error('Error getting pending check-outs:', error);
    return [];
  }
};

export const getNoShows = async (): Promise<Reservation[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const reservationsRef = collection(db, COLLECTION_NAME);
    const q = query(
      reservationsRef,
      where('checkInStatus', '==', 'pending'),
      where('checkIn', '<', today)
    );
    
    const querySnapshot = await getDocs(q);
    const reservations: Reservation[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Reservation;
      reservations.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any)?.toDate?.(),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any)?.toDate?.()
      });
    });
    
    return reservations.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
  } catch (error) {
    console.error('Error getting no-shows:', error);
    return [];
  }
};
