import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Reservation, ReservationFormData } from '@/types/reservation';
import { addDays, getTomorrowDate } from './dateUtils';
import { notificationService } from './notificationService';

const COLLECTION_NAME = 'reservas';

export const calculatePrice = (data: ReservationFormData): number => {
  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (nights <= 0) return 0;
  
  const costPerNightAdults = data.season === 'Alta' ? 30000 : 25000;
  const costPerNightChildren = 15000;
  
  const costPerNight = (data.adults * costPerNightAdults) + (data.children * costPerNightChildren);
  
  return costPerNight * nights;
};

// Validar disponibilidad de cabaña - CORREGIDA para permitir check-in el día de check-out
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

      // LÓGICA CORREGIDA: Verificar solapamiento de fechas 
      // Una cabaña se libera el día de check-out, permitiendo check-in ese mismo día
      // 
      // Hay conflicto SOLO si:
      // - La nueva reserva empieza ANTES de que termine la existente (checkIn < resCheckOut) Y
      // - La nueva reserva termina DESPUÉS de que empiece la existente (checkOut > resCheckIn)
      //
      // Ejemplos:
      // Reserva existente: 2025-01-20 a 2025-01-25
      // Nueva reserva: 2025-01-25 a 2025-01-30 → NO HAY CONFLICTO (check-in el día de check-out)
      // Nueva reserva: 2025-01-24 a 2025-01-26 → SÍ HAY CONFLICTO (se solapa)
      const resCheckIn = reservation.checkIn;
      const resCheckOut = reservation.checkOut;

      return checkIn < resCheckOut && checkOut > resCheckIn;
    });

  return conflictingReservations.length === 0;
};

// Validar fechas de reserva
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

// Obtener próxima fecha disponible para una cabaña
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
  
  // Validar fechas antes de verificar disponibilidad
  const dateValidation = validateReservationDates(data.checkIn, data.checkOut);
  if (!dateValidation.isValid) {
    throw new Error(dateValidation.error);
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
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), reservation);
  
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
    // No fallar la creación de la reserva si hay error en notificaciones
  }
  
  return docRef.id;
};

export const updateReservation = async (id: string, data: ReservationFormData): Promise<void> => {
  console.log('Updating reservation:', id);
  
  // Validar fechas antes de verificar disponibilidad
  const dateValidation = validateReservationDates(data.checkIn, data.checkOut);
  if (!dateValidation.isValid) {
    throw new Error(dateValidation.error);
  }
  
  // Validar disponibilidad antes de actualizar (excluyendo la reserva actual)
  const isAvailable = await checkCabinAvailability(data.cabinType, data.checkIn, data.checkOut, id);
  
  if (!isAvailable) {
    const nextAvailable = await getNextAvailableDate(data.cabinType, data.checkIn);
    throw new Error(`La ${data.cabinType} no está disponible para las fechas seleccionadas (${new Date(data.checkIn).toLocaleDateString('es-ES')} - ${new Date(data.checkOut).toLocaleDateString('es-ES')}). Próxima fecha disponible: ${nextAvailable ? new Date(nextAvailable).toLocaleDateString('es-ES') : 'No disponible'}`);
  }

  const totalPrice = calculatePrice(data);
  const reservation: Partial<Reservation> = {
    ...data,
    totalPrice,
    updatedAt: new Date()
  };
  
  await updateDoc(doc(db, COLLECTION_NAME, id), reservation);
  
  // Regenerar notificaciones para la reserva actualizada
  try {
    const fullReservation: Reservation = {
      ...reservation,
      id,
      createdAt: new Date(), // Este valor se sobreescribirá con el real
      updatedAt: new Date()
    } as Reservation;
    
    console.log('Regenerating notifications for updated reservation:', id);
    await notificationService.generateReservationNotifications(fullReservation);
  } catch (error) {
    console.error('Error regenerating notifications for reservation:', error);
    // No fallar la actualización de la reserva si hay error en notificaciones
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

// Eliminar reservas vencidas (checkout + 1 día)
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
